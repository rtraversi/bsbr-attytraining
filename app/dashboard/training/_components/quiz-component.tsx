'use client'

import { useCallback, useEffect, useState } from 'react'
import { QuizRunner, type QuizAnswer, type QuizResult } from '@/app/dashboard/_components/quiz-runner'

export interface QuizQuestion {
  id: string
  question_text: string
  answers: string[]
}

interface Props {
  courseId: string
  onPass: () => void
  onExit?: () => void
}

interface Session {
  sessionId: string
  questions: QuizQuestion[]
}

/**
 * Final certification assessment.
 *
 * The questions are NOT passed in as props any more. They used to be chosen in
 * the Training Server Component and threaded down through TrainingClient, which
 * meant the exam was whatever the client eventually posted back. This component
 * now asks /api/quiz/start for one when it mounts — the reveal gate — and
 * submits only the sessionId with the answers. The server decides what the exam
 * was and grades against its own record (ix-quizforge).
 *
 * Unlimited retakes still hold: a session is single-use, so every retake calls
 * /api/quiz/start again and gets a freshly shuffled set.
 */
export function QuizComponent({ courseId, onPass, onExit }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [loadError, setLoadError] = useState('')
  // Bumped on every retake. Used as QuizRunner's key so it remounts with clean
  // internal state, and to re-run the session fetch below.
  const [runKey, setRunKey] = useState(0)

  const loadSession = useCallback(async () => {
    setSession(null)
    setLoadError('')
    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      })
      const data = (await res.json()) as {
        sessionId?: string
        questions?: QuizQuestion[]
        error?: string
      }
      if (!res.ok || !data.sessionId || !data.questions?.length) {
        setLoadError(data.error ?? 'Could not start the assessment. Please try again.')
        return
      }
      setSession({ sessionId: data.sessionId, questions: data.questions })
    } catch {
      setLoadError('Network error. Please try again.')
    }
  }, [courseId])

  useEffect(() => {
    void loadSession()
  }, [loadSession, runKey])

  async function onSubmit(answers: QuizAnswer[]): Promise<QuizResult> {
    if (!session) throw new Error('No active assessment. Please reload and try again.')
    let res: Response
    try {
      res = await fetch('/api/quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          sessionId: session.sessionId,
          answers,
          attestation: true,
        }),
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

  // Every retake needs a NEW session — the one just graded is consumed, and
  // re-submitting against it is rejected. QuizRunner's own internal retry()
  // resets its answers but not the session, so it must not be the retry path
  // here; bumping runKey re-runs the fetch and remounts the runner. That also
  // makes the retake entirely this component's business, where it used to be
  // an `attemptKey` remount driven by TrainingClient.
  const restart = () => setRunKey(k => k + 1)

  if (!session) {
    return (
      <div className="font-headline fixed inset-0 z-[70] flex items-center justify-center bg-[#F5F7FA] px-6 dark:bg-[#0A0A0A]">
        <div className="max-w-md text-center">
          {loadError ? (
            <>
              <p className="mb-4 text-sm text-[#6D7980] dark:text-[#7A8189]">{loadError}</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={restart}
                  className="rounded-xl bg-[var(--brand-primary)] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                >
                  Try Again
                </button>
                {onExit && (
                  <button
                    onClick={onExit}
                    className="rounded-xl bg-[#0A0A0A] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#262626] dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-[#E5EEF5]"
                  >
                    Back
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-[#6D7980] dark:text-[#7A8189]">Preparing your assessment…</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <QuizRunner
      key={runKey}
      title="Certificate Assessment"
      subtitle="Certification quiz — you need 80% or higher to pass."
      questions={session.questions}
      allowBack={false}
      requiresAttestation
      onSubmit={onSubmit}
      onExit={onExit}
      onResult={r => {
        if (r.passed) onPass()
      }}
      renderResult={({ result }) => <FinalResult result={result} onRetry={restart} />}
    />
  )
}

function FinalResult({ result, onRetry }: { result: QuizResult; onRetry: () => void }) {
  const card =
    'mx-auto max-w-xl rounded-3xl border bg-white p-8 shadow-[0_4px_20px_rgba(0,148,255,0.08)] dark:bg-[#0D0F12]'

  if (result.passed) {
    return (
      <div className={`${card} border-[var(--brand-primary)]/30`}>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/15">
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
    <svg className="h-6 w-6 text-[var(--brand-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
