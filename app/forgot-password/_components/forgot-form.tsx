'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export function ForgotForm() {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhase('loading')
    setError('')

    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/update-password`,
    })

    if (authError) {
      setError('Something went wrong. Please try again.')
      setPhase('idle')
      return
    }

    setPhase('done')
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
          <svg
            className="h-7 w-7 text-[var(--brand-primary)]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-base font-extralight text-zinc-600">
          If <span className="font-medium text-zinc-900">{email}</span> has an account, you&apos;ll
          receive a password reset link shortly.
        </p>
        <Link
          href="/login"
          className="text-sm font-extralight text-[var(--brand-emphasis)] underline underline-offset-2 transition-opacity hover:opacity-80"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <h1 className="text-center text-3xl font-semibold text-zinc-900">Reset your password</h1>
      <p className="mt-2.5 text-center text-base font-extralight text-[#7F7F7F]">
        We&apos;ll email you a link to sign in and set a new one.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex w-full flex-col gap-6">
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          <label htmlFor="email" className="text-base font-medium text-zinc-900">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={phase === 'loading'}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={phase === 'loading'}
          className="mt-1 flex w-full items-center justify-center rounded-2xl bg-[var(--brand-primary)] px-6 py-4 text-lg font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase === 'loading' ? 'Sending…' : 'Send reset link'}
        </button>

        <Link
          href="/login"
          className="text-center text-sm font-extralight text-[var(--brand-emphasis)] underline underline-offset-2 transition-opacity hover:opacity-80"
        >
          Back to sign in
        </Link>
      </form>
    </div>
  )
}
