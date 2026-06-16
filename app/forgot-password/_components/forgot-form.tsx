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
      redirectTo: `${appUrl}/auth/confirm?type=recovery&next=/update-password`,
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
      <div className="text-center flex flex-col gap-3">
        <p className="text-sm text-zinc-300">
          If <span className="text-white">{email}</span> has an account, you&apos;ll receive a
          password reset link shortly.
        </p>
        <Link
          href="/login"
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
      {error && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-zinc-300">
          Account email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={phase === 'loading'}
          className="rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={phase === 'loading'}
        className="flex items-center justify-center rounded-lg bg-teal-500 hover:bg-teal-400 active:bg-teal-600 px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {phase === 'loading' ? 'Sending…' : 'Send reset link'}
      </button>

      <Link
        href="/login"
        className="text-center text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        Back to sign in
      </Link>
    </form>
  )
}
