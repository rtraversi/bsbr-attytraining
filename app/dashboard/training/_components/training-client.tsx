'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ClientQuestion } from '@/lib/training/questions'
import { LESSONS, READINESS_LESSON } from '@/lib/training/lessons'
import { QuizComponent } from './quiz-component'
import { ScormContent } from './scorm-content'
import { KnowledgeCheckModal } from '@/app/dashboard/overview/_components/knowledge-check-modal'

type TrainingPhase =
  | 'not_started'
  | 'cert_pending'
  | 'certified'

interface Props {
  phase: TrainingPhase
  courseTitle: string
  courseId: string | null
  /** Per-lesson knowledge-check questions, for the soft-nag quiz (same modal as Quizzes/Overview). */
  questionsByLesson: Record<number, ClientQuestion[]>
  /** Lesson checks 1–5 cleared (derived server-side from knowledge_check_completed events). */
  checksCleared: boolean
  /**
   * Lowest-numbered lesson whose check is not yet cleared, or null when all are.
   * Drives the "Next Up" card. Sequential ordering was removed in P0, so this is
   * a stable choice among equally-available checks, not a required order.
   */
  nextUnclearedLesson?: number | null
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
  questionsByLesson,
  checksCleared,
  nextUnclearedLesson = null,
  contentViewed,
  currentLessonNumber,
  initialLocation,
  initialSuspendData,
}: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState(initialPhase)
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
    // The bottom tab bar (EmployeeTabBar) is rendered by DashboardShell, outside
    // this component's tree, and sits in a higher stacking layer than the focus
    // player can reach (the player is z-50 but trapped inside the shell's z-10
    // content wrapper, so it can't paint over the z-40 tab bar). Rather than lift
    // focus state up to the shell, flag it on <html> and let CSS hide the bar.
    document.documentElement.classList.add('training-focus')

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
      document.documentElement.classList.remove('training-focus')
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

  /* ── "Next Up" target ───────────────────────────────────────────────────────
     The card was hardcoded to the Certificate Assessment — the LAST thing in the
     course — so it told the learner nothing about what to do now, and showed a
     dead "Locked" pill until every gate opened.

     ⚠️ Content-done is deliberately NOT `contentViewed`. Per the gatesOpen note
     above, Rise's SCORM completion signal structurally never fires for this
     course, so keying the first state off it would pin the card on "resume the
     content" forever and it could never advance to the other two. Reaching the
     final lesson is the honest available proxy, and it reuses the same
     liveLessonNumber the progress bar and Lesson Overview already trust. */
  const contentComplete = contentViewed || (liveLessonNumber ?? 0) >= LESSONS.length

  const nextUp: { kind: 'content' | 'check'; lesson: number } | { kind: 'assessment' } =
    !contentComplete
      ? { kind: 'content', lesson: overviewLesson.number }
      : nextUnclearedLesson !== null
        ? { kind: 'check', lesson: nextUnclearedLesson }
        : { kind: 'assessment' }

  // Lesson 5's check is presented as "Final Review" everywhere else (its
  // checkLabel), so "Lesson 5 Check: Final Review" would both repeat itself and
  // name it differently from the Quizzes tab.
  const nextUpCheckLesson =
    nextUp.kind === 'check' ? LESSONS.find(l => l.number === nextUp.lesson) : undefined
  const nextUpCheckName =
    nextUp.kind === 'check' && nextUp.lesson === READINESS_LESSON
      ? 'Final Review'
      : `Lesson ${nextUp.kind === 'check' ? nextUp.lesson : ''} Check`

  // Resume = scroll back to the player, which is already on this page above the
  // card. Not focus mode: that is a full-viewport takeover and a heavier thing
  // than "carry on where you left off" should trigger.
  const playerRef = useRef<HTMLDivElement | null>(null)
  const resumeContent = () =>
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Opens a lesson check from the Next Up card. Reuses the soft-nag's modal
  // state rather than adding a second pair: it is the same KnowledgeCheckModal,
  // and two sets of state for one modal could only ever disagree.
  const openLessonCheck = (lesson: number) => {
    setNagLesson(lesson)
    setNagQuizOpen(true)
  }

  return (
    <>
      {showQuiz && courseId && (
        /* Both gates cleared → full-screen certification quiz, no click required.
           No `questions` prop and no retake key: QuizComponent asks
           /api/quiz/start for its own server-chosen question set on mount and on
           every retake (ix-quizforge). */
        <QuizComponent
          courseId={courseId}
          onPass={() => setPhase('cert_pending')}
          onExit={() => setQuizDismissed(true)}
        />
      )}


      {/* Soft-nag quiz — the exact same KnowledgeCheckModal used on Quizzes/Overview.
          Closing it (pass, fail, or backing out) dismisses the nag for good. */}
      {nagQuizOpen && nagLesson !== null && (
        <KnowledgeCheckModal
          lesson={nagLesson}
          title={LESSONS.find(l => l.number === nagLesson)?.title ?? ''}
          questions={questionsByLesson[nagLesson] ?? []}
          // The nag itself only ever fires for lessons 1–4, so this is unchanged
          // on that path — it matters because Next Up can now open lesson 5's
          // Final Review, which needs the readiness banner and pass threshold.
          isReadiness={nagLesson === READINESS_LESSON}
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
              ? 'fixed inset-x-0 top-0 z-[60] flex items-center justify-between px-6 pb-12 pt-5 md:px-10'
              : 'mb-6 flex items-center justify-between gap-4'
          }
        >
          {/* Focus scrim — Rise's own content is light, so white chrome would
              vanish against it. It's its OWN layer (not the bar's background) so
              it can fade out alongside the title + progress on idle, leaving only
              the self-legible exit button behind. Sits behind the bar's content
              (both groups are `relative`, so they paint above this absolute one). */}
          {focus && (
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-transparent transition-opacity duration-500 ${
                chromeIdle ? 'opacity-0' : 'opacity-100'
              }`}
            />
          )}

          <div className="relative flex items-center">
            {/* Collapse width (not just opacity) on idle so the exit button slides
                to the left edge instead of holding the title's old position. */}
            <h1
              className={`${HEADING} overflow-hidden whitespace-nowrap text-2xl transition-all duration-500 md:text-3xl xl:text-[2.5rem] ${
                focus ? 'text-white dark:text-white' : ''
              } ${focus && chromeIdle ? 'mr-0 max-w-0 opacity-0' : 'mr-3 max-w-[70vw] opacity-100'}`}
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
            className={`relative flex shrink-0 items-center gap-3 rounded-full px-4 py-2 transition-opacity duration-500 ${
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
                  background: 'linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-emphasis) 100%)',
                }}
              />
            </div>
            <span
              className={`whitespace-nowrap text-sm font-bold ${
                focus ? 'text-[#5FC8FF]' : 'text-[var(--brand-emphasis)]'
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
          ref={playerRef}
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
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--brand-emphasis)]">
                      Key Takeaways
                    </h3>
                    <ul className="space-y-2">
                      {overviewLesson.keyTakeaways.map(t => (
                        <li key={t} className="flex gap-2 text-sm text-[#3D3D3D] dark:text-[#C4C9CE]">
                          <TakeawayDot />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* ── Next Up — the first thing the learner still owes ─────────── */}
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
                  {nextUp.kind === 'content'
                    ? `Lesson ${nextUp.lesson}: ${overviewLesson.title}`
                    : nextUp.kind === 'check'
                      ? `${nextUpCheckName}${
                          nextUpCheckLesson ? ` — ${nextUpCheckLesson.title}` : ''
                        }`
                      : 'Certificate Assessment'}
                </p>

                {/* One live action per state — never a dead "Locked" pill. The
                    assessment state is only reachable once every check is
                    cleared, so the old locked branch is now unreachable; the
                    only remaining dead end is an uninitialised course. */}
                {/* stopPropagation: the card body toggles the disclosure, and a
                    primary action should not do that on its way through. */}
                {nextUp.kind === 'content' ? (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      resumeContent()
                    }}
                    className="block w-full rounded-full bg-[var(--brand-emphasis)] py-2.5 text-center text-xs font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Resume Lesson {nextUp.lesson}
                  </button>
                ) : nextUp.kind === 'check' ? (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      openLessonCheck(nextUp.lesson)
                    }}
                    className="block w-full rounded-full bg-[var(--brand-emphasis)] py-2.5 text-center text-xs font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Take the {nextUpCheckName}
                  </button>
                ) : courseId ? (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      openAssessment()
                    }}
                    className="block w-full rounded-full bg-[var(--brand-emphasis)] py-2.5 text-center text-xs font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Take Assessment
                  </button>
                ) : (
                  <span className="block w-full cursor-not-allowed rounded-full bg-[#F2F4F7] py-2.5 text-center text-xs font-bold text-[#9AA1A9] dark:bg-[#131A20] dark:text-[#4E555C]">
                    Course not yet initialized
                  </span>
                )}

                {/* Hover/tap-expand: what still stands between here and the
                    assessment. Unchanged in purpose — only the headline above
                    moved from "the last thing" to "the next thing". */}
                <div
                  className={`overflow-hidden transition-[max-height,opacity,margin-top,padding-top] duration-300 motion-reduce:transition-none ${
                    nextUpOpen
                      ? 'mt-4 max-h-64 border-t border-[#E5EEF5] pt-4 opacity-100 dark:border-[#1F2429]'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  {/* contentComplete, not contentViewed — otherwise this row
                      would contradict the headline, permanently reporting the
                      content unfinished while the card moved on to checks. */}
                  <Requirement done={contentComplete} label="Training content" />
                  <Requirement done={checksCleared} label="Lesson checks" />
                  {!checksCleared && (
                    <Link
                      href="/dashboard/quizzes"
                      className="mt-3 inline-block text-xs font-semibold text-[var(--brand-emphasis)] hover:underline"
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
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF8FF] dark:bg-[var(--brand-emphasis)]/15">
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

        {/* Cert details + download live on the Quizzes tab now — this is just
            a pointer, matching Overview's minimal treatment. */}
        {!focus && phase === 'certified' && (
          <div className={`${CARD} mt-6 flex items-center justify-between gap-4 p-6`}>
            <p className={`text-sm ${MUTED}`}>
              Certified — your certificate is issued and ready to download.
            </p>
            <Link
              href="/dashboard/quizzes"
              className="shrink-0 cursor-pointer rounded-full bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Go
            </Link>
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
          done ? 'bg-[var(--brand-emphasis)] text-white' : 'border border-[#E5EEF5] dark:border-[#1F2429]'
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

/**
 * Marker for a key takeaway.
 *
 * Was a 15px hollow ring, which reads as an unticked checkbox — an unfinished
 * checklist, the exact opposite of "here is what you should now know". A small
 * solid dot is a bullet: it introduces a statement instead of inviting one to be
 * ticked off. mt-2 optically centres it on the first line of `text-sm
 * leading-relaxed` copy rather than hanging it from the cap height.
 */
function TakeawayDot() {
  return <span aria-hidden className="mt-2 h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--brand-emphasis)]" />
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4 text-[var(--brand-emphasis)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 6v6l4 2" />
    </svg>
  )
}

