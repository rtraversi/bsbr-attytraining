'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QuizComponent, type QuizQuestion } from './quiz-component'

type TrainingPhase =
  | 'not_started'
  | 'cert_pending'
  | 'certified'

interface Props {
  phase: TrainingPhase
  courseTitle: string
  courseId: string | null
  questions: QuizQuestion[]
  certNumber?: string
  issuedAt?: string
  expiresAt?: string
  certUrl?: string
}

export function TrainingClient({
  phase: initialPhase,
  courseTitle,
  courseId,
  questions,
  certNumber,
  issuedAt,
  expiresAt,
  certUrl,
}: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState(initialPhase)
  const [trainingConfirmed, setTrainingConfirmed] = useState(false)
  const [attemptKey, setAttemptKey] = useState(0)

  // Sync phase when server re-renders with new data (e.g. cert_pending → certified)
  useEffect(() => { setPhase(initialPhase) }, [initialPhase])

  // Auto-poll while cert is generating — stop after 60s
  useEffect(() => {
    if (phase !== 'cert_pending') return
    const interval = setInterval(() => router.refresh(), 4000)
    const timeout = setTimeout(() => clearInterval(interval), 60_000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [phase, router])

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Course header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Your training</p>
        <h1
          className="text-2xl text-white"
          style={{ fontFamily: 'var(--font-gyrotrope)' }}
        >
          {courseTitle}
        </h1>
      </div>

      {/* Rise 360 iframe placeholder — replaced with real iframe in Phase 2 */}
      <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 aspect-video flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <PlayIcon />
          </div>
          <p className="text-sm text-zinc-500">Course content coming soon</p>
          <p className="text-xs text-zinc-600 mt-1">Articulate Rise 360 course will appear here</p>
        </div>
      </div>

      {/* State-based content */}
      {phase === 'not_started' && (
        <>
          {!trainingConfirmed ? (
            /* Gate: confirm training completion before revealing quiz */
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-sm font-medium text-zinc-200 mb-1">Completed the training?</h2>
              <p className="text-sm text-zinc-500 mb-5">
                Once you have reviewed all course content above, confirm below to unlock the certification quiz.
              </p>
              <button
                onClick={() => setTrainingConfirmed(true)}
                className="rounded-lg bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                I Have Completed the Training — Begin Quiz
              </button>
            </div>
          ) : (
            /* Quiz area */
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-sm font-medium text-zinc-200 mb-1">Certification Quiz</h2>
              <p className="text-sm text-zinc-500 mb-5">
                Answer all questions, then attest your identity to submit. You need 80% or higher to pass.
                Unlimited retakes — a fresh question set each attempt.
              </p>

              {courseId ? (
                <QuizComponent
                  key={attemptKey}
                  questions={questions}
                  courseId={courseId}
                  onPass={() => setPhase('cert_pending')}
                  onRetry={() => { setAttemptKey(k => k + 1); router.refresh() }}
                />
              ) : (
                <p className="text-sm text-zinc-500">Course not yet initialized.</p>
              )}
            </div>
          )}
        </>
      )}

      {phase === 'cert_pending' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-teal-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <ClockIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">Training complete — certificate generating</p>
            <p className="text-sm text-zinc-400">
              Your compliance certificate is being generated. This usually takes less than a minute.
            </p>
          </div>
        </div>
      )}

      {phase === 'certified' && (
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <CheckIcon />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white mb-1">Certified</p>
              <p className="text-xs text-zinc-400 mb-3">
                Certificate #{certNumber} &nbsp;·&nbsp; Issued{' '}
                {issuedAt ? new Date(issuedAt).toLocaleDateString() : '—'} &nbsp;·&nbsp; Expires{' '}
                {expiresAt ? new Date(expiresAt).toLocaleDateString() : '—'}
              </p>
              {certUrl ? (
                <a
                  href={certUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors"
                >
                  Download Certificate (PDF)
                </a>
              ) : (
                <p className="text-xs text-zinc-600">Certificate PDF is being finalized.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg className="w-5 h-5 text-zinc-500 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 6v6l4 2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
