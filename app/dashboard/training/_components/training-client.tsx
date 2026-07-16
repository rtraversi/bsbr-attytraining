'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ClientQuestion } from '@/lib/training/questions'
import { LESSONS } from '@/lib/training/lessons'
import { QuizComponent, type QuizQuestion } from './quiz-component'
import { ScormContent } from './scorm-content'
import { KnowledgeCheckModal } from '@/app/dashboard/overview/_components/knowledge-check-modal'
import { CertPreviewModal } from '@/app/dashboard/_components/cert-preview-modal'

type TrainingPhase =
  | 'not_started'
  | 'cert_pending'
  | 'certified'

interface Props {
  phase: TrainingPhase
  courseTitle: string
  courseId: string | null
  questions: QuizQuestion[]
  /** Per-lesson knowledge-check questions, for the soft-nag quiz (same modal as Quizzes/Overview). */
  questionsByLesson: Record<number, ClientQuestion[]>
  /** Lesson checks 1–5 cleared (derived server-side from knowledge_check_completed events). */
  checksCleared: boolean
  /** SCORM course reported completion (verified — a video_completed event exists). */
  contentViewed: boolean
  /** Highest lesson boundary reached (1–5), from the latest lesson_location_changed event. */
  currentLessonNumber?: number | null
  /** SCORM lesson_location to resume into — plumbed straight to ScormContent. */
  initialLocation?: string
  /** SCORM suspend_data (Rise's own resume string) — plumbed straight to ScormContent. */
  initialSuspendData?: string
  /**
   * Accumulated training seconds (enrollments.total_training_seconds). Plumbed in
   * now for the time-spent stat, but not yet rendered — the display is a separate
   * design pass (intentionally not destructured below, so it isn't a dead binding).
   */
  totalTrainingSeconds?: number
  certId?: string
  certNumber?: string
  issuedAt?: string
  expiresAt?: string
  certUrl?: string
  employeeName?: string
}

/* ── Tokens ────────────────────────────────────────────────────────────────── */
// `font-headline` is set explicitly on every heading: the shell sets it, but
// Tailwind's preflight writes font-family onto heading elements and beats the
// inherited value. (Bitten twice on this project.)
const CARD =
  'rounded-[20px] border border-[#E5EEF5] bg-white shadow-[0_4px_20px_rgba(0,148,255,0.08)] dark:border-[#1F2429] dark:bg-[#0D0F12] dark:shadow-none'
const HEADING = 'font-headline font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F7FA]'
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'

export function TrainingClient({
  phase: initialPhase,
  courseId,
  questions,
  questionsByLesson,
  checksCleared,
  contentViewed,
  currentLessonNumber,
  initialLocation,
  initialSuspendData,
  certId,
  certNumber,
  issuedAt,
  expiresAt,
  employeeName,
}: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState(initialPhase)
  const [attemptKey, setAttemptKey] = useState(0)
  const [certModalOpen, setCertModalOpen] = useState(false)
  // Set only when the employee explicitly exits the assessment overlay. The gate
  // itself is never re-locked — this just lets them get back to the course content.
  const [quizDismissed, setQuizDismissed] = useState(false)

  // Focus mode is pure presentation — no backend dependency.
  const [focus, setFocus] = useState(false)
  const [chromeIdle, setChromeIdle] = useState(false)
  const [nextUpOpen, setNextUpOpen] = useState(false)

  // Per-lesson soft nag: fires once when a content lesson boundary is crossed live.
  const [nagLesson, setNagLesson] = useState<number | null>(null)
  const [nagQuizOpen, setNagQuizOpen] = useState(false)

  // Live lesson number — updated the instant Rise crosses a boundary (via
  // ScormContent's onLessonChange), so the progress bar + Lesson Overview + nag
  // don't wait for a full-page refresh. Seeded from the server prop at mount.
  const [liveLessonNumber, setLiveLessonNumber] = useState<number | null>(currentLessonNumber ?? null)

  // Sync phase when server re-renders with new data (e.g. cert_pending → certified)
  useEffect(() => { setPhase(initialPhase) }, [initialPhase])

  // Auto-poll while cert is generating — stop after 60s
  useEffect(() => {
    if (phase !== 'cert_pending') return
    const interval = setInterval(() => router.refresh(), 4000)
    const timeout = setTimeout(() => clearInterval(interval), 60_000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [phase, router])

  // Focus mode: lock page scroll, auto-hide the top bar after 3s idle, Escape exits.
  // Escape is the reliable way out — idle-hiding the bar must never trap anyone.
  useEffect(() => {
    if (!focus) {
      setChromeIdle(false)
      return
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    let idleTimer: ReturnType<typeof setTimeout>
    const arm = () => {
      setChromeIdle(false)
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => setChromeIdle(true), 3000)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocus(false)
    }
    arm()
    window.addEventListener('mousemove', arm)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      clearTimeout(idleTimer)
      window.removeEventListener('mousemove', arm)
      window.removeEventListener('keydown', onKey)
    }
  }, [focus])

  // Boundary detection flows through ScormContent's onLessonChange (a live,
  // client-side signal), not a server-prop-watching effect. The ref seeds to the
  // mount value, so a cold load never fires a false nag — there's no prior
  // in-session value to exceed. A forward crossing nags for the lesson just
  // finished (`prev`), which can only be 1–4 (n ≤ 5 ⇒ prev ≤ 4); lesson 5's
  // completion is handled by the full-course overlay.
  const prevLessonRef = useRef<number | null>(currentLessonNumber ?? null)
  const handleLessonChange = (n: number) => {
    const prev = prevLessonRef.current
    prevLessonRef.current = n
    setLiveLessonNumber(n)
    if (prev !== null && n > prev) setNagLesson(prev) // the lesson just finished
  }

  // Rise's SCORM completion signal ("passed-incomplete" reporting) requires an
  // internal graded interaction to ever fire — but this course's own knowledge
  // checks are deliberately ungraded, so `contentViewed` can never go true
  // through normal use. The custom quiz layer (checksCleared, now spanning all
  // 5 lessons via the Final Review) is the actual certifiable signal per the
  // project's own architecture — Rise is the learning layer only and was never
  // meant to gate the real assessment.
  const gatesOpen = checksCleared
  const showQuiz = phase === 'not_started' && gatesOpen && !!courseId && !quizDismissed

  // Honest progress: content is the first half (0–50%), lesson checks the second
  // (50%). Before the SCORM course reports full completion, credit partial content
  // progress from how far through the 5 lessons the learner has actually reached
  // (lesson N reached ⇒ N-1 done). Passing the assessment supersedes everything.
  const lessonsCompletedCount = liveLessonNumber ? liveLessonNumber - 1 : 0
  const contentPct = contentViewed ? 50 : Math.round((lessonsCompletedCount / 5) * 50)
  const checksPct = checksCleared ? 50 : 0
  const progressPct = phase === 'not_started' ? contentPct + checksPct : 100

  // Content is done but the assessment isn't on screen — surface the next step
  // over the player rather than burying it below the fold.
  const showCompletionOverlay = phase === 'not_started' && contentViewed && !showQuiz

  const openAssessment = () => setQuizDismissed(false)

  // Lesson Overview + Key Takeaways follow the lesson the learner is currently on.
  // Uses liveLessonNumber (same root cause as the progress bar) so it tracks
  // boundary crossings immediately; defaults to lesson 1 before any are recorded.
  const overviewLesson = LESSONS.find(l => l.number === (liveLessonNumber ?? 1)) ?? LESSONS[0]

  return (
    <>
      {showQuiz && courseId && (
        /* Both gates cleared → full-screen certification quiz, no click required */
        <QuizComponent
          key={attemptKey}
          questions={questions}
          courseId={courseId}
          onPass={() => setPhase('cert_pending')}
          onRetry={() => { setAttemptKey(k => k + 1); router.refresh() }}
          onExit={() => setQuizDismissed(true)}
        />
      )}

      {certModalOpen && certId && (
        <CertPreviewModal
          certId={certId}
          certNumber={certNumber ?? null}
          employeeName={employeeName ?? ''}
          issuedAt={issuedAt ?? null}
          expiresAt={expiresAt ?? null}
          onClose={() => setCertModalOpen(false)}
        />
      )}

      {/* Soft-nag quiz — the exact same KnowledgeCheckModal used on Quizzes/Overview.
          Closing it (pass, fail, or backing out) dismisses the nag for good. */}
      {nagQuizOpen && nagLesson !== null && (
        <KnowledgeCheckModal
          lesson={nagLesson}
          title={LESSONS.find(l => l.number === nagLesson)?.title ?? ''}
          questions={questionsByLesson[nagLesson] ?? []}
          isReadiness={false}
          onClose={() => {
            setNagQuizOpen(false)
            setNagLesson(null)
            router.refresh()
          }}
        />
      )}

      <main
        className={
          focus
            ? ''
            : 'mx-auto w-full max-w-[1600px] px-6 py-6 md:px-10 md:py-10 xl:px-14 xl:py-14'
        }
      >
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        {/* In focus mode the iframe covers the viewport, and mouse/key events over
            an iframe never reach this document — so a fully hidden bar would be
            unrecoverable, and Escape dies the moment the learner clicks into the
            Rise content. The exit button therefore never hides; only the title and
            progress pill fade on idle. */}
        <div
          onMouseEnter={() => setChromeIdle(false)}
          className={
            focus
              ? // Rise's own content is light, so white chrome would vanish against it —
                // the scrim keeps the bar legible over whatever slide is on screen.
                'fixed inset-x-0 top-0 z-[60] flex items-center justify-between bg-gradient-to-b from-black/60 via-black/25 to-transparent px-6 pb-12 pt-5 md:px-10'
              : 'mb-6 flex items-center justify-between gap-4'
          }
        >
          <div className="flex items-center gap-3">
            <h1
              className={`${HEADING} text-2xl transition-opacity duration-500 md:text-3xl xl:text-[2.5rem] ${
                focus ? 'text-white dark:text-white' : ''
              } ${focus && chromeIdle ? 'opacity-0' : 'opacity-100'}`}
            >
              Your Training
            </h1>
            <button
              type="button"
              onClick={() => setFocus(f => !f)}
              aria-pressed={focus}
              title={focus ? 'Exit focus mode (Esc)' : 'Enter focus mode'}
              aria-label={focus ? 'Exit focus mode' : 'Enter focus mode'}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                focus
                  ? `bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 ${chromeIdle ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`
                  : 'bg-[#F2F4F7] text-[#0A0A0A] hover:bg-[#E5EEF5] dark:bg-[#131A20] dark:text-[#F5F7FA] dark:hover:bg-[#1F2429]'
              }`}
            >
              <FocusIcon />
            </button>
          </div>

          <div
            className={`flex shrink-0 items-center gap-3 rounded-full px-4 py-2 transition-opacity duration-500 ${
              focus ? 'bg-black/50 backdrop-blur-sm' : CARD
            } ${focus && chromeIdle ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          >
            <div
              className={`h-1.5 w-20 overflow-hidden rounded-full sm:w-32 ${
                focus ? 'bg-white/15' : 'bg-[#E5EEF5] dark:bg-[#1F2429]'
              }`}
            >
              <div
                className="h-full rounded-l-full transition-[width] duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #32C7FF 0%, #0094FF 100%)',
                }}
              />
            </div>
            <span
              className={`whitespace-nowrap text-sm font-bold ${
                focus ? 'text-[#5FC8FF]' : 'text-[#0094FF]'
              }`}
            >
              {progressPct}% Complete
            </span>
          </div>
        </div>

        {/* ── Player ──────────────────────────────────────────────────────── */}
        {/* z-50 clears the bottom tab bar (z-40); the top bar sits at z-60 above
            this, and the assessment overlay at z-70 above everything. */}
        <div
          className={
            focus
              ? 'fixed inset-0 z-50 flex items-center justify-center bg-[#0A0E12]'
              : `relative overflow-hidden ${CARD}`
          }
        >
          <ScormContent
            onCompleted={() => router.refresh()}
            onExit={() => setFocus(false)}
            onLessonChange={handleLessonChange}
            initialLocation={initialLocation}
            initialSuspendData={initialSuspendData}
            className={focus ? 'h-full w-full' : ''}
            frameClassName={
              focus
                ? 'relative h-full w-full'
                : 'relative h-[65vh] max-h-[720px] min-h-[420px] w-full overflow-hidden rounded-[20px] bg-[#0A0E12]'
            }
          />

          {showCompletionOverlay && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(8,12,16,0.78)] px-6 backdrop-blur-md">
              <div className="mx-auto max-w-2xl text-center">
                <p className={`font-headline text-xl font-bold leading-snug text-white md:text-3xl`}>
                  {gatesOpen
                    ? 'You have finished the course content and your lesson checks.'
                    : 'You have finished the course content.'}
                </p>
                <p className="mt-3 text-sm text-white/60">
                  {gatesOpen
                    ? 'The Certificate Assessment is unlocked.'
                    : 'Clear your lesson checks to unlock the Certificate Assessment.'}
                </p>

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  {gatesOpen && courseId && (
                    <button
                      onClick={openAssessment}
                      className="rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition-colors hover:bg-gray-200"
                    >
                      Take the Certificate Assessment →
                    </button>
                  )}
                  {gatesOpen && !courseId && (
                    <p className="text-sm text-white/60">Course not yet initialized.</p>
                  )}
                  {!checksCleared && (
                    <Link
                      href="/dashboard/quizzes"
                      className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                    >
                      Go to Lesson Checks →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Per-lesson soft nag — same z-20/backdrop treatment as the completion
              overlay, so it layers over the iframe in normal AND focus mode. Soft:
              "Done" always dismisses, never a hard block. Hidden while its quiz is open. */}
          {nagLesson !== null && !nagQuizOpen && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(8,12,16,0.78)] px-6 backdrop-blur-md">
              <div className="mx-auto max-w-2xl text-center">
                <p className="font-headline text-xl font-bold leading-snug text-white md:text-3xl">
                  You’ve finished Lesson {nagLesson}.
                </p>
                <p className="mt-3 text-sm text-white/60">
                  Read the Lesson Overview above, then take the Lesson {nagLesson} quiz whenever
                  you’re ready.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    onClick={() => setNagQuizOpen(true)}
                    className="rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition-colors hover:bg-gray-200"
                  >
                    Take the Lesson {nagLesson} Quiz →
                  </button>
                  <button
                    onClick={() => setNagLesson(null)}
                    className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Below the fold — hidden in focus mode ───────────────────────── */}
        {!focus && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className={phase === 'not_started' ? 'md:col-span-2' : 'md:col-span-3'}>
              <h2 className={`${HEADING} mb-3 text-2xl md:text-3xl xl:text-[2.5rem]`}>Lesson Overview</h2>
              <div className={`${CARD} p-6`}>
                <p className="text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
                  Lesson {overviewLesson.number}: {overviewLesson.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#3D3D3D] dark:text-[#C4C9CE]">
                  {overviewLesson.summary}
                </p>

                {overviewLesson.keyTakeaways.length > 0 && (
                  <div className="mt-5 border-t border-[#E5EEF5] pt-5 dark:border-[#1F2429]">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[#0094FF]">
                      Key Takeaways
                    </h3>
                    <ul className="space-y-2">
                      {overviewLesson.keyTakeaways.map(t => (
                        <li key={t} className="flex gap-2 text-sm text-[#3D3D3D] dark:text-[#C4C9CE]">
                          <CircleIcon />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* ── Next Up — only while the assessment is still ahead of them ── */}
            <div
              className={phase === 'not_started' ? '' : 'hidden'}
              onMouseEnter={() => setNextUpOpen(true)}
              onMouseLeave={() => setNextUpOpen(false)}
            >
              <h2 className={`${HEADING} mb-3 text-2xl md:text-3xl xl:text-[2.5rem]`}>Next Up</h2>
              <div
                className={`${CARD} cursor-pointer p-5`}
                onClick={() => setNextUpOpen(o => !o)}
              >
                <p className="mb-3 text-sm font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">
                  Certificate Assessment
                </p>

                {gatesOpen && courseId ? (
                  <button
                    onClick={openAssessment}
                    className="block w-full rounded-full bg-[#0094FF] py-2.5 text-center text-xs font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Take Assessment
                  </button>
                ) : (
                  <span className="block w-full cursor-not-allowed rounded-full bg-[#F2F4F7] py-2.5 text-center text-xs font-bold text-[#9AA1A9] dark:bg-[#131A20] dark:text-[#4E555C]">
                    Locked
                  </span>
                )}

                {/* Hover/tap-expand: what still stands between here and the assessment. */}
                <div
                  className={`overflow-hidden transition-[max-height,opacity,margin-top,padding-top] duration-300 motion-reduce:transition-none ${
                    nextUpOpen
                      ? 'mt-4 max-h-64 border-t border-[#E5EEF5] pt-4 opacity-100 dark:border-[#1F2429]'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  <Requirement done={contentViewed} label="Training content" />
                  <Requirement done={checksCleared} label="Lesson checks" />
                  {!checksCleared && (
                    <Link
                      href="/dashboard/quizzes"
                      className="mt-3 inline-block text-xs font-semibold text-[#0094FF] hover:underline"
                    >
                      Go to Quizzes tab →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Certificate states ──────────────────────────────────────────── */}
        {!focus && phase === 'cert_pending' && (
          <div className={`${CARD} mt-6 flex items-start gap-4 p-6`}>
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF8FF] dark:bg-[#0094FF]/15">
              <ClockIcon />
            </div>
            <div>
              <p className={`${HEADING} mb-1 text-sm`}>Training complete — certificate generating</p>
              <p className={`text-sm ${MUTED}`}>
                Your compliance certificate is being generated. This usually takes less than a minute.
              </p>
            </div>
          </div>
        )}

        {!focus && phase === 'certified' && (
          <div className={`${CARD} mt-6 p-6`}>
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF8FF] dark:bg-[#0094FF]/15">
                <CheckIcon />
              </div>
              <div className="flex-1">
                <p className={`${HEADING} mb-1 text-sm`}>Certified</p>
                <p className={`mb-3 text-xs ${MUTED}`}>
                  Certificate #{certNumber} &nbsp;·&nbsp; Issued{' '}
                  {issuedAt ? new Date(issuedAt).toLocaleDateString() : '—'} &nbsp;·&nbsp; Expires{' '}
                  {expiresAt ? new Date(expiresAt).toLocaleDateString() : '—'}
                </p>
                {certId ? (
                  <button
                    onClick={() => setCertModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#0094FF] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Download Certificate (PDF)
                  </button>
                ) : (
                  <p className={`text-xs ${MUTED}`}>Certificate PDF is being finalized.</p>
                )}
              </div>
            </div>
            <p className={`mt-5 border-t border-[#E5EEF5] pt-4 text-xs leading-relaxed ${MUTED} dark:border-[#1F2429]`}>
              This certificate documents completion of training. It is not legal advice and does not
              constitute accreditation by the ABA or any state bar.
            </p>
          </div>
        )}
      </main>
    </>
  )
}

/* ── Bits ──────────────────────────────────────────────────────────────────── */

function Requirement({ done, label }: { done: boolean; label: string }) {
  return (
    <p className="flex items-center gap-2 py-1 text-xs">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          done ? 'bg-[#0094FF] text-white' : 'border border-[#E5EEF5] dark:border-[#1F2429]'
        }`}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className={done ? 'font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]' : MUTED}>
        {label}
      </span>
    </p>
  )
}

function FocusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
    </svg>
  )
}

function CircleIcon() {
  return (
    <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0094FF" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4 text-[#0094FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 6v6l4 2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-[#0094FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
