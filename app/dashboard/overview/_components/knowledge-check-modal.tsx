'use client'

import { useState } from 'react'
import type { ClientQuestion } from '@/lib/training/questions'

interface Props {
  lesson: number
  title: string
  questions: ClientQuestion[]
  isReadiness: boolean
  onClose: () => void
}

type Phase = 'quiz' | 'submitting' | 'result'

interface Result {
  score: number
  passed: boolean
  passThreshold: number
}

export function KnowledgeCheckModal({ lesson, title, questions, isReadiness, onClose }: Props) {
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [locked, setLocked] = useState<Record<string, number>>({})
  const [phase, setPhase] = useState<Phase>('quiz')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  const currentQ = questions[qIndex]
  const isLast = qIndex === questions.length - 1

  async function submit(finalLocked: Record<string, number>) {
    setPhase('submitting')
    setError('')
    const answers = Object.entries(finalLocked).map(([questionId, selectedIndex]) => ({
      questionId,
      selectedIndex,
    }))
    try {
      const res = await fetch('/api/training/knowledge-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson, answers }),
      })
      const data = (await res.json()) as {
        score?: number
        passed?: boolean
        passThreshold?: number
        error?: string
      }
      if (!res.ok) {
        setError(data.error ?? 'Submission failed. Please try again.')
        setPhase('quiz')
        return
      }
      setResult({
        score: data.score ?? 0,
        passed: data.passed ?? false,
        passThreshold: data.passThreshold ?? 80,
      })
      setPhase('result')
    } catch {
      setError('Network error. Please try again.')
      setPhase('quiz')
    }
  }

  function advance() {
    if (selected === null) return
    const next = { ...locked, [currentQ.id]: selected }
    setLocked(next)
    setSelected(null)
    if (isLast) {
      void submit(next)
    } else {
      setQIndex(qIndex + 1)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget && phase !== 'submitting') onClose()
      }}
    >
      <div className="font-headline w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#32C7FF]">
              Lesson {lesson} {isReadiness && '· Readiness check'}
            </p>
            <h2 className="mt-1 text-sm font-semibold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={phase === 'submitting'}
            aria-label="Close"
            className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-200 disabled:opacity-40"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {isReadiness && phase === 'quiz' && (
            <p className="mb-4 rounded-lg border border-[#32C7FF]/30 bg-[#32C7FF]/10 px-3 py-2 text-xs text-[#9BE0FF]">
              This is the readiness check — you need {result?.passThreshold ?? 80}% to clear it.
            </p>
          )}

          {phase === 'quiz' && currentQ && (
            <div>
              <p className="mb-3 text-xs text-zinc-500">
                Question {qIndex + 1} of {questions.length}
              </p>
              <p className="mb-4 text-sm font-medium leading-relaxed text-zinc-100">
                {currentQ.question_text}
              </p>
              <div className="mb-5 space-y-2">
                {currentQ.answers.map((answer, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                      selected === i
                        ? 'border-[#32C7FF] bg-[#32C7FF]/10 text-[#9BE0FF]'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {answer}
                  </button>
                ))}
              </div>
              {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
              <button
                onClick={advance}
                disabled={selected === null}
                className="rounded-lg bg-[#32C7FF] px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLast ? 'Submit' : 'Next question →'}
              </button>
            </div>
          )}

          {phase === 'submitting' && <p className="py-4 text-sm text-zinc-400">Submitting your answers…</p>}

          {phase === 'result' && result && (
            <div className="py-2">
              {result.passed ? (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#32C7FF]/20">
                      <svg className="h-5 w-5 text-[#32C7FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {isReadiness ? 'Readiness cleared' : 'Lesson cleared'} — {result.score}%
                    </p>
                  </div>
                  {!isReadiness && result.score < result.passThreshold && (
                    <p className="mb-4 text-sm text-amber-400/90">
                      Your score was on the low side — consider reviewing this lesson again. (It’s
                      still marked complete.)
                    </p>
                  )}
                  {isReadiness && (
                    <p className="mb-4 text-sm text-zinc-400">
                      You’re cleared for the final assessment.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="mb-1 text-sm font-semibold text-zinc-200">
                    Score: {result.score}% — not quite
                  </p>
                  <p className="mb-4 text-sm text-zinc-500">
                    You need {result.passThreshold}% to clear the readiness check. Review the
                    material and try again.
                  </p>
                </>
              )}
              <button
                onClick={onClose}
                className="rounded-lg bg-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-600"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
