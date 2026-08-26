'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Phase = 'polling' | 'ready' | 'submitting' | 'timeout' | 'error' | 'blocked'

/**
 * Why provisioning stopped. Mirrors provisioning_failures.reason (0018) — the
 * generated DB types render that column as a bare `string` because it is a
 * CHECK constraint rather than a Postgres enum, so the union is declared here
 * to keep the copy lookup exhaustive.
 */
type BlockedReason = 'duplicate' | 'email_in_use' | 'unresolved' | 'non_us_billing'

interface StatusResponse {
  provisioned: boolean
  email?: string
  seats?: number
  /** Set when setup stopped deliberately and waiting cannot help. */
  blocked?: boolean
  reason?: BlockedReason
}

interface CompleteResponse {
  success: boolean
  /** False when the password was set but the follow-up sign-in did not take. */
  signedIn?: boolean
  /** Where to send the browser: /intake normally, /login if sign-in failed. */
  next?: string
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
  non_us_billing: {
    heading: 'IURIX is available to US firms only',
    explanation:
      'The billing address on this purchase is outside the United States. We keep all training and certification data within the US and are not set up to handle international data transfers, so we stopped rather than take on an obligation we cannot meet properly.',
    // Kept in step with emails/checkout-non-us.tsx — the same person reads both
    // about the same payment, and they must not disagree. No "try again":
    // unlike email_in_use there is nothing the buyer can change, and offering a
    // retry that fails identically is worse than one clear no.
    next: 'We have cancelled the subscription and your payment is being refunded. If your firm is US-based and this address is wrong, get in touch and we will sort it out.',
  },
  unresolved: {
    heading: "We couldn't finish setting up your account",
    explanation:
      'Something went wrong on our side while creating your account. This is not a problem with your payment or your card.',
    next: 'Our team has been alerted and is looking into it. Get in touch and we will get you set up.',
  },
}

export function OnboardingClient({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('polling')
  // The address the purchase was made with, from Stripe. Rendered read-only —
  // the buyer CONFIRMS it, they do not choose it. See the route's header for
  // why an editable field here would bypass every provisioning guard at once.
  const [email, setEmail] = useState('')
  const [seats, setSeats] = useState(1)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.')
      setPhase('error')
      return
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.')
      setPhase('error')
      return
    }

    setPhase('submitting')
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The email is sent back for the server to CONFIRM against Stripe, not
        // for the buyer to choose. It is read-only in the form above.
        body: JSON.stringify({ session_id: sessionId, email, password }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Request failed')
      }
      const data = (await res.json()) as CompleteResponse

      // Straight into the intake, signed in, with no email in the path at all.
      // router.refresh() first so the new session cookie is picked up before
      // the gate on /dashboard ever sees this browser.
      router.refresh()
      router.push(data.next ?? '/intake')
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

        {/* The real business address (cutover item C4, ix-supportdest). This is
            the only route open to someone whose provisioning was refused: they
            have no account, so the in-app support form is unreachable. */}
        <a
          href="mailto:info@iurixaccreditation.com"
          className="mx-auto rounded-xl bg-[var(--brand-primary)] px-6 py-3 text-sm font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90"
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
          className="rounded-xl bg-[var(--brand-primary)] px-6 py-3 text-sm font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90"
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
          Choose a password and you are straight in. We will not email you a link.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex w-full flex-col gap-6">
          {/* Seats purchased — read-only, from the Stripe session. */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-500">Seats purchased</span>
              <span className="text-sm font-medium text-zinc-900">
                {seats} {seats === 1 ? 'user' : 'users'}
              </span>
            </div>
          </div>

          {/*
            🔴 READ-ONLY, DELIBERATELY. This field CONFIRMS the address the
            purchase was made with; it does not choose one. Making it editable
            would let a buyer refused as duplicate or email_in_use simply type a
            different address and take the account anyway — the guards from
            migrations 0018 and 0022 all key on the PAYING email. The server
            re-checks it against Stripe regardless, so this is the second lock,
            not the only one.
          */}
          <div className="flex flex-col gap-2.5">
            <label htmlFor="account-email" className="text-base font-medium text-zinc-900">
              Account email
            </label>
            <input
              id="account-email"
              type="email"
              value={email}
              readOnly
              aria-readonly
              tabIndex={-1}
              className="cursor-default rounded-xl border border-zinc-200 bg-zinc-100 px-5 py-4 text-base text-zinc-500"
            />
            <p className="text-sm font-extralight text-zinc-500">
              The address you paid with. This is how you sign in.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <label htmlFor="password" className="text-base font-medium text-zinc-900">
              Choose a password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={phase === 'submitting'}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-50"
            />
            <p className="text-sm font-extralight text-zinc-500">At least 8 characters.</p>
          </div>

          <div className="flex flex-col gap-2.5">
            <label htmlFor="confirm-password" className="text-base font-medium text-zinc-900">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={phase === 'submitting'}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={phase === 'submitting' || password.length < 8 || password !== confirm}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-primary)] px-6 py-4 text-lg font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === 'submitting' ? (
              <>
                <Spinner size="sm" className="text-white" /> Setting up&hellip;
              </>
            ) : (
              'Set password & continue'
            )}
          </button>
        </form>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <p className="text-base text-red-600">{errorMsg}</p>
      <button
        onClick={() => setPhase('ready')}
        className="rounded-xl bg-[var(--brand-primary)] px-6 py-3 text-sm font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90"
      >
        Try again
      </button>
    </div>
  )
}

// There is no 'done' phase any more. Success navigates straight to /intake with
// a live session, so the screen that used to say "we sent you a link" — and the
// devLink panel that propped it up in development — have nothing left to say.

// ── Tiny helpers ─────────────────────────────────────────────────────────────

function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-8 h-8'
  return (
    <svg
      className={`${cls} animate-spin ${className || 'text-[var(--brand-primary)]'}`}
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
