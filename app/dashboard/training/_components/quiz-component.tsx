'use client'

import { useRouter } from 'next/navigation'
import { QuizRunner, type QuizAnswer, type QuizResult } from '@/app/dashboard/_components/quiz-runner'

export interface QuizQuestion {
  id: string
  question_text: string
  answers: string[]
}

interface Props {
  questions: QuizQuestion[]
  courseId: string
  onPass: () => void
  onRetry?: () => void
  onExit?: () => void
}

/**
 * Final certification assessment. Renders the shared full-screen QuizRunner
 * forward-only (no back-navigation) with the identity-attestation step before
 * submit. Scoring/recording stay server-side in /api/quiz/attempt.
 */
export function QuizComponent({ questions, courseId, onPass, onRetry, onExit }: Props) {
  const router = useRouter()

  if (questions.length === 0) {
    return (
      <div className="font-headline fixed inset-0 z-[70] flex items-center justify-center bg-[#F5F7FA] px-6 dark:bg-[#0A0A0A]">
        <div className="max-w-md text-center">
          <p className="mb-4 text-sm text-[#6D7980] dark:text-[#7A8189]">
            Quiz questions are not yet loaded. Run{' '}
            <code className="rounded bg-[#E5EEF5] px-1 py-0.5 text-xs dark:bg-[#1F2429]">
              supabase db push
            </code>{' '}
            then refresh.
          </p>
          {onExit && (
            <button
              onClick={onExit}
              className="rounded-xl bg-[#0A0A0A] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#262626] dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-[#E5EEF5]"
            >
              Back
            </button>
          )}
        </div>
      </div>
    )
  }

  async function onSubmit(answers: QuizAnswer[]): Promise<QuizResult> {
    let res: Response
    try {
      res = await fetch('/api/quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, answers, attestation: true }),
      })
    } catch {
      throw new Error('Network error. Please try again.')
    }
    const data = (await res.json()) as {
      passed?: boolean
      score?: number
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
      title="Certificate Assessment"
      subtitle="Certification quiz — you need 80% or higher to pass."
      questions={questions}
      allowBack={false}
      requiresAttestation
      onSubmit={onSubmit}
      onExit={onExit}
      onResult={r => {
        if (r.passed) onPass()
      }}
      renderResult={({ result, retry }) => (
        <FinalResult
          result={result}
          onRetry={() => (onRetry ? onRetry() : (retry(), router.refresh()))}
        />
      )}
    />
  )
}

function FinalResult({ result, onRetry }: { result: QuizResult; onRetry: () => void }) {
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
            Passed — {Math.round(result.score)}%
          </p>
        </div>
        <p className="text-sm text-[#6D7980] dark:text-[#7A8189]">
          Your certificate is being generated. This page will update automatically.
        </p>
      </div>
    )
  }

  return (
    <div className={`${card} border-[#E5EEF5] dark:border-[#1F2429]`}>
      <p className="mb-1 text-lg font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">
        Score: {Math.round(result.score)}% — not quite
      </p>
      <p className="mb-6 text-sm text-[#6D7980] dark:text-[#7A8189]">
        You need {result.passThreshold}% to pass. Take your time reviewing the material and try
        again.
      </p>
      <button
        onClick={onRetry}
        className="rounded-xl bg-[#0A0A0A] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#262626] dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-[#E5EEF5]"
      >
        Try Again
      </button>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="h-6 w-6 text-[#32C7FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
