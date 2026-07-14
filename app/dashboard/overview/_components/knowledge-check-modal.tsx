'use client'

import type { ClientQuestion } from '@/lib/training/questions'
import { QuizRunner, type QuizAnswer, type QuizResult } from '@/app/dashboard/_components/quiz-runner'

interface Props {
  lesson: number
  title: string
  questions: ClientQuestion[]
  isReadiness: boolean
  onClose: () => void
}

/**
 * Per-lesson knowledge check. Renders the shared full-screen QuizRunner with
 * back-navigation enabled and a close affordance (dismissable mid-attempt).
 * Scoring/gating stay server-side in /api/training/knowledge-check.
 */
export function KnowledgeCheckModal({ lesson, title, questions, isReadiness, onClose }: Props) {
  async function onSubmit(answers: QuizAnswer[]): Promise<QuizResult> {
    let res: Response
    try {
      res = await fetch('/api/training/knowledge-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson, answers }),
      })
    } catch {
      throw new Error('Network error. Please try again.')
    }
    const data = (await res.json()) as {
      score?: number
      passed?: boolean
      passThreshold?: number
      error?: string
    }
    if (!res.ok) throw new Error(data.error ?? 'Submission failed. Please try again.')
    return {
      score: data.score ?? 0,
      passed: data.passed ?? false,
      passThreshold: data.passThreshold ?? 80,
    }
  }

  return (
    <QuizRunner
      title="Knowledge Check"
      subtitle={`Lesson ${lesson} — ${title}`}
      questions={questions}
      allowBack
      showReadinessBanner={isReadiness}
      readinessThreshold={80}
      onSubmit={onSubmit}
      onExit={onClose}
      renderResult={({ result, exit }) => (
        <KnowledgeCheckResult result={result} isReadiness={isReadiness} onDone={exit} />
      )}
    />
  )
}

function KnowledgeCheckResult({
  result,
  isReadiness,
  onDone,
}: {
  result: QuizResult
  isReadiness: boolean
  onDone: () => void
}) {
  const card =
    'mx-auto max-w-xl rounded-3xl border bg-white p-8 shadow-[0_4px_20px_rgba(0,148,255,0.08)] dark:bg-[#0D0F12]'

  if (result.passed) {
    return (
      <div className={`${card} border-[#32C7FF]/30`}>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#32C7FF]/15">
            <CheckIcon />
          </div>
          <p className="text-lg font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">
            {isReadiness ? 'Readiness cleared' : 'Lesson cleared'} — {result.score}%
          </p>
        </div>
        {!isReadiness && result.score < result.passThreshold && (
          <p className="mb-6 text-sm text-[#B45309] dark:text-[#F0B357]">
            Your score was on the low side — consider reviewing this lesson again. (It’s still marked
            complete.)
          </p>
        )}
        {isReadiness && (
          <p className="mb-6 text-sm text-[#6D7980] dark:text-[#7A8189]">
            You’re cleared for the Certificate Assessment.
          </p>
        )}
        <DoneButton onClick={onDone} />
      </div>
    )
  }

  return (
    <div className={`${card} border-[#E5EEF5] dark:border-[#1F2429]`}>
      <p className="mb-1 text-lg font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">
        Score: {result.score}% — not quite
      </p>
      <p className="mb-6 text-sm text-[#6D7980] dark:text-[#7A8189]">
        You need {result.passThreshold}% to clear the readiness check. Review the material and try
        again.
      </p>
      <DoneButton onClick={onDone} />
    </div>
  )
}

function DoneButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl bg-[#0A0A0A] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#262626] dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-[#E5EEF5]"
    >
      Done
    </button>
  )
}

function CheckIcon() {
  return (
    <svg className="h-6 w-6 text-[#32C7FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
