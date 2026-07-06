'use client'

import { useState, useEffect, useCallback } from 'react'

type Phase = 'polling' | 'ready' | 'submitting' | 'done' | 'timeout' | 'error'

interface StatusResponse {
  provisioned: boolean
  email?: string
  seats?: number
  firmName?: string
}

interface CompleteResponse {
  success: boolean
  devLink?: string
}

export function OnboardingClient({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = useState<Phase>('polling')
  const [email, setEmail] = useState('')
  const [seats, setSeats] = useState(1)
  const [firmName, setFirmName] = useState('')
  const [enrollSelf, setEnrollSelf] = useState(false)
  const [devLink, setDevLink] = useState<string | undefined>()
  const [errorMsg, setErrorMsg] = useState('')

  const pollStatus = useCallback(async () => {
    let attempts = 0
    const maxAttempts = 10

    const tick = async () => {
      attempts++
      try {
        const res = await fetch(`/api/onboarding/status?session_id=${sessionId}`)
        if (res.ok) {
          const data = (await res.json()) as StatusResponse
          if (data.provisioned) {
            setEmail(data.email ?? '')
            setSeats(data.seats ?? 1)
            setFirmName(data.firmName === 'My Firm' ? '' : (data.firmName ?? ''))
            setPhase('ready')
            return
          }
        }
      } catch {
        // network hiccup — keep polling
      }

      if (attempts >= maxAttempts) {
        setPhase('timeout')
        return
      }
      setTimeout(tick, 1500)
    }

    await tick()
  }, [sessionId])

  useEffect(() => {
    pollStatus()
  }, [pollStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firmName.trim()) return

    setPhase('submitting')
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, firm_name: firmName, enroll_self: enrollSelf }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Request failed')
      }
      const data = (await res.json()) as CompleteResponse
      setDevLink(data.devLink)
      setPhase('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.')
      setPhase('error')
    }
  }

  // ── Polling ───────────────────────────────────────────────────────────────

  if (phase === 'polling') {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <Spinner />
        <p className="text-base font-extralight text-zinc-600">Confirming your payment…</p>
      </div>
    )
  }

  if (phase === 'timeout') {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-base font-extralight text-zinc-700">
          Payment confirmed but setup is taking a moment. Please refresh the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-[#32C7FF] px-6 py-3 text-sm font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90"
        >
          Refresh
        </button>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  if (phase === 'ready' || phase === 'submitting') {
    return (
      <div className="flex flex-col">
        <h1 className="text-center text-3xl font-semibold text-zinc-900">Set up your account</h1>
        <p className="mt-2.5 text-center text-base font-extralight text-[#7F7F7F]">
          One last step before your team can start training.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex w-full flex-col gap-6">
          {/* Read-only purchase summary */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-500">Account email</span>
              <span className="truncate text-sm font-medium text-zinc-900">{email}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-500">Seats purchased</span>
              <span className="text-sm font-medium text-zinc-900">
                {seats} {seats === 1 ? 'user' : 'users'}
              </span>
            </div>
          </div>

          {/* Firm name */}
          <div className="flex flex-col gap-2.5">
            <label htmlFor="firm-name" className="text-base font-medium text-zinc-900">
              What&apos;s your firm name?
            </label>
            <input
              id="firm-name"
              type="text"
              required
              maxLength={120}
              placeholder="Smith & Associates LLC"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              disabled={phase === 'submitting'}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#32C7FF] disabled:opacity-50"
            />
          </div>

          {/* Enroll-self */}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={enrollSelf}
              onChange={(e) => setEnrollSelf(e.target.checked)}
              disabled={phase === 'submitting'}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-zinc-300 accent-[#32C7FF] focus:ring-2 focus:ring-[#32C7FF] disabled:opacity-50"
            />
            <span className="text-sm font-extralight text-zinc-700">
              I am also taking this training{' '}
              <span className="text-zinc-400">
                (uses 1 of your {seats} {seats === 1 ? 'seat' : 'seats'})
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={phase === 'submitting' || !firmName.trim()}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#32C7FF] px-6 py-4 text-lg font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === 'submitting' ? (
              <>
                <Spinner size="sm" className="text-white" /> Setting up…
              </>
            ) : (
              'Complete setup & get login link'
            )}
          </button>
        </form>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-base text-red-600">{errorMsg}</p>
        <button
          onClick={() => setPhase('ready')}
          className="rounded-xl bg-[#32C7FF] px-6 py-3 text-sm font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90"
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#32C7FF]/10">
        <CheckIcon />
      </div>
      <div>
        <p className="text-xl font-semibold text-zinc-900">You&apos;re all set.</p>
        <p className="mt-1.5 text-base font-extralight text-zinc-600">
          We sent a sign-in link to <span className="font-medium text-zinc-900">{email}</span>.
          Click it to access your dashboard.
        </p>
      </div>
      {devLink && (
        <div className="mt-2 w-full rounded-xl border border-amber-300 bg-amber-50 p-3 text-left">
          <p className="mb-1 font-mono text-xs text-amber-700">DEV — magic link (email not sent):</p>
          <a
            href={devLink}
            className="break-all text-xs text-amber-700 underline hover:text-amber-800"
          >
            {devLink}
          </a>
        </div>
      )}
    </div>
  )
}

// ── Tiny helpers ─────────────────────────────────────────────────────────────

function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-8 h-8'
  return (
    <svg
      className={`${cls} animate-spin ${className || 'text-[#32C7FF]'}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="w-7 h-7 text-[#32C7FF]"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
