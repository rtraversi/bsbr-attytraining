'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QuizComponent, type QuizQuestion } from './quiz-component'
import { ScormContent } from './scorm-content'
import { CertPreviewModal } from '@/app/dashboard/_components/cert-preview-modal'

type TrainingPhase =
  | 'not_started'
  | 'cert_pending'
  | 'certified'

interface Props {
  phase: TrainingPhase
  courseTitle: string
  courseId: string | null
  questions: QuizQuestion[]
  /** Lesson checks 1–5 cleared (derived server-side from knowledge_check_completed events). */
  checksCleared: boolean
  /** SCORM course reported completion (verified — a video_completed event exists). */
  contentViewed: boolean
  certId?: string
  certNumber?: string
  issuedAt?: string
  expiresAt?: string
  certUrl?: string
  employeeName?: string
}

export function TrainingClient({
  phase: initialPhase,
  courseTitle,
  courseId,
  questions,
  checksCleared,
  contentViewed,
  certId,
  certNumber,
  issuedAt,
  expiresAt,
  employeeName,
}: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState(initialPhase)
  const [attemptKey, setAttemptKey] = useState(0)
  const [certModalOpen, setCertModalOpen] = useState(false)
  // Set only when the employee explicitly exits the assessment overlay. The gate
  // itself is never re-locked — this just lets them get back to the course content.
  const [quizDismissed, setQuizDismissed] = useState(false)

  // Sync phase when server re-renders with new data (e.g. cert_pending → certified)
  useEffect(() => { setPhase(initialPhase) }, [initialPhase])

  // Auto-poll while cert is generating — stop after 60s
  useEffect(() => {
    if (phase !== 'cert_pending') return
    const interval = setInterval(() => router.refresh(), 4000)
    const timeout = setTimeout(() => clearInterval(interval), 60_000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [phase, router])

  const gatesOpen = checksCleared && contentViewed
  const showQuiz = phase === 'not_started' && gatesOpen && !!courseId && !quizDismissed

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

      {/* The course itself — always mounted, always replayable. Completion is
          reported by the SCORM driver, never self-attested. */}
      <ScormContent
        onCompleted={() => router.refresh()}
        className="mb-8"
      />

      {/* State-based content */}
      {phase === 'not_started' && (
        <>
          {showQuiz && courseId && (
            /* Both gates cleared → full-screen certification quiz, no click required */
            <QuizComponent
              key={attemptKey}
              questions={questions}
              courseId={courseId}
              onPass={() => setPhase('cert_pending')}
              onRetry={() => { setAttemptKey(k => k + 1); router.refresh() }}
              onExit={() => setQuizDismissed(true)}
            />
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-sm font-medium text-zinc-200 mb-3">
              {gatesOpen ? 'Ready for your final assessment' : 'Before the final assessment'}
            </h2>

            <p className="text-sm text-zinc-400">
              Training content:{' '}
              <span className={contentViewed ? 'text-teal-400' : 'text-zinc-500'}>
                {contentViewed ? 'Complete' : 'In progress'}
              </span>
              {' · '}
              Lesson checks:{' '}
              <span className={checksCleared ? 'text-teal-400' : 'text-zinc-500'}>
                {checksCleared ? 'Complete' : 'Not yet'}
              </span>
            </p>

            {!contentViewed && (
              <p className="mt-3 text-sm text-zinc-500">
                Work through the course above. It marks itself complete automatically.
              </p>
            )}

            {!checksCleared && (
              <p className="mt-3 text-sm text-zinc-500">
                Complete your lesson checks on the{' '}
                <Link
                  href="/dashboard/quizzes"
                  className="text-teal-400 underline underline-offset-2 hover:text-teal-300"
                >
                  Quizzes
                </Link>{' '}
                tab.
              </p>
            )}

            {gatesOpen && !courseId && (
              <p className="mt-3 text-sm text-zinc-500">Course not yet initialized.</p>
            )}

            {gatesOpen && courseId && quizDismissed && (
              <button
                onClick={() => setQuizDismissed(false)}
                className="mt-5 rounded-lg bg-teal-500 hover:bg-teal-400 active:bg-teal-600 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors"
              >
                Resume Final Assessment
              </button>
            )}
          </div>
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
        <>
          {certModalOpen && certId && (
            <CertPreviewModal
              certId={certId}
              certNumber={certNumber ?? null}
              employeeName={employeeName ?? ''}
              issuedAt={issuedAt ?? null}
              expiresAt={expiresAt ?? null}
              onClose={() => setCertModalOpen(false)}
            />
          )}
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
                {certId ? (
                  <button
                    onClick={() => setCertModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors"
                  >
                    Download Certificate (PDF)
                  </button>
                ) : (
                  <p className="text-xs text-zinc-600">Certificate PDF is being finalized.</p>
                )}
              </div>
            </div>
            <p className="mt-5 text-xs text-zinc-600 leading-relaxed border-t border-teal-500/10 pt-4">
              This certificate documents completion of training. It is not legal advice and does not
              constitute accreditation by the ABA or any state bar.
            </p>
          </div>
        </>
      )}
    </div>
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
