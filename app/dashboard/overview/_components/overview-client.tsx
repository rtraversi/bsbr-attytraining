'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ClientQuestion } from '@/lib/training/questions'
import type { Progress } from '@/lib/training/progress'
import { KnowledgeCheckModal } from './knowledge-check-modal'

interface Props {
  progress: Progress
  questionsByLesson: Record<number, ClientQuestion[]>
  firstName: string | null
}

export function OverviewClient({ progress, questionsByLesson, firstName }: Props) {
  const router = useRouter()
  const [openLesson, setOpenLesson] = useState<number | null>(null)

  const all14Cleared = progress.lessons.slice(0, 4).every(l => l.status === 'cleared')
  const openLessonState = progress.lessons.find(l => l.number === openLesson)

  function closeModal() {
    setOpenLesson(null)
    router.refresh() // re-derive authoritative progress server-side
  }

  return (
    <main className="font-headline mx-auto max-w-2xl px-6 py-10">
      {/* Header + milestone stars */}
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-white">
          {firstName ? `Hi ${firstName} — your training` : 'Your training'}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Work through the five lessons in order, or test out with the readiness check.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          {[1, 2, 3].map(i => (
            <StarIcon key={i} filled={i <= progress.stars} />
          ))}
        </div>
        <p className="mt-2 text-xs uppercase tracking-widest text-zinc-500">
          {progress.stars} of 3 milestones
        </p>
      </header>

      {/* Lessons */}
      <ol className="space-y-3">
        {progress.lessons.map(lesson => {
          const cleared = lesson.status === 'cleared'
          const locked = lesson.status === 'locked'
          const isShortcut = lesson.isReadiness && !all14Cleared && !cleared
          const canOpen =
            !locked &&
            (progress.fullyCleared || lesson.attemptsRemaining === null || lesson.attemptsRemaining > 0)

          // Action label
          let actionLabel = 'Start check'
          if (cleared) actionLabel = 'Review'
          else if (lesson.isReadiness) actionLabel = isShortcut ? 'Test out →' : 'Take readiness check'

          return (
            <li
              key={lesson.number}
              className={`rounded-xl border px-4 py-4 ${
                cleared
                  ? 'border-[#32C7FF]/25 bg-[#32C7FF]/[0.04]'
                  : locked
                    ? 'border-zinc-800 bg-zinc-900/40'
                    : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-4">
                <LessonBadge number={lesson.number} cleared={cleared} locked={locked} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`truncate text-sm font-semibold ${
                        locked ? 'text-zinc-500' : 'text-white'
                      }`}
                    >
                      {lesson.title}
                    </p>
                    {lesson.isReadiness && (
                      <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                        Readiness
                      </span>
                    )}
                  </div>
                  <LessonMeta
                    cleared={cleared}
                    locked={locked}
                    isShortcut={isShortcut}
                    shortcutLocked={progress.shortcutLocked && lesson.isReadiness}
                    lastScore={lesson.lastScore}
                    reviewFlag={lesson.reviewFlag}
                    attemptsRemaining={progress.fullyCleared ? null : lesson.attemptsRemaining}
                  />
                </div>

                <div className="shrink-0">
                  {locked ? (
                    <span className="text-xs text-zinc-600">Locked</span>
                  ) : canOpen ? (
                    <button
                      onClick={() => setOpenLesson(lesson.number)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90 ${
                        cleared
                          ? 'bg-zinc-800 text-zinc-200'
                          : 'bg-[#32C7FF] text-zinc-950'
                      }`}
                    >
                      {actionLabel}
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-600">No attempts left</span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Final assessment gate */}
      <div
        className={`mt-6 rounded-xl border px-4 py-4 ${
          progress.quizzesUnlocked
            ? 'border-[#32C7FF]/30 bg-[#32C7FF]/[0.06]'
            : 'border-zinc-800 bg-zinc-900/40'
        }`}
      >
        {progress.quizzesUnlocked ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-white">
              <span className="font-semibold">Final assessment unlocked.</span> You’ve cleared the
              readiness check.
            </p>
            <Link
              href="/dashboard/quizzes"
              className="shrink-0 rounded-lg bg-[#32C7FF] px-3 py-2 text-xs font-semibold text-zinc-950 transition-opacity hover:opacity-90"
            >
              Go to Quizzes →
            </Link>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Clear the <span className="text-zinc-300">readiness check</span> to unlock the final
            assessment in the Quizzes tab.
          </p>
        )}
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

function LessonMeta({
  cleared,
  locked,
  isShortcut,
  shortcutLocked,
  lastScore,
  reviewFlag,
  attemptsRemaining,
}: {
  cleared: boolean
  locked: boolean
  isShortcut: boolean
  shortcutLocked: boolean
  lastScore: number | null
  reviewFlag: boolean
  attemptsRemaining: number | null
}) {
  if (cleared) {
    return (
      <p className="mt-0.5 text-xs text-zinc-400">
        Cleared{lastScore !== null && ` · scored ${lastScore}%`}
        {reviewFlag && (
          <span className="text-amber-400/90"> · consider reviewing again</span>
        )}
      </p>
    )
  }
  if (locked) {
    return (
      <p className="mt-0.5 text-xs text-zinc-600">
        {shortcutLocked ? 'Shortcut locked — complete lessons 1–4 in order' : 'Complete the previous lesson first'}
      </p>
    )
  }
  if (isShortcut) {
    return (
      <p className="mt-0.5 text-xs text-[#9BE0FF]">
        Confident? Attempt this directly to test out of lessons 1–4
        {attemptsRemaining !== null && ` · ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} left`}
      </p>
    )
  }
  return (
    <p className="mt-0.5 text-xs text-zinc-500">
      {attemptsRemaining !== null
        ? `${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} left`
        : 'Ready to start'}
    </p>
  )
}

function LessonBadge({ number, cleared, locked }: { number: number; cleared: boolean; locked: boolean }) {
  if (cleared) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#32C7FF]/20">
        <svg className="h-5 w-5 text-[#32C7FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    )
  }
  if (locked) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800">
        <svg className="h-4 w-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
    )
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#32C7FF]/40 text-sm font-semibold text-[#32C7FF]">
      {number}
    </div>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-8 w-8 ${filled ? 'text-[#32C7FF]' : 'text-zinc-700'}`}
      fill={filled ? 'currentColor' : 'none'}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.5a.56.56 0 011.04 0l2.12 4.9 5.32.46c.5.04.7.66.32.99l-4.03 3.5 1.2 5.2c.12.5-.42.9-.86.63L12 17.02l-4.61 2.66c-.44.26-.98-.13-.86-.63l1.2-5.2-4.03-3.5c-.38-.33-.18-.95.32-.99l5.32-.46 2.12-4.9z"
      />
    </svg>
  )
}
