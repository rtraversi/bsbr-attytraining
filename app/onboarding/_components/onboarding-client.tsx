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
      <div className="flex flex-col items-center gap-4 text-center">
        <Spinner />
        <p className="text-sm text-zinc-400">Confirming your payment&hellip;</p>
      </div>
    )
  }

  if (phase === 'timeout') {
    return (
      <div className="text-center">
        <p className="text-sm text-zinc-300 mb-4">
          Payment confirmed but setup is taking a moment. Please refresh the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm underline text-zinc-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  if (phase === 'ready' || phase === 'submitting') {
    return (
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
        <div>
          <p className="text-sm text-zinc-400 mb-1">Account email</p>
          <p className="text-sm font-medium text-zinc-200">{email}</p>
        </div>

        <div>
          <p className="text-sm text-zinc-400 mb-1">
            Seats purchased
          </p>
          <p className="text-sm font-medium text-zinc-200">
            {seats} {seats === 1 ? 'user' : 'users'}
          </p>
        </div>

        <div className="border-t border-zinc-700 pt-5">
          <label htmlFor="firm-name" className="block text-sm text-zinc-300 mb-2">
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
            className="
              w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5
              text-sm text-white placeholder:text-zinc-500
              focus:outline-none focus:ring-2 focus:ring-teal-500
              disabled:opacity-50
            "
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enrollSelf}
            onChange={(e) => setEnrollSelf(e.target.checked)}
            disabled={phase === 'submitting'}
            className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-teal-500 focus:ring-teal-500 focus:ring-offset-zinc-900"
          />
          <span className="text-sm text-zinc-300">
            I am also taking this training{' '}
            <span className="text-zinc-500">(uses 1 of your {seats} {seats === 1 ? 'seat' : 'seats'})</span>
          </span>
        </label>

        <button
          type="submit"
          disabled={phase === 'submitting' || !firmName.trim()}
          className="
            flex items-center justify-center gap-2 rounded-lg
            bg-teal-500 hover:bg-teal-400 active:bg-teal-600
            px-6 py-3 text-sm font-semibold text-zinc-950
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {phase === 'submitting' ? (
            <>
              <Spinner size="sm" /> Setting up&hellip;
            </>
          ) : (
            'Complete setup & get login link'
          )}
        </button>
      </form>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <div className="text-center">
        <p className="text-sm text-red-400 mb-4">{errorMsg}</p>
        <button
          onClick={() => setPhase('ready')}
          className="text-sm underline text-zinc-400 hover:text-white transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Done ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-teal-500/15 flex items-center justify-center">
        <CheckIcon />
      </div>
      <div>
        <p className="text-base font-medium text-white mb-1">You&apos;re all set.</p>
        <p className="text-sm text-zinc-400">
          We sent a sign-in link to <span className="text-zinc-200">{email}</span>.
          Click it to access your dashboard.
        </p>
      </div>
      {devLink && (
        <div className="mt-2 w-full rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-left">
          <p className="text-xs text-yellow-400 mb-1 font-mono">DEV — magic link (email not sent):</p>
          <a
            href={devLink}
            className="text-xs text-yellow-300 break-all underline hover:text-yellow-200"
          >
            {devLink}
          </a>
        </div>
      )}
    </div>
  )
}

// ── Tiny helpers ─────────────────────────────────────────────────────────────

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-8 h-8'
  return (
    <svg
      className={`${cls} animate-spin text-teal-400`}
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
      className="w-6 h-6 text-teal-400"
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
