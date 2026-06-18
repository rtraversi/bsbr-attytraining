'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface QuizQuestion {
  id: string
  question_text: string
  answers: string[]
}

interface Props {
  questions: QuizQuestion[]
  courseId: string
  onPass: () => void
}

export function QuizComponent({ questions, courseId, onPass }: Props) {
  const router = useRouter()
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [locked, setLocked] = useState<Record<string, number>>({})
  const [attested, setAttested] = useState(false)
  const [phase, setPhase] = useState<'quiz' | 'attestation' | 'submitting' | 'result'>('quiz')
  const [result, setResult] = useState<{ passed: boolean; score: number; passThreshold: number } | null>(null)
  const [error, setError] = useState('')

  const currentQ = questions[qIndex]

  const advance = () => {
    if (selected === null) return
    const newLocked = { ...locked, [currentQ.id]: selected }
    setLocked(newLocked)
    setSelected(null)
    if (qIndex < questions.length - 1) {
      setQIndex(qIndex + 1)
    } else {
      setPhase('attestation')
    }
  }

  const submit = async () => {
    if (!attested) return
    setPhase('submitting')
    setError('')

    const answers = Object.entries(locked).map(([questionId, selectedIndex]) => ({
      questionId,
      selectedIndex,
    }))

    try {
      const res = await fetch('/api/quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, answers, attestation: true }),
      })
      const data = (await res.json()) as {
        passed?: boolean
        score?: number
        passThreshold?: number
        error?: string
      }

      if (!res.ok) {
        setError(data.error ?? 'Submission failed. Please try again.')
        setPhase('attestation')
        return
      }

      const quizResult = {
        passed: data.passed ?? false,
        score: data.score ?? 0,
        passThreshold: data.passThreshold ?? 80,
      }
      setResult(quizResult)
      setPhase('result')
      if (quizResult.passed) onPass()
    } catch {
      setError('Network error. Please try again.')
      setPhase('attestation')
    }
  }

  if (questions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Quiz questions are not yet loaded. Run <code className="text-xs bg-zinc-800 px-1 py-0.5 rounded">supabase db push</code> then refresh.
      </p>
    )
  }

  if (phase === 'quiz') {
    return (
      <div>
        <p className="text-xs text-zinc-500 mb-4">
          Question {qIndex + 1} of {questions.length}
        </p>
        <p className="text-sm font-medium text-zinc-100 mb-4 leading-relaxed">
          {currentQ.question_text}
        </p>
        <div className="space-y-2 mb-6">
          {currentQ.answers.map((answer, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors ${
                selected === i
                  ? 'border-teal-500 bg-teal-500/10 text-teal-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
              }`}
            >
              {answer}
            </button>
          ))}
        </div>
        <button
          onClick={advance}
          disabled={selected === null}
          className="rounded-lg bg-teal-500 hover:bg-teal-400 active:bg-teal-600 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {qIndex < questions.length - 1 ? 'Next Question →' : 'Review & Submit'}
        </button>
      </div>
    )
  }

  if (phase === 'attestation') {
    return (
      <div>
        <p className="text-sm font-medium text-zinc-200 mb-1">Almost done</p>
        <p className="text-sm text-zinc-500 mb-5">
          You have answered all {questions.length} questions. Check the box below to confirm and submit.
        </p>
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={attested}
            onChange={e => setAttested(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-teal-500"
          />
          <span className="text-sm text-zinc-300 leading-relaxed">
            I confirm that I personally completed this training and that the answers above are my own.
          </span>
        </label>
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
        <button
          onClick={submit}
          disabled={!attested}
          className="rounded-lg bg-teal-500 hover:bg-teal-400 active:bg-teal-600 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Quiz
        </button>
      </div>
    )
  }

  if (phase === 'submitting') {
    return <p className="text-sm text-zinc-400">Submitting your answers…</p>
  }

  // result phase
  if (result?.passed) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <CheckIcon />
        </div>
        <div>
          <p className="text-sm font-medium text-white mb-1">
            Passed — {Math.round(result.score)}%
          </p>
          <p className="text-sm text-zinc-400">
            Your certificate is being generated. This page will update automatically.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm font-medium text-zinc-200 mb-1">
        Score: {Math.round(result?.score ?? 0)}% — not quite
      </p>
      <p className="text-sm text-zinc-500 mb-5">
        You need {result?.passThreshold ?? 80}% to pass. Take your time reviewing the material and try again.
      </p>
      <button
        onClick={() => router.refresh()}
        className="rounded-lg bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
