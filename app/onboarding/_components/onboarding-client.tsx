'use client'

import { useState, useEffect, useCallback } from 'react'

type Phase = 'polling' | 'ready' | 'submitting' | 'done' | 'timeout' | 'error' | 'blocked'

/**
 * Why provisioning stopped. Mirrors provisioning_failures.reason (0018) — the
 * generated DB types render that column as a bare `string` because it is a
 * CHECK constraint rather than a Postgres enum, so the union is declared here
 * to keep the copy lookup exhaustive.
 */
type BlockedReason = 'duplicate' | 'email_in_use' | 'unresolved'

interface StatusResponse {
  provisioned: boolean
  email?: string
  seats?: number
  firmName?: string
  /** Set when setup stopped deliberately and waiting cannot help. */
  blocked?: boolean
  reason?: BlockedReason
}

interface CompleteResponse {
  success: boolean
  devLink?: string
}

/**
 * Copy per refusal reason. Specific rather than generic, because the only one
 * of these the customer can act on themselves is `email_in_use` — and for that
 * one, knowing the actual cause is the difference between a fixable purchase
 * and an unexplained failure.
 *
 * The other firm is never named for `email_in_use`: that would leak one
 * customer's staff roster to another, and the buyer already knows who employs
 * them.
 */
const BLOCKED_COPY: Record<BlockedReason, { heading: string; explanation: string; next: string }> = {
  email_in_use: {
    heading: 'This email is already in use',
    explanation:
      'The address you paid with is already registered to an existing IURIX account as a staff member. Each firm account needs its own email address, so we stopped rather than attaching your purchase to another account.',
    // Kept in step with emails/checkout-email-in-use.tsx — the same person
    // reads both about the same payment, and they must not disagree.
    next: 'We have cancelled the subscription and your payment is being refunded. Purchasing again with a different email address will work.',
  },
  duplicate: {
    heading: 'You already have an active account',
    explanation:
      'This email already owns an active IURIX subscription, so this second purchase would have billed you twice for the same thing. We stopped it and cancelled the new subscription — your existing account and its certificates are untouched.',
    next: 'Sign in with this email to reach your dashboard. Get in touch about the payment just taken and we will put it right.',
  },
  unresolved: {
    heading: "We couldn't finish setting up your account",
    explanation:
      'Something went wrong on our side while creating your account. This is not a problem with your payment or your card.',
    next: 'Our team has been alerted and is looking into it. Get in touch and we will get you set up.',
  },
}

export function OnboardingClient({ sessionId }: { sessionId: string }) {
  const [phase, setPhase] = useState<Phase>('polling')
  const [email, setEmail] = useState('')
  const [seats, setSeats] = useState(1)
  const [firmName, setFirmName] = useState('')
  const [enrollSelf, setEnrollSelf] = useState(false)
  const [devLink, setDevLink] = useState<string | undefined>()
  const [errorMsg, setErrorMsg] = useState('')
  const [blockedReason, setBlockedReason] = useState<BlockedReason>('unresolved')

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
          // Stop on the first blocked response rather than burning the
          // remaining attempts. Setup was refused, so no further poll can
          // change the answer and every extra spinner second is a lie.
          if (data.blocked) {
            setBlockedReason(data.reason ?? 'unresolved')
            setPhase('blocked')
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

  // ── Blocked ───────────────────────────────────────────────────────────────
  // Setup was refused, not delayed. Deliberately no Refresh button: refreshing
  // cannot produce a firm that was never going to be created, and offering it
  // is what made the old timeout screen dishonest.

  if (phase === 'blocked') {
    const copy = BLOCKED_COPY[blockedReason]
    return (
      <div className="flex flex-col gap-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              stroke="#B45309"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-zinc-900">{copy.heading}</h1>

        {/* Said plainly and first: the money left their account. Leading with
            anything else reads as evasion. */}
        <p className="text-base font-extralight text-zinc-700">
          Your payment went through, but we couldn&apos;t finish setting up your account.
        </p>

        <p className="text-base font-extralight text-zinc-700">{copy.explanation}</p>

        <p className="text-base font-extralight text-zinc-700">{copy.next}</p>

        <a
          href="mailto:solarsaiko@gmail.com"
          className="mx-auto rounded-xl bg-[#32C7FF] px-6 py-3 text-sm font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90"
        >
          Contact support
        </a>

        <p className="text-sm font-extralight text-[#7F7F7F]">
          Quote reference <span className="font-medium text-zinc-700">{sessionId}</span> and
          we&apos;ll find your payment straight away.
        </p>
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
