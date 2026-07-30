'use client'

import type { ClientQuestion } from '@/lib/training/questions'
import { QuizRunner, type QuizAnswer, type QuizResult } from '@/app/dashboard/_components/quiz-runner'
import { ClearedFlagIcon } from '@/app/dashboard/_components/cleared-flag-icon'

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
    /* Clearing a lesson is the one genuine achievement in this flow, and it used
       to be announced by a small flat card pinned to the top of the screen. This
       is the moment version: the same green pennant that marks a cleared lesson
       on the Quizzes "Your path" map gets planted, so the celebration is
       visually continuous with the map the learner has been climbing (Max's
       steer) rather than being a separate piece of iconography. */
    return (
      <div
        className="kc-card mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-[#32C7FF]/30 bg-white px-8 py-12 text-center shadow-[0_10px_44px_-12px_rgba(50,199,255,0.45)] md:px-12 md:py-14 dark:bg-[#0D0F12]"
      >
        <KcCelebrationStyles />

        {/* The pennant plants onto a ground shadow. `items-end` anchors the
            icon's bottom edge — where the pole's foot sits — to the ground line,
            so scaling from that origin reads as planting rather than growing. */}
        <div className="relative mb-7 flex h-28 w-28 items-end justify-center">
          <span aria-hidden className="kc-burst absolute inset-0 rounded-full bg-[#22C55E]/15" />
          <span
            aria-hidden
            className="absolute bottom-0 left-1/2 h-2 w-16 -translate-x-1/2 rounded-full bg-[#22C55E]/25 blur-[3px]"
          />
          <ClearedFlagIcon className="kc-flag relative h-24 w-24" />
        </div>

        <p className="kc-rise kc-d1 text-xs font-bold tracking-[0.22em] text-[#22C55E] uppercase">
          {isReadiness ? 'Readiness cleared' : 'Lesson cleared'}
        </p>
        <p className="kc-rise kc-d2 mt-3 text-6xl leading-none font-bold text-[#0A0A0A] md:text-7xl dark:text-[#F5F7FA]">
          {result.score}
          <span className="text-[0.45em] align-top">%</span>
        </p>

        {!isReadiness && result.score < result.passThreshold && (
          <p className="kc-rise kc-d3 mt-5 max-w-sm text-sm text-[#B45309] dark:text-[#F0B357]">
            Your score was on the low side — consider reviewing this lesson again. (It’s still marked
            complete.)
          </p>
        )}
        {isReadiness && (
          <p className="kc-rise kc-d3 mt-5 max-w-sm text-sm text-[#6D7980] dark:text-[#7A8189]">
            You’re cleared for the Certificate Assessment.
          </p>
        )}

        <div className="kc-rise kc-d4 mt-8">
          <DoneButton onClick={onDone} />
        </div>
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

/**
 * Scoped keyframes for the cleared-lesson celebration.
 *
 * Shipped with the card rather than added to the Quizzes page's QuizStyles: this
 * modal is opened from Overview, Quizzes AND Training, and only one of those
 * mounts QuizStyles — the animation would silently do nothing on the other two.
 *
 * prefers-reduced-motion degrades to the finished state (visible, planted, in
 * place), never to nothing — the card must still read as a celebration when the
 * motion is switched off.
 */
function KcCelebrationStyles() {
  return (
    <style>{`
      @keyframes kcCard  { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
      /* Plants from the pole's foot: bottom-centre origin, so the scale reads as
         driving the flag into the ground rather than inflating it in place. */
      @keyframes kcPlant {
        0%   { opacity: 0; transform: translateY(-14px) scale(0.4) rotate(-14deg); }
        60%  { opacity: 1; transform: translateY(0) scale(1.12) rotate(4deg); }
        80%  { transform: scale(0.97) rotate(-2deg); }
        100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
      }
      @keyframes kcBurst { 0% { opacity: 0.9; transform: scale(0.35); } 100% { opacity: 0; transform: scale(1.5); } }
      @keyframes kcRise  { to { opacity: 1; transform: translateY(0); } }

      .kc-card  { animation: kcCard 0.4s cubic-bezier(.2,.7,.3,1) both; }
      .kc-flag  { transform-origin: bottom center; animation: kcPlant 0.7s cubic-bezier(.25,1.4,.4,1) 0.12s both; }
      .kc-burst { animation: kcBurst 0.9s cubic-bezier(.2,.7,.3,1) 0.42s both; }
      .kc-rise  { opacity: 0; transform: translateY(10px); animation: kcRise 0.45s cubic-bezier(.2,.7,.3,1) both; }
      .kc-d1 { animation-delay: 0.46s; }
      .kc-d2 { animation-delay: 0.56s; }
      .kc-d3 { animation-delay: 0.66s; }
      .kc-d4 { animation-delay: 0.76s; }

      @media (prefers-reduced-motion: reduce) {
        .kc-card, .kc-flag, .kc-rise { animation: none; opacity: 1; transform: none; }
        /* The burst is purely motion — with nothing to animate it would sit
           there as a static disc, so it is removed rather than frozen. */
        .kc-burst { animation: none; opacity: 0; }
      }
    `}</style>
  )
}
