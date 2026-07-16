'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ClientQuestion } from '@/lib/training/questions'
import type { LessonState, Progress } from '@/lib/training/progress'
import { LESSONS, type Lesson } from '@/lib/training/lessons'
import { KnowledgeCheckModal } from './knowledge-check-modal'

export interface ActivityItem {
  kind: 'knowledge_check' | 'content_started' | 'content_completed' | 'lesson_location_changed'
  /** Video (content) events are course-level and carry no lesson number. */
  lesson: number | null
  /** Set only for lesson_location_changed — the lesson boundary reached. */
  lessonNumber?: number | null
  score: number | null
  passed: boolean
  /** ISO timestamp. */
  at: string
}

interface Props {
  progress: Progress
  questionsByLesson: Record<number, ClientQuestion[]>
  firstName: string | null
  activity: ActivityItem[]
  certUrl: string | null
  /** Real SCORM content progress — highest lesson boundary reached (1–5), or null. */
  currentLessonNumber: number | null
  /** Real SCORM content completion (a video_completed event exists). */
  contentViewed: boolean
}

/* ── Shared tokens — exact values already in the codebase ──────────────────── */
const CARD =
  'rounded-[20px] border border-[#E5EEF5] bg-white shadow-[0_4px_20px_rgba(0,148,255,0.08)] dark:border-[#1F2429] dark:bg-[#0D0F12] dark:shadow-none'
// `font-headline` is set explicitly on every heading: the layout sets it on the
// shell, but Tailwind's preflight writes font-family straight onto some elements
// and beats the inherited value.
const HEADING = 'font-headline font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F7FA]'
const SECTION_HEADING = `${HEADING} mb-4 text-2xl md:text-3xl xl:mb-5 xl:text-[2.5rem]`
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'
const ACCENT = 'text-[#0094FF]'
const CARD_PAD = 'p-6 xl:p-8'

function canOpen(lesson: LessonState, fullyCleared: boolean): boolean {
  if (lesson.status === 'locked') return false
  return fullyCleared || lesson.attemptsRemaining === null || lesson.attemptsRemaining > 0
}

export function OverviewClient({
  progress,
  questionsByLesson,
  firstName,
  activity,
  certUrl,
  currentLessonNumber,
  contentViewed,
}: Props) {
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
    router.refresh() // re-derive authoritative progress server-side
  }

  // The current actionable quiz lesson = earliest unlocked one (sequential gating
  // guarantees ordering). Fully cleared → fall back to the last lesson for review.
  const focus =
    progress.lessons.find(l => l.status === 'unlocked') ??
    progress.lessons[progress.lessons.length - 1]

  const clearedCount = progress.lessons.filter(l => l.status === 'cleared').length
  const scored = progress.lessons.filter(l => l.lastScore !== null)
  const currentGrade =
    scored.length > 0
      ? Math.round(scored.reduce((sum, l) => sum + (l.lastScore ?? 0), 0) / scored.length)
      : null

  // Honest content-based progress for the "Lessons X/5" pill — same math as
  // training-client.tsx. This is COURSE content, not quiz clearance.
  const lessonsComplete = contentViewed ? 5 : currentLessonNumber ? currentLessonNumber - 1 : 0

  return (
    <main className="mx-auto w-full max-w-[1600px] px-6 py-10 md:px-10 xl:px-14 xl:py-14">
      {/* ── Header: greeting top-aligned with the stat cards ───────────────── */}
      <header className="mb-10 xl:mb-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-10">
          {/* The greeting's box already lines up with the cards, but `leading-none`
              still leaves half-leading above the caps — exactly (1 - 0.72)/2 ≈ 0.14em.
              Nudging up by that em amount levels the glyph tops with the card tops at
              every font size. Only from md up, where the two sit side by side. */}
          <h1
            className={`${HEADING} max-w-3xl text-4xl text-balance md:-mt-[0.14em] md:text-5xl xl:text-6xl`}
          >
            {firstName ? `Hi ${firstName}, ` : 'Hi, '}
            <span className={ACCENT}>{greeting(progress, clearedCount)}</span>
          </h1>

          {/* Fixed widths only from md up — at 390px `w-48 + w-36 + gap` exceeds the
              content box, so below md they share the row as equal halves. */}
          <div className="flex w-full shrink-0 gap-4 md:w-auto xl:gap-5">
            <div className={`${CARD} min-w-0 flex-1 px-5 py-4 md:w-52 md:flex-none xl:w-64 xl:px-6 xl:py-5`}>
              <div className="mb-1.5 flex items-baseline justify-between xl:mb-2.5">
                <span className={`text-xs font-bold tracking-wide uppercase xl:text-sm ${MUTED}`}>
                  Lessons
                </span>
                <span className={`text-sm font-bold xl:text-base ${ACCENT}`}>{lessonsComplete}/5</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-[#E5EEF5] xl:h-6 dark:bg-[#1F2429]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#32C7FF] to-[#0094FF] transition-[width] duration-500"
                  style={{ width: `${(lessonsComplete / 5) * 100}%` }}
                />
              </div>
            </div>

            <div className={`${CARD} min-w-0 flex-1 px-5 py-4 md:w-40 md:flex-none xl:w-48 xl:px-6 xl:py-5`}>
              <span
                className={`mb-1.5 block text-xs font-bold tracking-wide uppercase xl:mb-2.5 xl:text-sm ${MUTED}`}
              >
                Current grade
              </span>
              <p className={`font-headline text-2xl font-bold xl:text-4xl ${ACCENT}`}>
                {currentGrade === null ? (
                  <span className={`text-2xl font-medium xl:text-3xl ${MUTED}`}>—</span>
                ) : (
                  <>
                    {currentGrade}
                    <span className={`text-sm font-medium xl:text-base ${MUTED}`}>%</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12 xl:gap-x-14 xl:gap-y-14">
        {/* ── Left: main column ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-10 lg:col-span-7 xl:gap-14">
          <UpNextCard currentLessonNumber={currentLessonNumber} contentViewed={contentViewed} />
          <RecentActivityCard activity={activity} />
          <CertificateCard certUrl={certUrl} />
        </div>

        {/* ── Right: real course-content outline, quiz progress demoted below. */}
        <aside className="lg:col-span-5">
          <CourseOutlineCard currentLessonNumber={currentLessonNumber} contentViewed={contentViewed} />
          <QuizProgressCard progress={progress} focus={focus} tryOpen={tryOpen} />
        </aside>
      </div>

      {openLesson !== null && openLessonState && (
        <KnowledgeCheckModal
          lesson={openLesson}
          title={openLessonState.title}
          questions={questionsByLesson[openLesson] ?? []}
          isReadiness={openLessonState.isReadiness}
          onClose={closeModal}
        />
      )}
    </main>
  )
}

function greeting(progress: Progress, clearedCount: number): string {
  if (progress.fullyCleared) return 'you’re all done!'
  if (clearedCount === 0) return 'let’s get started.'
  if (clearedCount >= 3) return 'you’re almost there!'
  return 'keep it going.'
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hover-expand (desktop) + click/tap-toggle (mobile)
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

function ExpandBody({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

/* ── Up next — now driven by real course-content progress ──────────────────── */
function UpNextCard({
  currentLessonNumber,
  contentViewed,
}: {
  currentLessonNumber: number | null
  contentViewed: boolean
}) {
  const { open, hovered, toggle, hoverProps } = useExpand()

  // "Started" once content has reached at least lesson 1 (or fully completed).
  const started = contentViewed || currentLessonNumber !== null
  const lessonN = contentViewed ? LESSONS.length : (currentLessonNumber ?? 1)
  const title = LESSONS.find(l => l.number === lessonN)?.title ?? ''
  const cta = started ? `Resume Lesson ${lessonN}` : `Get Started with Lesson ${lessonN}`

  return (
    <section {...hoverProps}>
      <h2 className={SECTION_HEADING}>Up next</h2>
      <div
        className={`${CARD} ${CARD_PAD} transition-[transform,box-shadow] duration-300 ${
          hovered ? '-translate-y-1 shadow-[0_14px_28px_rgba(50,199,255,0.18)]' : ''
        }`}
      >
        {/* Collapsed: number circle + lesson title only; taps toggle on mobile. */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center gap-5 text-left xl:gap-7"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-xl font-bold text-white xl:h-[4.5rem] xl:w-[4.5rem] xl:text-3xl dark:bg-[#F5F7FA] dark:text-[#0A0A0A]">
            {lessonN}
          </span>
          {/* Wraps on narrow screens; single-line with ellipsis once there's room. */}
          <span className="min-w-0 flex-1 font-headline text-base font-semibold tracking-tight text-[#0094FF] text-pretty md:truncate xl:text-xl">
            {title}
          </span>
        </button>

        {/* Hover (or tap) reveals real navigation — a Link, not a quiz modal. */}
        <ExpandBody open={open}>
          <div className="pt-4 xl:pt-6">
            <Link
              href="/dashboard/training"
              className="block w-full cursor-pointer rounded-full bg-black py-3 text-center font-bold text-white transition-colors hover:bg-[#262626] xl:py-4 xl:text-lg dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-[#E5EEF5]"
            >
              {cta}
            </Link>
          </div>
        </ExpandBody>
      </div>
    </section>
  )
}

/* ── Recent activity ──────────────────────────────────────────────────────── */
function RecentActivityCard({ activity }: { activity: ActivityItem[] }) {
  const { open, hovered, toggle, hoverProps } = useExpand()

  const visible = activity.slice(0, 2)
  const hidden = activity.slice(2)

  return (
    <section {...hoverProps}>
      <h2 className={SECTION_HEADING}>Recent activity</h2>
      <div
        className={`${CARD} ${CARD_PAD} transition-[transform,box-shadow] duration-300 ${
          hovered ? '-translate-y-1 shadow-[0_14px_28px_rgba(50,199,255,0.18)]' : ''
        }`}
      >
        {activity.length === 0 ? (
          <p className={`text-base xl:text-lg ${MUTED}`}>
            No activity yet — start the training content or your first lesson check.
          </p>
        ) : (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            disabled={hidden.length === 0}
            className="flex w-full flex-col gap-5 text-left enabled:cursor-pointer xl:gap-6"
          >
            {visible.map((item, i) => (
              <ActivityRow key={`${item.at}-${i}`} item={item} recent />
            ))}
          </button>
        )}

        {hidden.length > 0 && (
          <ExpandBody open={open}>
            <div className="mt-3 flex flex-col gap-5 border-t border-[#E5EEF5] pt-4 xl:gap-6 xl:pt-6 dark:border-[#1F2429]">
              {hidden.map((item, i) => (
                <ActivityRow key={`${item.at}-${i}`} item={item} recent={false} />
              ))}
            </div>
          </ExpandBody>
        )}
      </div>
    </section>
  )
}

// Spans throughout: the collapsed rows render inside a <button>, whose content
// model only allows phrasing content.
function ActivityRow({ item, recent }: { item: ActivityItem; recent: boolean }) {
  const { title, detail } = describeActivity(item)

  return (
    <span className="flex gap-4">
      <span
        className={`w-[3px] shrink-0 self-stretch rounded-full ${
          recent ? 'bg-[#32C7FF]' : 'bg-[#E5EEF5] dark:bg-[#1F2429]'
        }`}
      />
      <span className="block min-w-0">
        <span className={`block text-base font-semibold xl:text-lg ${HEADING}`}>{title}</span>
        <span className={`block text-sm xl:text-base ${MUTED}`} suppressHydrationWarning>
          {detail}
          {detail && ' · '}
          {timeAgo(item.at)}
        </span>
      </span>
    </span>
  )
}

function describeActivity(item: ActivityItem): { title: string; detail: string } {
  if (item.kind === 'knowledge_check') {
    const verb = item.passed ? 'Passed' : 'Attempted'
    return {
      title: `${verb} Lesson ${item.lesson} knowledge check`,
      detail: item.score !== null ? `Scored ${item.score}%` : '',
    }
  }
  if (item.kind === 'lesson_location_changed') {
    return {
      title: item.lessonNumber ? `Reached Lesson ${item.lessonNumber}` : 'Reached a new lesson',
      detail: '',
    }
  }
  // The SCORM package reports course-level completion, so there is no lesson to name.
  if (item.kind === 'content_completed') {
    return { title: 'Completed the training content', detail: '' }
  }
  return { title: 'Started the training content', detail: '' }
}

/** Small local relative-time formatter — avoids pulling in date-fns for one call site. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000))

  if (secs < 60) return 'Just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

/* ── Your certificate — bottom, quiet, no hover-expand ─────────────────────── */
function CertificateCard({ certUrl }: { certUrl: string | null }) {
  const unlocked = certUrl !== null

  return (
    <section>
      <h2 className={SECTION_HEADING}>Your certificate</h2>
      {unlocked ? (
        <div className={`${CARD} ${CARD_PAD} flex items-center justify-between gap-4`}>
          <div className="flex min-w-0 items-center gap-3 xl:gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#32C7FF]/15 xl:h-14 xl:w-14">
              <CertIcon className="h-6 w-6 text-[#0094FF] xl:h-7 xl:w-7" />
            </span>
            <div className="min-w-0">
              <p className={`text-lg xl:text-xl ${HEADING}`}>Your certificate</p>
              <p className={`truncate text-base xl:text-lg ${MUTED}`}>Issued and ready to download.</p>
            </div>
          </div>
          <a
            href={certUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 cursor-pointer rounded-full bg-[#32C7FF] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 xl:px-7 xl:py-3 xl:text-base"
          >
            Download
          </a>
        </div>
      ) : (
        <div className={`${CARD} ${CARD_PAD} flex items-center gap-4 opacity-70`}>
          <LockIcon className={`h-6 w-6 shrink-0 xl:h-7 xl:w-7 ${MUTED}`} />
          <p className={`text-base italic xl:text-lg ${MUTED}`}>
            Complete Lesson 5 and the Certificate Assessment to unlock…
          </p>
        </div>
      )}
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Course outline — real SCORM content progress. Linear progression is guaranteed
   (Rise blocks skipping ahead), so each lesson's status is purely positional
   relative to the highest boundary reached. The current lesson gets a Play/Resume
   link straight to the training player.
   ═══════════════════════════════════════════════════════════════════════════ */
function CourseOutlineCard({
  currentLessonNumber,
  contentViewed,
}: {
  currentLessonNumber: number | null
  contentViewed: boolean
}) {
  const current = currentLessonNumber ?? 1

  function statusOf(n: number): 'done' | 'current' | 'locked' {
    if (contentViewed) return 'done'
    if (n < current) return 'done'
    if (n === current) return 'current'
    return 'locked'
  }

  return (
    <section>
      <h2 className={SECTION_HEADING}>Course outline</h2>
      <div className={`${CARD} ${CARD_PAD}`}>
        <div className="flex flex-col gap-1">
          {LESSONS.map(lesson => (
            <ContentOutlineRow key={lesson.number} lesson={lesson} status={statusOf(lesson.number)} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ContentOutlineRow({
  lesson,
  status,
}: {
  lesson: Lesson
  status: 'done' | 'current' | 'locked'
}) {
  const done = status === 'done'
  const current = status === 'current'

  const rowBase = 'flex items-center gap-3 py-2.5 xl:gap-4 xl:py-3'
  const rowClass = current
    ? `${rowBase} -mx-3 rounded-xl bg-[#EAF8FF] px-3 dark:bg-[#0094FF]/10`
    : rowBase

  const titleClass = done
    ? 'font-medium text-[#0A0A0A] dark:text-[#F5F7FA]'
    : current
      ? 'font-bold text-[#0094FF]'
      : MUTED

  return (
    <div className={rowClass}>
      {/* Badge — content is not a quiz, so a done lesson shows a check, no score. */}
      {done ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#32C7FF] xl:h-7 xl:w-7">
          <svg className="h-3.5 w-3.5 text-white xl:h-4 xl:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : current ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#0094FF] text-[11px] font-bold text-[#0094FF] xl:h-7 xl:w-7 xl:text-xs">
          {lesson.number}
        </span>
      ) : (
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F4F7] text-[11px] font-bold xl:h-7 xl:w-7 xl:text-xs dark:bg-[#1F2429] ${MUTED}`}
        >
          {lesson.number}
        </span>
      )}

      <span className={`min-w-0 flex-1 text-base xl:text-lg ${titleClass}`}>{lesson.title}</span>

      {current ? (
        <Link
          href="/dashboard/training"
          aria-label={`Resume ${lesson.title}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white transition-colors hover:bg-[#262626] xl:h-9 xl:w-9 dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-[#E5EEF5]"
        >
          <PlayIcon className="h-4 w-4" />
        </Link>
      ) : status === 'locked' ? (
        <LockIcon className={`h-4 w-4 shrink-0 xl:h-5 xl:w-5 ${MUTED}`} />
      ) : null}
    </div>
  )
}

/* ── Lesson checks (quiz) — demoted, compact secondary block ────────────────
   The quiz system (deriveProgress, shortcut, KnowledgeCheckModal) is unchanged;
   it's just visually condensed here. Full detail lives on the Quizzes tab.
   ═══════════════════════════════════════════════════════════════════════════ */
function QuizProgressCard({
  progress,
  focus,
  tryOpen,
}: {
  progress: Progress
  focus: LessonState
  tryOpen: (l: LessonState | number) => void
}) {
  const clearedCount = progress.lessons.filter(l => l.status === 'cleared').length

  return (
    <section className="mt-10 xl:mt-14">
      <h2 className={SECTION_HEADING}>Lesson checks</h2>
      <div className={`${CARD} ${CARD_PAD}`}>
        <div className="mb-4 flex items-center justify-between xl:mb-5">
          <span className={`text-base font-bold xl:text-lg ${ACCENT}`}>{clearedCount}/5 cleared</span>
        </div>

        <div className="flex flex-col gap-1">
          {progress.lessons.map(lesson => (
            <QuizRow
              key={lesson.number}
              lesson={lesson}
              isNext={lesson.number === focus.number && lesson.status !== 'cleared'}
              openable={canOpen(lesson, progress.fullyCleared)}
              onOpen={() => tryOpen(lesson)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function QuizRow({
  lesson,
  isNext,
  openable,
  onOpen,
}: {
  lesson: LessonState
  isNext: boolean
  openable: boolean
  onOpen: () => void
}) {
  const cleared = lesson.status === 'cleared'
  const locked = lesson.status === 'locked'

  const rowBase = 'flex items-center gap-3 py-2 xl:gap-4 xl:py-2.5'
  const rowClass = isNext
    ? `${rowBase} -mx-3 rounded-xl bg-[#EAF8FF] px-3 dark:bg-[#0094FF]/10`
    : rowBase

  const titleClass = cleared
    ? 'font-medium text-[#0A0A0A] dark:text-[#F5F7FA]'
    : isNext
      ? 'font-bold text-[#0094FF]'
      : MUTED

  return (
    <div className={rowClass}>
      {cleared ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#32C7FF] xl:h-7 xl:w-7">
          <svg className="h-3.5 w-3.5 text-white xl:h-4 xl:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : (
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold xl:h-7 xl:w-7 xl:text-xs ${
            isNext
              ? 'border-2 border-[#0094FF] text-[#0094FF]'
              : `bg-[#F2F4F7] dark:bg-[#1F2429] ${MUTED}`
          }`}
        >
          {lesson.number}
        </span>
      )}

      <span className={`min-w-0 flex-1 text-base xl:text-lg ${titleClass}`}>{lesson.title}</span>

      {cleared ? (
        <span className="shrink-0 text-sm font-bold whitespace-nowrap text-[#16A34A] xl:text-base dark:text-[#4ADE80]">
          {lesson.lastScore ?? 100}%
        </span>
      ) : locked ? (
        <LockIcon className={`h-4 w-4 shrink-0 ${MUTED}`} />
      ) : (
        <button
          type="button"
          onClick={onOpen}
          disabled={!openable}
          className="shrink-0 rounded-full bg-black px-3 py-1 text-sm font-bold text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40 xl:text-base dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-[#E5EEF5]"
        >
          {lesson.attempts > 0 ? 'Continue' : 'Start'}
        </button>
      )}
    </div>
  )
}

/* ── Icons ────────────────────────────────────────────────────────────────── */
function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  )
}

function CertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="9" r="5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 13.5L7 21l5-2.5L17 21l-1.5-7.5" />
    </svg>
  )
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
