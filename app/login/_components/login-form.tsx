'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { writeRememberCookie } from '@/lib/supabase/cookie-options'

export function LoginForm({ errorParam }: { errorParam?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState(
    errorParam === 'invalid-link' ? 'That login link has expired. Please request a new one.' : ''
  )
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // rememberMe drives the auth-cookie lifetime (30-day vs. session cookie).
    //
    // Recorded BEFORE sign-in, not after: middleware refreshes the session on
    // the very first navigation that follows, and if the companion cookie were
    // not already there that refresh would rewrite the auth cookie as
    // session-scoped and discard the choice (ix-cookiesecure).
    writeRememberCookie(rememberMe)
    const supabase = createClient(rememberMe)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Email */}
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-zinc-900">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-50"
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-zinc-900">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 pr-12 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-500 transition-opacity hover:opacity-70"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={showPassword ? '/password-eye-closed.svg' : '/password-eye-open.svg'}
              alt=""
              aria-hidden
              className="h-5 w-5"
            />
          </button>
        </div>
      </div>

      {/* Remember me + forgot password. Only the pill toggles — the bot icon and
          the label text are decorative / non-interactive by design. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex select-none items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rememberMe ? '/bot-hey-face.svg' : '/bot-huh-face.svg'}
            alt=""
            aria-hidden
            className="h-6 w-6"
          />
          {/* Pill checkbox — outline stadium that fills with liquid blue from the
              bottom on check (scaleY from origin-bottom, clipped by overflow-hidden). */}
          <button
            type="button"
            role="checkbox"
            aria-checked={rememberMe}
            aria-label="Remember you for 30 days"
            onClick={() => setRememberMe((v) => !v)}
            disabled={loading}
            className="relative inline-flex h-5 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full border border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-1 disabled:opacity-50"
          >
            <span
              aria-hidden
              className={`absolute inset-0 origin-bottom bg-[var(--brand-primary)] transition-transform duration-300 ease-out ${
                rememberMe ? 'scale-y-100' : 'scale-y-0'
              }`}
            />
          </button>
          <span className="text-sm font-extralight text-zinc-700">Remember you for 30 days?</span>
        </div>
        <Link
          href="/forgot-password"
          className="text-sm font-extralight text-[var(--brand-emphasis)] underline underline-offset-2 transition-opacity hover:opacity-80"
        >
          Forgot your password? It&apos;s okay
        </Link>
      </div>

      {/* Sign in */}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 flex w-full items-center justify-center rounded-2xl bg-[var(--brand-primary)] px-6 py-4 text-base font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
