'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ClientQuestion } from '@/lib/training/questions'
import type { LessonState, Progress } from '@/lib/training/progress'
import { KnowledgeCheckModal } from './knowledge-check-modal'

export interface ActivityItem {
  kind: 'knowledge_check' | 'content_started' | 'content_completed'
  /** Content events are course-level and carry no lesson number. */
  lesson: number | null
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
}

/* ── Shared tokens — exact values already in the codebase ──────────────────── */
const CARD =
  'rounded-[20px] border border-[#E5EEF5] bg-white shadow-[0_4px_20px_rgba(0,148,255,0.08)] dark:border-[#1F2429] dark:bg-[#0D0F12] dark:shadow-none'
// `font-headline` is set explicitly on every heading: the layout sets it on the
// shell, but Tailwind's preflight writes font-family straight onto some elements
// and beats the inherited value.
const HEADING = 'font-headline font-bold tracking-tight text-[#0A0A0A] dark:text-[#F5F7FA]'
const SECTION_HEADING = `${HEADING} mb-4 text-2xl md:text-[2.25rem]`
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'
const ACCENT = 'text-[#0094FF]'

function canOpen(lesson: LessonState, fullyCleared: boolean): boolean {
  if (lesson.status === 'locked') return false
  return fullyCleared || lesson.attemptsRemaining === null || lesson.attemptsRemaining > 0
}

export function OverviewClient({ progress, questionsByLesson, firstName, activity, certUrl }: Props) {
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

  // The current actionable lesson = earliest unlocked one (sequential gating
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

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10">
      {/* ── Header: greeting + two real stat cards ─────────────────────────── */}
      <header className="mb-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <h1 className={`${HEADING} text-3xl md:text-4xl`}>
            {firstName ? `Hi ${firstName}, ` : 'Hi, '}
            <span className={ACCENT}>{greeting(progress, clearedCount)}</span>
          </h1>

          {/* Fixed widths only from md up — at 390px `w-48 + w-36 + gap` exceeds the
              content box and would force the whole page into horizontal overflow. */}
          <div className="flex w-full gap-4 md:w-auto">
            <div className={`${CARD} min-w-0 flex-1 px-5 py-4 md:w-48 md:flex-none`}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className={`text-xs font-bold tracking-wide uppercase ${MUTED}`}>Lessons</span>
                <span className={`text-sm font-bold ${ACCENT}`}>{clearedCount}/5</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5EEF5] dark:bg-[#1F2429]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#32C7FF] to-[#0094FF] transition-[width] duration-500"
                  style={{ width: `${(clearedCount / 5) * 100}%` }}
                />
              </div>
            </div>

            <div className={`${CARD} min-w-0 flex-1 px-5 py-4 md:w-36 md:flex-none`}>
              <span className={`mb-1.5 block text-xs font-bold tracking-wide uppercase ${MUTED}`}>
                Current grade
              </span>
              <p className={`font-headline text-2xl font-bold ${ACCENT}`}>
                {currentGrade === null ? (
                  <span className={`text-2xl font-medium ${MUTED}`}>—</span>
                ) : (
                  <>
                    {currentGrade}
                    <span className={`text-sm font-medium ${MUTED}`}>%</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
        {/* ── Left: main column ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-10 lg:col-span-8">
          <UpNextCard progress={progress} focus={focus} tryOpen={tryOpen} />
          <RecentActivityCard activity={activity} />
          <CertificateCard certUrl={certUrl} />
        </div>

        {/* ── Right: course outline (no hover-expand — at-a-glance) ───────── */}
        <aside className="lg:col-span-4">
          <h2 className={SECTION_HEADING}>Course outline</h2>
          <div className={`${CARD} p-6`}>
            <ol className="flex flex-col gap-1">
              {progress.lessons.map(lesson => (
                <OutlineRow key={lesson.number} lesson={lesson} isCurrent={lesson.number === focus.number} />
              ))}
            </ol>
          </div>
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
   Hover-expand (desktop) + click/tap-toggle (mobile) — same as "Jump back in"
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

/* ── Up next ──────────────────────────────────────────────────────────────── */
function UpNextCard({
  progress,
  focus,
  tryOpen,
}: {
  progress: Progress
  focus: LessonState
  tryOpen: (l: LessonState | number) => void
}) {
  const { open, hovered, toggle, hoverProps } = useExpand()
  const percent = focus.lastScore ?? 0

  return (
    <section {...hoverProps}>
      <h2 className={SECTION_HEADING}>Up next</h2>
      <div
        className={`${CARD} p-6 transition-[transform,box-shadow] duration-300 ${
          hovered ? '-translate-y-1 shadow-[0_14px_28px_rgba(50,199,255,0.18)]' : ''
        }`}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center gap-5 text-left"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-xl font-bold text-white dark:bg-[#F5F7FA] dark:text-[#0A0A0A]">
            {focus.number}
          </span>

          <span className="min-w-0 flex-1">
            <span className="mb-2 inline-block rounded-lg bg-[#EAF8FF] px-2.5 py-[3px] text-[11px] font-bold text-[#0094FF] dark:bg-[#0094FF]/15">
              Lesson {focus.number}
              {focus.isReadiness && ' · Readiness check'}
            </span>
            <span className={`block truncate text-lg ${HEADING}`}>{focus.title}</span>
          </span>

          <span className={`shrink-0 text-sm font-bold whitespace-nowrap ${ACCENT}`}>{percent}%</span>
        </button>

        <ExpandBody open={open}>
          <div className="pt-4">
            <button
              type="button"
              onClick={() => tryOpen(focus)}
              className="w-full cursor-pointer rounded-full bg-black py-3 font-bold text-white transition-colors hover:bg-[#262626] dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-[#E5EEF5]"
            >
              {progress.fullyCleared ? `Review Lesson ${focus.number}` : `Resume Lesson ${focus.number}`}
            </button>
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
        className={`${CARD} p-6 transition-[transform,box-shadow] duration-300 ${
          hovered ? '-translate-y-1 shadow-[0_14px_28px_rgba(50,199,255,0.18)]' : ''
        }`}
      >
        {activity.length === 0 ? (
          <p className={`text-sm ${MUTED}`}>
            No activity yet — start the training content or your first lesson check.
          </p>
        ) : (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            disabled={hidden.length === 0}
            className="flex w-full flex-col gap-5 text-left enabled:cursor-pointer"
          >
            {visible.map((item, i) => (
              <ActivityRow key={`${item.at}-${i}`} item={item} recent />
            ))}
          </button>
        )}

        {hidden.length > 0 && (
          <ExpandBody open={open}>
            <div className="mt-3 flex flex-col gap-5 border-t border-[#E5EEF5] pt-4 dark:border-[#1F2429]">
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
        <span className={`block text-sm font-semibold ${HEADING}`}>{title}</span>
        <span className={`block text-xs ${MUTED}`} suppressHydrationWarning>
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
        <div className={`${CARD} flex items-center justify-between gap-4 p-6`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#32C7FF]/15">
              <CertIcon className="h-6 w-6 text-[#0094FF]" />
            </span>
            <div className="min-w-0">
              <p className={`text-base ${HEADING}`}>Your certificate</p>
              <p className={`truncate text-sm ${MUTED}`}>Issued and ready to download.</p>
            </div>
          </div>
          <a
            href={certUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 cursor-pointer rounded-full bg-[#32C7FF] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Download
          </a>
        </div>
      ) : (
        <div className={`${CARD} flex items-center gap-4 p-6 opacity-70`}>
          <LockIcon className={`h-6 w-6 shrink-0 ${MUTED}`} />
          <p className={`text-sm italic ${MUTED}`}>
            Complete Lesson 5 and the final assessment to unlock…
          </p>
        </div>
      )}
    </section>
  )
}

/* ── Course outline row ───────────────────────────────────────────────────── */
function OutlineRow({ lesson, isCurrent }: { lesson: LessonState; isCurrent: boolean }) {
  const cleared = lesson.status === 'cleared'

  if (cleared) {
    return (
      <li className="flex items-center gap-3 py-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#32C7FF]">
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="text-sm font-medium text-[#0A0A0A] dark:text-[#F5F7FA]">{lesson.title}</span>
      </li>
    )
  }

  if (isCurrent) {
    return (
      <li className="-mx-3 flex items-center gap-3 rounded-xl bg-[#EAF8FF] px-3 py-2.5 dark:bg-[#0094FF]/10">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#0094FF] text-[11px] font-bold text-[#0094FF]">
          {lesson.number}
        </span>
        <span className="text-sm font-bold text-[#0094FF]">{lesson.title}</span>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F2F4F7] text-[11px] font-bold dark:bg-[#1F2429] ${MUTED}`}
      >
        {lesson.number}
      </span>
      <span className={`text-sm ${MUTED}`}>{lesson.title}</span>
    </li>
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
