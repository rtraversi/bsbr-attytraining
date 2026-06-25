'use client'

import { useState, useEffect } from 'react'

interface Props {
  stepInvited: boolean
  stepCertified: boolean
}

const steps = [
  { key: 'purchased', label: 'Purchase complete' },
  { key: 'invited',   label: 'Invite your team members' },
  { key: 'certified', label: 'They complete training — you\'re compliant' },
] as const

export function OnboardingChecklist({ stepInvited, stepCertified }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  const completion: Record<(typeof steps)[number]['key'], boolean> = {
    purchased: true,
    invited:   stepInvited,
    certified: stepCertified,
  }

  const allDone = stepInvited && stepCertified

  useEffect(() => {
    if (allDone) {
      setCelebrating(true)
      const t = setTimeout(() => dismiss(), 3500)
      return () => clearTimeout(t)
    }
  }, [allDone])

  async function dismiss() {
    await fetch('/api/firm/onboarding/dismiss', { method: 'POST' })
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-5">
      {celebrating ? (
        <div className="flex items-center gap-3">
          <span className="text-lg">🎉</span>
          <div>
            <p className="text-sm font-medium text-teal-400">You&apos;re compliant!</p>
            <p className="text-xs text-zinc-500">All steps complete — your team is certified.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Getting started</p>
            <button
              onClick={dismiss}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Dismiss
            </button>
          </div>

          <ol className="space-y-3">
            {steps.map((step) => {
              const done = completion[step.key]
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    done
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-zinc-700 bg-zinc-800'
                  }`}>
                    {done ? (
                      <svg className="w-3 h-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    )}
                  </span>
                  <span className={`text-sm ${done ? 'text-zinc-400 line-through decoration-zinc-600' : 'text-zinc-300'}`}>
                    {step.label}
                  </span>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </div>
  )
}
