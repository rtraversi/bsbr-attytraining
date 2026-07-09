'use client'

import { useState, type ReactNode } from 'react'

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

  return (
    <div className="font-headline fixed inset-0 z-[70] overflow-y-auto bg-[#F5F7FA] dark:bg-[#0A0A0A]">
      <main className="mx-auto max-w-4xl px-5 pt-8 pb-40 md:px-6 md:pt-10">
        {/* Header + progress — shown while answering */}
        {answering && (
          <div className="mb-8 flex flex-col gap-4">
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
                <span className="text-sm font-bold whitespace-nowrap text-[#0094FF]">
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
                className="h-full rounded-full bg-[#32C7FF] transition-[width] duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Question phase */}
        {phase === 'quiz' && currentQ && (
          <>
            {showReadinessBanner && (
              <div className="mb-6 rounded-2xl border border-[#32C7FF]/30 bg-[#32C7FF]/[0.08] px-4 py-3 text-sm font-medium text-[#0094FF] dark:text-[#5FC8FF]">
                This is the readiness check — you need {readinessThreshold}% to clear it.
              </div>
            )}

            <div className="mb-8 rounded-3xl border border-[#E5EEF5] bg-white p-6 shadow-[0_4px_20px_rgba(0,148,255,0.08)] md:p-8 dark:border-[#1F2429] dark:bg-[#0D0F12]">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF8FF] text-[#0094FF] dark:bg-[#0E2430] dark:text-[#5FC8FF]">
                  <QuestionIcon />
                </div>
                <div>
                  <h2 className="mb-2 text-lg font-bold leading-snug text-[#0A0A0A] md:text-xl dark:text-[#F5F7FA]">
                    {currentQ.question_text}
                  </h2>
                  <p className="text-sm text-[#6D7980] dark:text-[#7A8189]">
                    Select the most appropriate answer from the options below.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
              {currentQ.answers.map((answer, i) => {
                const isSelected = selected === i
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.98] md:p-6 ${
                      isSelected
                        ? 'border-[#32C7FF] bg-[#32C7FF]/[0.08] shadow-[0_0_0_4px_rgba(50,199,255,0.15)]'
                        : 'border-[#E5EEF5] bg-white hover:border-[#32C7FF] hover:bg-[#32C7FF]/[0.05] dark:border-[#1F2429] dark:bg-[#0D0F12] dark:hover:border-[#32C7FF]'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold transition-all ${
                        isSelected
                          ? 'border-[#32C7FF] bg-[#32C7FF] text-white'
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
          <div className="rounded-3xl border border-[#E5EEF5] bg-white p-6 shadow-[0_4px_20px_rgba(0,148,255,0.08)] md:p-8 dark:border-[#1F2429] dark:bg-[#0D0F12]">
            <h2 className="mb-1 text-lg font-bold text-[#0A0A0A] md:text-xl dark:text-[#F5F7FA]">
              Almost done
            </h2>
            <p className="mb-6 text-sm text-[#6D7980] dark:text-[#7A8189]">
              You have answered all {questions.length} questions. Confirm below to submit for scoring.
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E5EEF5] bg-[#F5F7FA] p-5 transition-colors hover:border-[#32C7FF] dark:border-[#1F2429] dark:bg-[#0D0F12] dark:hover:border-[#32C7FF]">
              <input
                type="checkbox"
                checked={attested}
                onChange={e => setAttested(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#32C7FF]"
              />
              <span className="text-sm leading-relaxed text-[#0A0A0A] dark:text-[#F5F7FA]">
                {attestationLabel}
              </span>
            </label>
            {error && <p className="mt-5 text-sm font-medium text-red-500">{error}</p>}
          </div>
        )}

        {/* Submitting phase */}
        {phase === 'submitting' && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
            <Spinner />
            <p className="text-sm text-[#6D7980] dark:text-[#7A8189]">Submitting your answers…</p>
          </div>
        )}

        {/* Result phase — caller owns the copy */}
        {phase === 'result' && result && (
          <div className="pt-6">{renderResult({ result, retry, exit })}</div>
        )}
      </main>

      {/* Sticky bottom bar — Previous / Next|Submit while answering */}
      {answering && (
        <div className="fixed bottom-0 left-0 z-[70] w-full border-t border-[#E5EEF5] bg-white px-5 py-4 md:px-6 dark:border-[#1F2429] dark:bg-[#0D0F12]">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
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
              className="flex items-center gap-2 rounded-xl bg-[#32C7FF] px-7 py-3.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(50,199,255,0.4)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {primaryLabel}
              {phase === 'quiz' && !isLast && <ArrowRightIcon />}
            </button>
          </div>
        </div>
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

function QuestionIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
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
    <svg className="h-8 w-8 animate-spin text-[#32C7FF]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
