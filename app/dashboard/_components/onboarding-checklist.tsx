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
    <div className="mb-6 rounded-2xl border border-[#E5EEF5] bg-white px-6 py-5 dark:border-[#1F2429] dark:bg-[#0D0F12]">
      {celebrating ? (
        <div className="flex items-center gap-3">
          <span className="text-lg">🎉</span>
          <div>
            <p className="text-sm font-medium text-[#15803D] dark:text-[#4ADE80]">You&apos;re compliant!</p>
            <p className="text-xs text-[#8A8A8A] dark:text-[#7A8189]">
              All steps complete — your team is certified.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-[#8A8A8A] dark:text-[#7A8189]">
              Getting started
            </p>
            <button
              onClick={dismiss}
              className="text-xs text-[#8A8A8A] transition-colors hover:text-[#0A0A0A] dark:text-[#7A8189] dark:hover:text-[#F5F7FA]"
            >
              Dismiss
            </button>
          </div>

          <ol className="space-y-3">
            {steps.map((step) => {
              const done = completion[step.key]
              return (
                <li key={step.key} className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      done
                        ? 'border-[#0094FF] bg-[#0094FF]'
                        : 'border-[#E5EEF5] bg-[#F2F4F7] dark:border-[#1F2429] dark:bg-[#131A20]'
                    }`}
                  >
                    {done ? (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#C7CDD3] dark:bg-[#3A4048]" />
                    )}
                  </span>
                  <span
                    className={`text-sm ${
                      done
                        ? 'text-[#8A8A8A] line-through decoration-[#C7CDD3] dark:text-[#7A8189] dark:decoration-[#3A4048]'
                        : 'text-[#0A0A0A] dark:text-[#F5F7FA]'
                    }`}
                  >
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
