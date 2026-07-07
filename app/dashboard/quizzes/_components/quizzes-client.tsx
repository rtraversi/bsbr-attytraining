'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ClientQuestion } from '@/lib/training/questions'
import type { LessonState, Progress } from '@/lib/training/progress'
import { KnowledgeCheckModal } from '../../overview/_components/knowledge-check-modal'

interface Props {
  progress: Progress
  questionsByLesson: Record<number, ClientQuestion[]>
  certUrl: string | null
  firstName: string | null
}

const CARD = 'rounded-2xl border border-[#E5EEF5] bg-white dark:border-[#1F2429] dark:bg-[#0D0F12]'
const HEADING = 'font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]'
const BODY = 'font-extralight text-[#3D3D3D] dark:text-[#C4CBD2]'
const MUTED = 'font-extralight text-[#8A8A8A] dark:text-[#7A8189]'

function canOpen(lesson: LessonState, fullyCleared: boolean): boolean {
  if (lesson.status === 'locked') return false
  return fullyCleared || lesson.attemptsRemaining === null || lesson.attemptsRemaining > 0
}

export function QuizzesClient({ progress, questionsByLesson, certUrl, firstName }: Props) {
  const router = useRouter()
  const [openLesson, setOpenLesson] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [assessmentNote, setAssessmentNote] = useState(false)

  const openLessonState = progress.lessons.find(l => l.number === openLesson)

  function tryOpen(lesson: LessonState) {
    if (!canOpen(lesson, progress.fullyCleared)) return
    setOpenLesson(lesson.number)
  }

  function closeModal() {
    setOpenLesson(null)
    router.refresh()
  }

  // Collapsed checkpoint summary — highest cleared lesson (or not-started).
  const clearedNums = progress.lessons.filter(l => l.status === 'cleared').map(l => l.number)
  const lastCleared = clearedNums.length ? Math.max(...clearedNums) : null
  const summary = progress.fullyCleared
    ? 'All lessons cleared'
    : lastCleared
      ? `Lesson ${lastCleared} — cleared`
      : 'Not started yet'

  const certUnlocked = certUrl !== null

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <header className="mb-6">
        <h1 className={`text-2xl ${HEADING}`}>{firstName ? `${firstName}’s quizzes` : 'Quizzes'}</h1>
        <p className={`mt-1 text-sm ${BODY}`}>
          Track your checkpoints, follow the path, and unlock your certificate.
        </p>
      </header>

      {/* ── Checkpoint block (hover / click to expand) ─────────────────────────── */}
      <section
        className={`group ${CARD} mb-4 overflow-hidden`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-[#00B9FF]">
              Checkpoint
            </span>
            <span className={`text-sm ${HEADING}`}>{summary}</span>
          </div>
          <ChevronIcon
            className={`h-4 w-4 text-[#8A8A8A] transition-transform duration-300 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Smooth expand via animated grid rows */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <ul className="border-t border-[#E5EEF5] px-2 py-2 dark:border-[#1F2429]">
              {progress.lessons.map(lesson => {
                const openable = canOpen(lesson, progress.fullyCleared)
                return (
                  <li key={lesson.number}>
                    <button
                      type="button"
                      onClick={() => tryOpen(lesson)}
                      disabled={!openable}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        openable
                          ? 'hover:bg-[#EAF8FF] dark:hover:bg-[#131A20]'
                          : 'cursor-not-allowed opacity-60'
                      }`}
                    >
                      <LessonIcon lesson={lesson} />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm ${
                            lesson.status === 'locked' ? MUTED : HEADING
                          }`}
                        >
                          {lesson.title}
                        </span>
                        <span className={`block text-xs ${MUTED}`}>
                          {lessonSubtitle(lesson, progress)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Progress path block (level-select map) ────────────────────────────── */}
      <section className={`${CARD} mb-4 px-5 py-6`}>
        <p className={`mb-5 text-xs font-medium uppercase tracking-widest ${MUTED}`}>Your path</p>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-1">
            {progress.lessons.map((lesson, i) => (
              <div key={lesson.number} className="flex items-center gap-1">
                <PathNode lesson={lesson} onClick={() => tryOpen(lesson)} fullyCleared={progress.fullyCleared} />
                <Connector done={lesson.status === 'cleared'} />
                {i === progress.lessons.length - 1 && <GoalFlag reached={certUnlocked} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final assessment block ────────────────────────────────────────────── */}
      <section
        className={`mb-4 rounded-2xl border px-5 py-5 ${
          progress.quizzesUnlocked
            ? 'border-[#32C7FF]/40 bg-[#32C7FF]/[0.06] dark:bg-[#32C7FF]/[0.08]'
            : 'border-[#E5EEF5] bg-[#F5F7FA]/60 dark:border-[#1F2429] dark:bg-[#0D0F12]/60'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className={`text-base ${progress.quizzesUnlocked ? HEADING : MUTED}`}>
              Ready for the final assessment?
            </h2>
            <p className={`mt-1 text-sm ${BODY}`}>
              {progress.quizzesUnlocked
                ? 'You’ve cleared every lesson check. Pass this to earn your certificate.'
                : 'Clear all five lesson checks to unlock the final certifying assessment.'}
            </p>
            {assessmentNote && progress.quizzesUnlocked && (
              <p className="mt-2 text-xs font-medium text-[#0094FF]">
                The timed final assessment is coming in a future update.
              </p>
            )}
          </div>
          {progress.quizzesUnlocked ? (
            <button
              type="button"
              onClick={() => setAssessmentNote(true)}
              className="shrink-0 rounded-xl bg-[#32C7FF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Start assessment
            </button>
          ) : (
            <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#E5EEF5] px-4 py-2.5 text-xs font-medium text-[#8A8A8A] dark:border-[#1F2429] dark:text-[#7A8189]">
              <LockIcon className="h-3.5 w-3.5" /> Locked
            </span>
          )}
        </div>
      </section>

      {/* ── Certificate block (the reward) ────────────────────────────────────── */}
      {certUnlocked ? (
        <div className="rounded-2xl bg-gradient-to-br from-[#32C7FF] to-[#0094FF] p-[1.5px] shadow-[0_0_44px_-10px_rgba(50,199,255,0.55)]">
          <section className="flex items-center justify-between gap-4 rounded-2xl bg-white px-5 py-5 dark:bg-[#0D0F12]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#32C7FF]/15">
                <CertIcon className="h-6 w-6 text-[#0094FF]" />
              </div>
              <div>
                <h2 className={`text-base ${HEADING}`}>Your certificate</h2>
                <p className={`text-sm ${BODY}`}>Issued and ready to download.</p>
              </div>
            </div>
            <a
              href={certUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-xl bg-[#32C7FF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Download
            </a>
          </section>
        </div>
      ) : (
        <section className="flex items-center gap-3 rounded-2xl border border-[#E5EEF5] bg-[#F5F7FA]/50 px-5 py-5 opacity-70 dark:border-[#1F2429] dark:bg-[#0D0F12]/50">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E5EEF5] dark:bg-[#1F2429]">
            <LockIcon className="h-5 w-5 text-[#8A8A8A]" />
          </div>
          <div>
            <h2 className={`text-base ${MUTED}`}>Your certificate</h2>
            <p className={`text-sm ${MUTED}`}>
              Locked — pass the final assessment to unlock your certificate.
            </p>
          </div>
        </section>
      )}

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

function lessonSubtitle(lesson: LessonState, progress: Progress): string {
  if (lesson.status === 'cleared') {
    return lesson.lastScore !== null ? `Cleared · ${lesson.lastScore}%` : 'Cleared'
  }
  if (lesson.status === 'locked') {
    return lesson.isReadiness && progress.shortcutLocked
      ? 'Shortcut locked — do lessons 1–4'
      : 'Locked'
  }
  if (lesson.isReadiness && !progress.fullyCleared) {
    return 'Readiness check — test out available'
  }
  return 'Available now'
}

function LessonIcon({ lesson }: { lesson: LessonState }) {
  const base = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full'
  if (lesson.status === 'cleared') {
    return (
      <span className={`${base} bg-[#32C7FF]/20`}>
        <CheckIcon className="h-4 w-4 text-[#32C7FF]" />
      </span>
    )
  }
  if (lesson.isReadiness && lesson.status !== 'locked') {
    // Distinct UNLOCK icon for the test-out lesson.
    return (
      <span className={`${base} border border-[#0094FF]/50 text-[#0094FF]`}>
        <UnlockIcon className="h-4 w-4" />
      </span>
    )
  }
  if (lesson.status === 'locked') {
    return (
      <span className={`${base} bg-[#E5EEF5] dark:bg-[#1F2429]`}>
        <LockIcon className="h-3.5 w-3.5 text-[#8A8A8A]" />
      </span>
    )
  }
  return (
    <span className={`${base} border border-[#32C7FF]/50 text-sm font-medium text-[#32C7FF]`}>
      {lesson.number}
    </span>
  )
}

function PathNode({
  lesson,
  onClick,
  fullyCleared,
}: {
  lesson: LessonState
  onClick: () => void
  fullyCleared: boolean
}) {
  const openable = canOpen(lesson, fullyCleared)
  const cleared = lesson.status === 'cleared'
  const locked = lesson.status === 'locked'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!openable}
      aria-label={`Lesson ${lesson.number}`}
      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-sm font-semibold transition-transform ${
        openable ? 'hover:scale-105' : 'cursor-not-allowed'
      } ${
        cleared
          ? 'border-[#32C7FF] bg-[#32C7FF] text-white'
          : locked
            ? 'border-[#E5EEF5] bg-[#F5F7FA] text-[#8A8A8A] dark:border-[#1F2429] dark:bg-[#0D0F12]'
            : 'border-[#32C7FF] bg-white text-[#0094FF] shadow-[0_0_0_4px_rgba(50,199,255,0.15)] dark:bg-[#0D0F12]'
      }`}
    >
      {cleared ? (
        <CheckIcon className="h-5 w-5" />
      ) : locked ? (
        <LockIcon className="h-4 w-4" />
      ) : lesson.isReadiness ? (
        <UnlockIcon className="h-4 w-4" />
      ) : (
        lesson.number
      )}
    </button>
  )
}

function Connector({ done }: { done: boolean }) {
  return (
    <span
      className={`h-1 w-6 rounded-full ${done ? 'bg-[#32C7FF]' : 'bg-[#E5EEF5] dark:bg-[#1F2429]'}`}
    />
  )
}

function GoalFlag({ reached }: { reached: boolean }) {
  return (
    <span
      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${
        reached
          ? 'border-[#0094FF] bg-[#0094FF]/10 text-[#0094FF] shadow-[0_0_24px_-6px_rgba(0,148,255,0.6)]'
          : 'border-[#E5EEF5] bg-[#F5F7FA] text-[#8A8A8A] dark:border-[#1F2429] dark:bg-[#0D0F12]'
      }`}
      aria-label="Certificate goal"
    >
      <FlagIcon className="h-5 w-5" />
    </span>
  )
}

/* ── icons ─────────────────────────────────────────────────────────────────── */

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-12V7a4 4 0 00-8 0" />
    </svg>
  )
}
function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V4m0 0l9 3-3 4 3 4-9-3" />
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
