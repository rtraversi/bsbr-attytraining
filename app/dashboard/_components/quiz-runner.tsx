'use client'

import { useEffect, useState, type ReactNode } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   QuizRunner — the shared question-taking surface used by BOTH the per-lesson
   knowledge check (app/dashboard/overview/_components/knowledge-check-modal.tsx)
   and the final certification assessment (app/dashboard/training/_components/
   quiz-component.tsx).

   It owns the full-screen takeover chrome, one-question-at-a-time flow, the
   (conditional) back-navigation, the optional attestation step, submission +
   inline error handling, and the submitting state. Each caller supplies:
     • how to score/record via `onSubmit` (throw an Error to surface inline)
     • what the pass/fail result screen says via `renderResult`
   Scoring/gating/recording live entirely server-side — this is presentation
   plus the one deliberate behaviour: real back-navigation when allowBack.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface QuizRunnerQuestion {
  id: string
  question_text: string
  answers: string[]
}

export interface QuizAnswer {
  questionId: string
  selectedIndex: number
}

export interface QuizResult {
  score: number
  passed: boolean
  passThreshold: number
}

interface QuizRunnerProps {
  /** Big header title, e.g. "Knowledge Check" / "Final Assessment". */
  title: string
  /** Muted subtitle under the title, e.g. "Lesson 2 — Protecting …". */
  subtitle?: string | null
  questions: QuizRunnerQuestion[]
  /** Whether the learner can return to previous questions and edit answers. */
  allowBack: boolean
  /** Require the identity-attestation step between the last question and submit. */
  requiresAttestation?: boolean
  /** Attestation copy (shown next to the checkbox). */
  attestationLabel?: string
  /** Show the readiness-check banner above the question card (lesson 5 only). */
  showReadinessBanner?: boolean
  readinessThreshold?: number
  /** Timer slot copy. Defaults to "No time limit"; reserved for a future countdown. */
  timerLabel?: string | null
  /** Score + record. Resolve with the result, or throw an Error to show inline. */
  onSubmit: (answers: QuizAnswer[]) => Promise<QuizResult>
  /** Optional close/exit affordance (renders a close button while answering). */
  onExit?: () => void
  /** Fired once when a result is received (e.g. to flip parent phase on pass). */
  onResult?: (result: QuizResult) => void
  /** Render the pass/fail screen. `exit` closes; `retry` resets to a fresh attempt. */
  renderResult: (ctx: { result: QuizResult; retry: () => void; exit: () => void }) => ReactNode
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

type Phase = 'quiz' | 'attestation' | 'submitting' | 'result'

export function QuizRunner({
  title,
  subtitle,
  questions,
  allowBack,
  requiresAttestation = false,
  attestationLabel = 'I confirm that I personally completed this training and that the answers above are my own.',
  showReadinessBanner = false,
  readinessThreshold = 80,
  timerLabel = 'No time limit',
  onSubmit,
  onExit,
  onResult,
  renderResult,
}: QuizRunnerProps) {
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [locked, setLocked] = useState<Record<string, number>>({})
  const [attested, setAttested] = useState(false)
  const [phase, setPhase] = useState<Phase>('quiz')
  const [result, setResult] = useState<QuizResult | null>(null)
  const [error, setError] = useState('')

  // Hide the employee bottom tab bar for as long as a quiz is open.
  //
  // This surface is fixed z-[70], but it renders inside the dashboard shell's
  // z-10 content wrapper, so it can never paint over the z-40 tab bar — a
  // sibling of that wrapper. The bar sat on top of the sticky footer and buried
  // the Next/Submit button, making a check impossible to complete. A bigger
  // z-index cannot fix that; the wrapper's stacking context caps everything
  // inside it. Training focus mode hit this exact wall and solved it by
  // flagging <html> and hiding the bar in CSS (see app/globals.css) — same
  // pattern here, with its own class so the two stay independent.
  //
  // It also stops a mis-click on Overview/Content from navigating away
  // mid-attempt and discarding the answers.
  //
  // Cleanup on unmount, not on a phase change: the bar must come back however
  // the quiz ends — submitted, exited, or the parent unmounting it outright —
  // so no path can strand the class on <html>.
  useEffect(() => {
    document.documentElement.classList.add('quiz-active')
    return () => document.documentElement.classList.remove('quiz-active')
  }, [])

  const currentQ = questions[qIndex]
  const isLast = qIndex === questions.length - 1

  function goNext() {
    if (selected === null) return
    const nextLocked = { ...locked, [currentQ.id]: selected }
    setLocked(nextLocked)
    if (isLast) {
      if (requiresAttestation) setPhase('attestation')
      else void doSubmit(nextLocked)
    } else {
      const ni = qIndex + 1
      setQIndex(ni)
      setSelected(nextLocked[questions[ni].id] ?? null)
    }
  }

  function goPrev() {
    if (!allowBack || qIndex === 0) return
    // Persist the current (possibly changed) selection before stepping back so
    // a revisited answer isn't lost, then restore the target question's answer.
    const updated = selected !== null ? { ...locked, [currentQ.id]: selected } : locked
    if (selected !== null) setLocked(updated)
    const pi = qIndex - 1
    setQIndex(pi)
    setSelected(updated[questions[pi].id] ?? null)
  }

  async function doSubmit(finalLocked: Record<string, number>) {
    setPhase('submitting')
    setError('')
    const answers: QuizAnswer[] = Object.entries(finalLocked).map(([questionId, selectedIndex]) => ({
      questionId,
      selectedIndex,
    }))
    try {
      const r = await onSubmit(answers)
      setResult(r)
      setPhase('result')
      onResult?.(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed. Please try again.')
      setPhase(requiresAttestation ? 'attestation' : 'quiz')
    }
  }

  function retry() {
    setQIndex(0)
    setSelected(null)
    setLocked({})
    setAttested(false)
    setResult(null)
    setError('')
    setPhase('quiz')
  }

  function exit() {
    onExit?.()
  }

  function onPrimary() {
    if (phase === 'quiz') goNext()
    else if (phase === 'attestation') void doSubmit(locked)
  }

  const answering = phase === 'quiz' || phase === 'attestation'
  const progressPct = phase === 'attestation' ? 100 : ((qIndex + 1) / questions.length) * 100
  const primaryDisabled =
    phase === 'quiz' ? selected === null : phase === 'attestation' ? !attested : true
  const primaryLabel =
    phase === 'attestation'
      ? 'Submit Quiz'
      : isLast
        ? requiresAttestation
          ? 'Review & Submit'
          : 'Submit'
        : 'Next Question'

  /* Layout: a three-band column that owns the whole viewport — header / scrolling
     body / action bar. Previously the whole surface was one scroll container with
     a `fixed bottom-0` action bar and `pb-40` of clearance under the content,
     which left the quiz sitting as a small block at the top of a mostly-empty
     screen. As flex bands the body takes exactly the leftover height, so the
     action bar is always on screen without reserving dead space for it, and the
     content can centre itself in whatever room remains.

     `justify-center-safe` rather than `justify-center`: plain centring inside a
     scroll container makes overflow past the TOP unreachable, so a long question
     would have its opening lines cut off with no way to scroll up to them. The
     `safe` keyword (justify-content: safe center) falls back to start-alignment
     exactly when the content would overflow. Browsers that don't parse it drop
     the whole declaration and get start-alignment — the safe way to fail. */
  return (
    <div className="font-headline fixed inset-0 z-[70] flex flex-col bg-[#F5F7FA] dark:bg-[#0A0A0A]">
      {/* Header band — title, progress, exit. Never scrolls away. */}
      {/* The three bands below (header / body / footer) share one width ladder
          on purpose. Each has its own centred inner wrapper, so the ladder has
          to be repeated rather than hoisted — the bands themselves are
          full-bleed, since their borders and backgrounds must run edge to edge.
          If you change one, change all three or the progress bar, the question
          card and the action bar stop lining up with each other. */}
      {answering && (
        <header className="shrink-0 border-b border-[#E5EEF5] bg-white px-5 pt-6 pb-5 md:px-8 dark:border-[#1F2429] dark:bg-[#0D0F12]">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 lg:max-w-5xl xl:max-w-6xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-[#0A0A0A] md:text-3xl dark:text-[#F5F7FA]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-[#6D7980] dark:text-[#7A8189]">{subtitle}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <TimerPill label={timerLabel ?? 'No time limit'} />
                <span className="text-sm font-bold whitespace-nowrap text-[var(--brand-emphasis)]">
                  Question {Math.min(qIndex + 1, questions.length)}/{questions.length}
                </span>
                {onExit && (
                  <button
                    onClick={exit}
                    aria-label="Close"
                    className="ml-0.5 shrink-0 rounded-lg p-1 text-[#8A8A8A] transition-colors hover:bg-[#E5EEF5] hover:text-[#0A0A0A] dark:hover:bg-[#1F2429] dark:hover:text-[#F5F7FA]"
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#E5EEF5] dark:bg-[#1F2429]">
              <div
                className="h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </header>
      )}

      {/* Body band — takes all remaining height and scrolls only if it must.
          Padding lives on the inner wrapper, not here: min-h-full is measured
          against this element's height, so padding out here would push the
          wrapper past it and manufacture a scrollbar on a page that fits. */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center-safe px-5 py-8 md:px-8 md:py-10 lg:max-w-5xl xl:max-w-6xl">
          {/* Question phase */}
          {phase === 'quiz' && currentQ && (
            <>
              {showReadinessBanner && (
                <div className="mb-6 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/[0.08] px-4 py-3 text-sm font-medium text-[var(--brand-emphasis)] dark:text-[#5FC8FF]">
                  This is the readiness check — you need {readinessThreshold}% to clear it.
                </div>
              )}

              {/* The question is the hero — it outranks the answer text by a full
                  step at every breakpoint (3xl vs lg at md), where the two used
                  to sit one notch apart and read as the same level. */}
              {/* No icon tile. A "?" chip labelled something already
                  unmistakably a question and cost the text ~60px of width on
                  every breakpoint. With it gone the flex row had a single child,
                  so the wrapper went too rather than leaving a one-item flex —
                  the heading now runs the full width of the card. */}
              <div className="mb-8 rounded-3xl border border-[#E5EEF5] bg-white p-6 shadow-[0_4px_20px_rgba(0,148,255,0.08)] md:mb-10 md:p-9 dark:border-[#1F2429] dark:bg-[#0D0F12]">
                <h2 className="text-2xl leading-snug font-bold text-[#0A0A0A] md:text-3xl lg:text-4xl dark:text-[#F5F7FA]">
                  {currentQ.question_text}
                </h2>
                <p className="mt-3 text-sm text-[#6D7980] md:text-base dark:text-[#7A8189]">
                  Select the most appropriate answer from the options below.
                </p>
              </div>

              {/* One answer per row rather than the old 2-up grid: answers are
                  full sentences, and a single column gives each one the full
                  measure plus an unambiguous top-to-bottom reading order. */}
              <div className="flex flex-col gap-4 md:gap-5">
                {currentQ.answers.map((answer, i) => {
                  const isSelected = selected === i
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      className={`flex items-center gap-4 rounded-2xl border-2 p-6 text-left transition-all active:scale-[0.99] md:gap-5 md:p-7 ${
                        isSelected
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/[0.08] shadow-[0_0_0_4px_rgba(50,199,255,0.15)]'
                          : 'border-[#E5EEF5] bg-white hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/[0.05] dark:border-[#1F2429] dark:bg-[#0D0F12] dark:hover:border-[var(--brand-primary)]'
                      }`}
                    >
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-bold transition-all md:h-12 md:w-12 md:text-lg ${
                          isSelected
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                            : 'border-[#BCC8D0] text-[#6D7980] dark:border-[#3A4249] dark:text-[#7A8189]'
                        }`}
                      >
                        {LETTERS[i] ?? i + 1}
                      </span>
                      <span className="text-base font-semibold text-[#0A0A0A] md:text-lg dark:text-[#F5F7FA]">
                        {answer}
                      </span>
                    </button>
                  )
                })}
              </div>

              {error && <p className="mt-6 text-sm font-medium text-red-500">{error}</p>}
            </>
          )}

          {/* Attestation phase */}
          {phase === 'attestation' && (
            <div className="w-full rounded-3xl border border-[#E5EEF5] bg-white p-6 shadow-[0_4px_20px_rgba(0,148,255,0.08)] md:p-9 dark:border-[#1F2429] dark:bg-[#0D0F12]">
              <h2 className="mb-1 text-xl font-bold text-[#0A0A0A] md:text-2xl dark:text-[#F5F7FA]">
                Almost done
              </h2>
              <p className="mb-6 text-sm text-[#6D7980] md:text-base dark:text-[#7A8189]">
                You have answered all {questions.length} questions. Confirm below to submit for
                scoring.
              </p>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E5EEF5] bg-[#F5F7FA] p-5 transition-colors hover:border-[var(--brand-primary)] md:p-6 dark:border-[#1F2429] dark:bg-[#0D0F12] dark:hover:border-[var(--brand-primary)]">
                <input
                  type="checkbox"
                  checked={attested}
                  onChange={e => setAttested(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-primary)]"
                />
                <span className="text-sm leading-relaxed text-[#0A0A0A] md:text-base dark:text-[#F5F7FA]">
                  {attestationLabel}
                </span>
              </label>
              {error && <p className="mt-5 text-sm font-medium text-red-500">{error}</p>}
            </div>
          )}

          {/* Submitting phase */}
          {phase === 'submitting' && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <Spinner />
              <p className="text-sm text-[#6D7980] dark:text-[#7A8189]">Submitting your answers…</p>
            </div>
          )}

          {/* Result phase — caller owns the copy */}
          {phase === 'result' && result && (
            <div className="w-full">{renderResult({ result, retry, exit })}</div>
          )}
        </div>
      </main>

      {/* Action band — Previous / Next|Submit. A flex sibling rather than a
          `fixed` overlay, so it can never cover the content it sits under. */}
      {answering && (
        <footer className="shrink-0 border-t border-[#E5EEF5] bg-white px-5 py-4 md:px-8 dark:border-[#1F2429] dark:bg-[#0D0F12]">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 lg:max-w-5xl xl:max-w-6xl">
            {allowBack && phase === 'quiz' && qIndex > 0 ? (
              <button
                onClick={goPrev}
                className="flex items-center gap-2 text-sm font-semibold text-[#6D7980] transition-colors hover:text-[#0A0A0A] dark:text-[#7A8189] dark:hover:text-[#F5F7FA]"
              >
                <ArrowLeftIcon />
                Previous Question
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={onPrimary}
              disabled={primaryDisabled}
              className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-7 py-3.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(50,199,255,0.4)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {primaryLabel}
              {phase === 'quiz' && !isLast && <ArrowRightIcon />}
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}

/* ── Small presentational bits ─────────────────────────────────────────────── */

function TimerPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5EEF5] bg-[#F5F7FA] px-2.5 py-1.5 text-xs font-bold text-[#6D7980] dark:border-[#1F2429] dark:bg-[#131A20] dark:text-[#7A8189]">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {label}
    </span>
  )
}

function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
