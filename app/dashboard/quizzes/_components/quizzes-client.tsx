'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ClientQuestion } from '@/lib/training/questions'
import type { LessonState, Progress } from '@/lib/training/progress'
import { KnowledgeCheckModal } from '../../overview/_components/knowledge-check-modal'

interface Props {
  progress: Progress
  questionsByLesson: Record<number, ClientQuestion[]>
  certUrl: string | null
  firstName: string | null
}

// The readiness lesson (5) is the terminus/gate. Lessons 1–4 are the "regular" path.
const REGULAR = [1, 2, 3, 4]

// Whether a lesson's check can be opened right now (mirrors the server gate).
function canOpen(lesson: LessonState, fullyCleared: boolean): boolean {
  if (lesson.status === 'locked') return false
  return fullyCleared || lesson.attemptsRemaining === null || lesson.attemptsRemaining > 0
}

export function QuizzesClient({ progress, questionsByLesson, certUrl, firstName }: Props) {
  const router = useRouter()
  const [openLesson, setOpenLesson] = useState<number | null>(null)

  const openLessonState = progress.lessons.find(l => l.number === openLesson)

  function tryOpen(lesson: LessonState | number) {
    const target =
      typeof lesson === 'number' ? progress.lessons.find(l => l.number === lesson) : lesson
    if (!target || !canOpen(target, progress.fullyCleared)) return
    setOpenLesson(target.number)
  }

  function closeModal() {
    setOpenLesson(null)
    router.refresh()
  }

  const lesson5 = progress.lessons.find(l => l.isReadiness)!
  const certUnlocked = certUrl !== null

  return (
    <>
      <QuizStyles />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-12 lg:px-10">
        <div className="grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-12 lg:gap-x-14">
          {/* ── Left column: the action cards ─────────────────────────────────── */}
          <section className="flex flex-col gap-10 md:col-span-7 md:gap-12">
            <JumpBackInCard progress={progress} tryOpen={tryOpen} firstName={firstName} />
            <FinalTestCard progress={progress} />
            <CertificateCard certUnlocked={certUnlocked} certUrl={certUrl} />
          </section>

          {/* ── Right column: the S-curve path map ────────────────────────────── */}
          <aside className="md:col-span-5">
            <h2 className="qz-entrance qz-d1 mb-5 text-2xl font-semibold tracking-tight text-[#0A0A0A] md:text-3xl dark:text-[#F5F7FA]">
              Your path
            </h2>
            <PathMap
              progress={progress}
              lesson5={lesson5}
              certUnlocked={certUnlocked}
              tryOpen={tryOpen}
            />
          </aside>
        </div>
      </main>

      {openLesson !== null && openLessonState && (
        <KnowledgeCheckModal
          lesson={openLesson}
          title={openLessonState.title}
          questions={questionsByLesson[openLesson] ?? []}
          isReadiness={openLessonState.isReadiness}
          onClose={closeModal}
        />
      )}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Expand behaviour — hover-expand (desktop) + click/tap-toggle (mobile), shared
   ═══════════════════════════════════════════════════════════════════════════ */
function useExpand() {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  return {
    open: pinned || hovered,
    hovered,
    toggle: () => setPinned(p => !p),
    hoverProps: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
  }
}

const PILL =
  'rounded-[28px] border border-[#E5EEF5] bg-[#F2F4F7] dark:border-[#1F2429] dark:bg-[#0D0F12] md:rounded-[36px]'
const HEADING = 'font-semibold tracking-tight text-[#0A0A0A] dark:text-[#F5F7FA]'
const BODY = 'font-extralight text-[#3D3D3D] dark:text-[#C4CBD2]'
const MUTED = 'font-normal text-[#8A8A8A] dark:text-[#7A8189]'

/* ═══════════════════════════════════════════════════════════════════════════
   Card 1 — "Jump back in"
   ═══════════════════════════════════════════════════════════════════════════ */
function JumpBackInCard({
  progress,
  tryOpen,
  firstName,
}: {
  progress: Progress
  tryOpen: (l: LessonState | number) => void
  firstName: string | null
}) {
  const { open, hovered, toggle, hoverProps } = useExpand()

  // The current actionable lesson = earliest unlocked one (sequential gating
  // guarantees ordering). When fully cleared, fall back to the last lesson for review.
  const focus =
    progress.lessons.find(l => l.status === 'unlocked') ??
    progress.lessons[progress.lessons.length - 1]

  const focusLabel = progress.fullyCleared
    ? 'Cleared'
    : focus.attempts > 0
      ? 'Continue'
      : 'Start'

  const resumeLabel = progress.fullyCleared
    ? 'Review lessons'
    : focus.attempts > 0
      ? `Continue Lesson ${focus.number}`
      : `Start Lesson ${focus.number}`

  return (
    <div className="qz-entrance qz-d2 group" {...hoverProps}>
      <h2 className={`mb-4 text-2xl md:text-3xl ${HEADING}`}>Jump back in</h2>
      <div
        className={`${PILL} px-6 py-5 transition-[transform,box-shadow] duration-300 md:px-8 md:py-6 ${
          hovered ? '-translate-y-1 shadow-[0_14px_28px_rgba(50,199,255,0.18)]' : ''
        }`}
      >
        {/* Collapsed summary — a real button so it toggles on tap and shows a pointer */}
        <button
          type="button"
          onClick={toggle}
          className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
          aria-expanded={open}
        >
          <span className="min-w-0">
            <span className={`block text-base font-semibold md:text-lg ${HEADING}`}>
              {progress.fullyCleared ? 'All lessons cleared' : `Lesson ${focus.number}`}
            </span>
            <span className={`mt-0.5 block truncate text-xs md:text-sm ${MUTED}`}>
              {progress.fullyCleared ? 'Review any check anytime' : focus.title}
            </span>
          </span>
          <span className="shrink-0 text-xs font-bold whitespace-nowrap text-[#0094FF]">
            {focusLabel}
          </span>
        </button>

        {/* Expandable body */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-5">
              <button
                type="button"
                onClick={() => tryOpen(focus)}
                className="w-full cursor-pointer rounded-full bg-[#0A0A0A] py-3 text-sm font-bold text-white transition-colors hover:bg-[#262626] md:text-base dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-[#E5EEF5]"
              >
                {resumeLabel}
              </button>
              {firstName && !progress.fullyCleared && (
                <p className={`mt-3 text-center text-xs ${MUTED}`}>
                  Pick up where you left off, {firstName}.
                </p>
              )}

              <ul className="mt-5 space-y-1 border-t border-[#E5EEF5] pt-4 dark:border-[#1F2429]">
                {progress.lessons.map(lesson => (
                  <LessonRow
                    key={lesson.number}
                    lesson={lesson}
                    progress={progress}
                    tryOpen={tryOpen}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LessonRow({
  lesson,
  progress,
  tryOpen,
}: {
  lesson: LessonState
  progress: Progress
  tryOpen: (l: LessonState | number) => void
}) {
  const cleared = lesson.status === 'cleared'
  const openable = canOpen(lesson, progress.fullyCleared)

  // Lesson 5 shortcut affordance: an unlock icon (not a plain lock) is the honor-
  // system entry point — but only while the shortcut is actually available.
  const showShortcutUnlock =
    lesson.isReadiness && !cleared && progress.shortcutAvailable && openable

  const dotColor = cleared
    ? 'bg-[#22C55E]'
    : lesson.status === 'unlocked'
      ? 'bg-[#32C7FF]'
      : 'bg-[#D1D5DB] dark:bg-[#374151]'

  const titleColor =
    lesson.status === 'locked' ? MUTED : cleared ? BODY : `${HEADING} font-medium`

  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
        <span className={`truncate text-sm md:text-base ${titleColor}`}>
          Lesson {lesson.number}: {lesson.title}
        </span>
      </span>
      {cleared ? (
        <span className="shrink-0 text-xs font-bold whitespace-nowrap text-[#16A34A] dark:text-[#4ADE80]">
          {lesson.lastScore !== null ? `Cleared · ${lesson.lastScore}%` : 'Cleared'}
        </span>
      ) : showShortcutUnlock ? (
        <UnlockIcon className="h-4 w-4 shrink-0 text-[#0094FF]" />
      ) : lesson.status === 'unlocked' ? (
        <span className="shrink-0 text-xs font-bold whitespace-nowrap text-[#0094FF]">
          {lesson.attempts > 0 ? 'Continue' : 'Available'}
        </span>
      ) : (
        <LockIcon className="h-4 w-4 shrink-0 text-[#8A8A8A]" />
      )}
    </>
  )

  const rowClass = 'flex items-center justify-between rounded-xl px-2 py-2.5 -mx-2'

  if (openable) {
    return (
      <li>
        <button
          type="button"
          onClick={() => tryOpen(lesson)}
          className={`${rowClass} w-full cursor-pointer text-left transition-colors hover:bg-white dark:hover:bg-[#131A20]`}
        >
          {content}
        </button>
      </li>
    )
  }
  return (
    <li className={`${rowClass} opacity-70`}>{content}</li>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Card 2 — "Ready for the final test?"
   ═══════════════════════════════════════════════════════════════════════════ */
function FinalTestCard({ progress }: { progress: Progress }) {
  const { open, hovered, toggle, hoverProps } = useExpand()
  const [assessmentNote, setAssessmentNote] = useState(false)

  // All derived from progress.lessons — nothing hardcoded.
  const regular = progress.lessons.filter(l => REGULAR.includes(l.number))
  const clearedCount = regular.filter(l => l.status === 'cleared').length
  const readinessPct = Math.round((clearedCount / REGULAR.length) * 100)
  const scored = regular.filter(l => l.lastScore !== null)
  const average = scored.length
    ? Math.round(scored.reduce((s, l) => s + (l.lastScore ?? 0), 0) / scored.length)
    : null

  const readinessNote =
    readinessPct === 100
      ? 'all set!'
      : readinessPct >= 75
        ? 'looking good!'
        : readinessPct > 0
          ? 'keep going'
          : 'just getting started'

  // Animate the readiness bar filling in after mount.
  const [barFill, setBarFill] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setBarFill(readinessPct), 120)
    return () => clearTimeout(t)
  }, [readinessPct])

  const unlocked = progress.quizzesUnlocked

  return (
    <div className="qz-entrance qz-d3 group" {...hoverProps}>
      <h2 className={`mb-4 text-2xl md:text-3xl ${HEADING}`}>Ready for the final test?</h2>
      <div
        className={`px-6 py-5 transition-[transform,box-shadow] duration-300 md:px-8 md:py-6 ${
          unlocked
            ? 'rounded-[28px] border border-[#32C7FF]/40 bg-[#32C7FF]/[0.06] md:rounded-[36px] dark:bg-[#32C7FF]/[0.08]'
            : PILL
        } ${hovered ? '-translate-y-1 shadow-[0_14px_28px_rgba(50,199,255,0.18)]' : ''}`}
      >
        <button
          type="button"
          onClick={() => (unlocked ? setAssessmentNote(true) : toggle())}
          aria-expanded={open}
          className={`w-full rounded-full py-3 text-sm font-bold transition-colors md:text-base ${
            unlocked
              ? 'cursor-pointer bg-[#32C7FF] text-white hover:opacity-90'
              : 'cursor-pointer bg-[#E5EAEF] text-[#9AA1A9] dark:bg-[#1F2429] dark:text-[#5C636B]'
          }`}
        >
          Take Final Test
        </button>
        <p className={`mt-2 text-center text-xs ${MUTED}`}>
          {unlocked
            ? assessmentNote
              ? 'The timed final assessment is coming in a future update.'
              : 'You’ve cleared every lesson check — pass this to earn your certificate.'
            : 'Complete the Final Review to unlock.'}
        </p>

        {/* Knowledge readiness bar — always visible */}
        <div className="pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className={`text-sm font-semibold ${HEADING}`}>Knowledge readiness</span>
            <span
              className={`text-sm font-bold ${
                readinessPct >= 75
                  ? 'text-[#16A34A] dark:text-[#4ADE80]'
                  : 'text-[#0094FF]'
              }`}
            >
              {readinessPct}% — {readinessNote}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#DDE3E9] dark:bg-[#1F2429]">
            <div
              className={`h-full rounded-full transition-[width] duration-1000 ease-out ${
                readinessPct >= 75 ? 'bg-[#22C55E]' : 'bg-[#32C7FF]'
              }`}
              style={{ width: `${barFill}%` }}
            />
          </div>
        </div>

        {/* Expandable per-lesson breakdown */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="mt-4 border-t border-[#E5EEF5] pt-4 dark:border-[#1F2429]">
              {scored.length === 0 ? (
                <p className={`text-sm ${MUTED}`}>
                  Per-lesson scores appear here as you clear each check.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {scored.map(l => (
                      <div key={l.number} className={`text-sm ${MUTED}`}>
                        L{l.number} quiz:{' '}
                        <span className={`font-bold ${HEADING}`}>{l.lastScore}%</span>
                      </div>
                    ))}
                  </div>
                  {average !== null && (
                    <div className="mt-2 border-t border-[#E5EEF5] pt-2 text-sm dark:border-[#1F2429]">
                      <span className={MUTED}>Current average: </span>
                      <span className={`font-bold ${HEADING}`}>{average}%</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Card 3 — "Access certificate" (reward; keeps its gradient-glow logic)
   ═══════════════════════════════════════════════════════════════════════════ */
function CertificateCard({
  certUnlocked,
  certUrl,
}: {
  certUnlocked: boolean
  certUrl: string | null
}) {
  return (
    <div className="qz-entrance qz-d4">
      <h2 className={`mb-4 text-2xl md:text-3xl ${HEADING}`}>Access certificate</h2>
      {certUnlocked ? (
        <div className="rounded-[28px] bg-gradient-to-br from-[#32C7FF] to-[#0094FF] p-[1.5px] shadow-[0_0_44px_-10px_rgba(50,199,255,0.55)] md:rounded-[36px]">
          <div className="flex items-center justify-between gap-4 rounded-[27px] bg-white px-6 py-5 md:rounded-[35px] md:px-8 md:py-6 dark:bg-[#0D0F12]">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#32C7FF]/15">
                <CertIcon className="h-6 w-6 text-[#0094FF]" />
              </span>
              <div className="min-w-0">
                <p className={`text-base ${HEADING}`}>Your certificate</p>
                <p className={`truncate text-sm ${BODY}`}>Issued and ready to download.</p>
              </div>
            </div>
            <a
              href={certUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 cursor-pointer rounded-full bg-[#32C7FF] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Download
            </a>
          </div>
        </div>
      ) : (
        <div
          className={`${PILL} flex items-center justify-between gap-4 px-6 py-5 opacity-80 md:px-8 md:py-6`}
        >
          <span className={`text-sm italic md:text-base ${MUTED}`}>
            Complete Lesson 5 and the final assessment to unlock…
          </span>
          <LockIcon className="h-6 w-6 shrink-0 text-[#8A8A8A]" />
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   "Your path" — one SVG coordinate space drives both dots AND connectors, so
   they always line up. Flags / labels / castle are % overlays anchored to the
   same coordinate grid (viewBox 4:7 == aspect-[4/7] container → exact mapping).
   ═══════════════════════════════════════════════════════════════════════════ */
type Node = { n: number; cx: number; cy: number; leftPct: number; topPct: number }

const NODES: Node[] = [
  { n: 1, cx: 100, cy: 70, leftPct: 25, topPct: 10 },
  { n: 2, cx: 300, cy: 190, leftPct: 75, topPct: 27.14 },
  { n: 3, cx: 100, cy: 310, leftPct: 25, topPct: 44.29 },
  { n: 4, cx: 300, cy: 430, leftPct: 75, topPct: 61.43 },
  { n: 5, cx: 100, cy: 520, leftPct: 25, topPct: 74.29 },
]
const CASTLE = { leftPct: 50, topPct: 91.43 }

// Connector segments (S-curve). Coloured once the lesson they LEAVE FROM is cleared.
const SEGMENTS: { d: string; from: number }[] = [
  { d: 'M100,70 Q300,110 300,190', from: 1 },
  { d: 'M300,190 Q300,250 100,310', from: 2 },
  { d: 'M100,310 Q100,370 300,430', from: 3 },
  { d: 'M300,430 Q300,480 100,520', from: 4 },
  { d: 'M100,520 Q100,590 200,640', from: 5 },
]

function PathMap({
  progress,
  lesson5,
  certUnlocked,
  tryOpen,
}: {
  progress: Progress
  lesson5: LessonState
  certUnlocked: boolean
  tryOpen: (l: LessonState | number) => void
}) {
  const byNum = new Map(progress.lessons.map(l => [l.number, l]))
  const goalReached = progress.quizzesUnlocked || certUnlocked

  return (
    <div className="qz-entrance qz-d2">
      <div className={`${PILL} p-5 sm:p-7 md:p-6 lg:p-8`}>
        <div className="relative mx-auto aspect-[4/7] w-full max-w-[380px]">
          {/* Single coordinate space: connectors + dots share this viewBox */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 400 700"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            {SEGMENTS.map((seg, i) => {
              const cleared = byNum.get(seg.from)?.status === 'cleared'
              return (
                <path
                  key={i}
                  d={seg.d}
                  fill="none"
                  strokeWidth={2.5}
                  strokeDasharray="5 6"
                  className={
                    cleared ? 'stroke-[#32C7FF]' : 'stroke-[#D1D5DB] dark:stroke-[#374151]'
                  }
                />
              )
            })}
            {NODES.map((node, i) => {
              const lesson = byNum.get(node.n)!
              const reached = lesson.status !== 'locked'
              const openable = canOpen(lesson, progress.fullyCleared)
              return (
                <ellipse
                  key={node.n}
                  cx={node.cx}
                  cy={node.cy}
                  rx={13}
                  ry={7.5}
                  style={{ animationDelay: `${i * 0.4}s` }}
                  onClick={openable ? () => tryOpen(lesson) : undefined}
                  className={`qz-dot ${
                    reached ? 'fill-[#32C7FF]' : 'fill-[#D1D5DB] dark:fill-[#374151]'
                  } ${openable ? 'cursor-pointer' : ''}`}
                />
              )
            })}
          </svg>

          {/* Flags — one per cleared lesson, planted into its dot */}
          {NODES.filter(node => byNum.get(node.n)?.status === 'cleared').map(node => (
            <div
              key={`flag-${node.n}`}
              className="qz-flag pointer-events-none absolute"
              style={{ left: `${node.leftPct}%`, top: `${node.topPct}%` }}
            >
              <ClearedFlagIcon className="h-6 w-6" />
            </div>
          ))}

          {/* Lesson labels — offset to the side of each dot, never over the curve */}
          {NODES.map(node => {
            const lesson = byNum.get(node.n)!
            const reached = lesson.status !== 'locked'
            const color = reached
              ? 'text-[#0094FF]'
              : 'text-[#9AA1A9] dark:text-[#5C636B]'
            if (node.n === 5) {
              // Centred above its dot so the wide "Final Review" label can't clip.
              return (
                <div
                  key={`lbl-${node.n}`}
                  className="pointer-events-none absolute"
                  style={{ left: `${node.leftPct}%`, top: `${node.topPct}%`, transform: 'translate(-50%,-190%)' }}
                >
                  <span className={`text-[11px] font-bold whitespace-nowrap md:text-xs ${color}`}>
                    Final Review
                  </span>
                </div>
              )
            }
            const onLeft = node.leftPct < 50
            return (
              <div
                key={`lbl-${node.n}`}
                className={`pointer-events-none absolute ${onLeft ? 'text-right' : 'text-left'}`}
                style={{
                  left: `${node.leftPct}%`,
                  top: `${node.topPct}%`,
                  transform: onLeft ? 'translate(-132%,-50%)' : 'translate(32%,-50%)',
                }}
              >
                <span className={`text-[11px] font-bold whitespace-nowrap md:text-xs ${color}`}>
                  Lesson {node.n}
                </span>
              </div>
            )
          })}

          {/* Castle — the Final Assessment goal */}
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: `${CASTLE.leftPct}%`, top: `${CASTLE.topPct}%` }}
          >
            <CastleIcon
              className={`mx-auto h-16 w-16 ${
                goalReached
                  ? 'text-[#0094FF] drop-shadow-[0_0_16px_rgba(0,148,255,0.55)]'
                  : 'text-[#9AA1A9] dark:text-[#5C636B]'
              }`}
            />
            <span
              className={`mt-1 block text-[11px] font-bold md:text-xs ${
                goalReached ? 'text-[#0094FF]' : 'text-[#9AA1A9] dark:text-[#5C636B]'
              }`}
            >
              Final Assessment
            </span>
          </div>
        </div>

        {/* Shortcut entry point — below the map so it always has clear margin (no
            clipping against the coordinate box edge). Mirrors the list unlock icon. */}
        {progress.shortcutAvailable ? (
          <div className="mt-5 flex items-center justify-center">
            <button
              type="button"
              onClick={() => tryOpen(5)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#CDEEFF] bg-[#EAF8FF] px-4 py-2 text-xs font-bold text-[#0094FF] transition-colors hover:bg-[#D8F2FF] dark:border-[#1F3A4A] dark:bg-[#0E2430] dark:text-[#5FC8FF] dark:hover:bg-[#123040]"
            >
              <UnlockIcon className="h-3.5 w-3.5" />
              Skip to Final Review
            </button>
          </div>
        ) : progress.shortcutLocked && lesson5.status !== 'cleared' ? (
          <p className={`mt-5 text-center text-xs ${MUTED}`}>
            Shortcut locked — complete lessons 1–4 in order.
          </p>
        ) : null}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Custom keyframes (scoped by qz- prefixed classes; respects reduced motion)
   ═══════════════════════════════════════════════════════════════════════════ */
function QuizStyles() {
  return (
    <style>{`
      @keyframes qzEnter { to { opacity: 1; transform: translateY(0); } }
      @keyframes qzDotPulse { 0%, 78%, 100% { transform: scale(1); } 89% { transform: scale(1.3); } }
      @keyframes qzFlagPop {
        0% { opacity: 0; transform: translate(-50%,-30%) scale(0.3); }
        70% { opacity: 1; transform: translate(-50%,-95%) scale(1.15); }
        100% { opacity: 1; transform: translate(-50%,-82%) scale(1); }
      }
      .qz-entrance { opacity: 0; transform: translateY(14px); animation: qzEnter 0.55s cubic-bezier(.2,.7,.3,1) forwards; }
      .qz-d1 { animation-delay: 0.05s; }
      .qz-d2 { animation-delay: 0.18s; }
      .qz-d3 { animation-delay: 0.31s; }
      .qz-d4 { animation-delay: 0.44s; }
      .qz-dot { transform-box: fill-box; transform-origin: center; animation: qzDotPulse 3.6s ease-in-out infinite; }
      .qz-flag { transform-origin: bottom center; animation: qzFlagPop 0.5s cubic-bezier(.3,1.6,.4,1) 1.1s forwards; opacity: 0; }
      @media (prefers-reduced-motion: reduce) {
        .qz-entrance, .qz-flag { animation: none; opacity: 1; transform: none; }
        .qz-dot { animation: none; }
      }
    `}</style>
  )
}

/* ── Extracted assets ────────────────────────────────────────────────────────
   Reference SVG markup pulled out of quizzes-tab-v2.html as reusable components. */

function ClearedFlagIcon({ className }: { className?: string }) {
  // Green pennant on a pole (green = a cleared level).
  return (
    <svg className={className} viewBox="0 0 1080 1080" fill="none">
      <g transform="matrix(2.95248,0,0,2.95248,-380.144,-1240.04)">
        <g transform="matrix(0.607509,0,0,0.737262,-36.3326,470.984)">
          <rect x="489" y="90" width="102" height="337" fill="#9CA3AF" />
        </g>
        <g transform="matrix(2.43552,0,0,1.38838,-1178.65,295.046)">
          <path d="M591,90L687,169L591,263.991L591,90Z" fill="#22C55E" />
        </g>
      </g>
    </svg>
  )
}

function CastleIcon({ className }: { className?: string }) {
  // Monochrome castle (currentColor) so it themes cleanly in light + dark.
  return (
    <svg className={className} viewBox="0 0 1080 1080" fill="currentColor">
      <g transform="matrix(1.27765,0,0,1.27765,-151.208,-118.434)">
        <g transform="matrix(1,0,0,0.579882,0,394.071)">
          <rect x="163" y="431" width="756" height="507" />
        </g>
        <g transform="matrix(1,0,0,0.573913,0,274.4)">
          <rect x="234" y="414" width="617" height="230" />
        </g>
        <g transform="matrix(0.5,0,0,0.578261,265.5,139.6)">
          <rect x="234" y="414" width="617" height="230" />
        </g>
        <g transform="matrix(0.47549,0,0,0.577046,283.235,132.601)">
          <rect x="489" y="90" width="102" height="337" />
        </g>
        <g transform="matrix(1.90625,0,0,0.925742,-610.844,9.38009)" opacity={0.72}>
          <path d="M591,90L687,169L591,263.991L591,90Z" />
        </g>
        <g transform="matrix(0.719844,0,0,0.719844,140.467,262.786)" opacity={0.72}>
          <g transform="matrix(1,0,0,0.986364,0,12.7909)">
            <rect x="468" y="718" width="181" height="220" />
          </g>
          <g transform="matrix(1,0,0,0.677966,0,219.305)">
            <path d="M649,740C649,772.563 631.077,799 609,799L508,799C485.923,799 468,772.563 468,740C468,707.437 485.923,681 508,681L609,681C631.077,681 649,707.437 649,740Z" />
          </g>
        </g>
      </g>
    </svg>
  )
}

/* ── Line icons ──────────────────────────────────────────────────────────── */
function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}
function UnlockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0M6 11h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2z" />
    </svg>
  )
}
function CertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="9" r="5" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5L8 21l4-2 4 2-1-7.5" />
    </svg>
  )
}
