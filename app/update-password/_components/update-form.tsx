'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Password input with its own independent show/hide eye toggle. `children` slot
// renders directly under the input (used for the strength row below the new
// password field).
function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled: boolean
  children?: React.ReactNode
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={id} className="text-base font-medium text-zinc-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          minLength={8}
          autoComplete="new-password"
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 pr-14 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#32C7FF] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 flex items-center pr-5 text-zinc-500 transition-opacity hover:opacity-70"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={show ? '/password-eye-closed.svg' : '/password-eye-open.svg'}
            alt=""
            aria-hidden
            className="h-6 w-6"
          />
        </button>
      </div>
      {children}
    </div>
  )
}

export function UpdatePasswordForm({
  email,
  initialName = '',
}: {
  email: string
  initialName?: string
}) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialName)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // v1 strength: the existing 8-char minimum is treated as "strong enough".
  const isStrong = password.length >= 8

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = fullName.trim()
    if (!trimmedName) {
      setError('Please enter your full name.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    // Name and password in ONE call, deliberately. `data` writes user_metadata —
    // never app_metadata, which holds firm_id/role and is security-sensitive.
    //
    // Atomic with the password write: a separate follow-up call could fail after
    // the password had already changed, leaving no way to report it (we navigate
    // away) and the person nameless again. This is also exactly how Settings
    // already persists this same field, so the two paths behave identically.
    //
    // app/api/certs/generate reads user_metadata.full_name for employeeName, so
    // certificates and the delivery email pick this up with no further change.
    const { error: authError } = await supabase.auth.updateUser({
      password,
      data: { full_name: trimmedName },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Activate the firm_members row — non-fatal if it fails (admin can see invited status)
    await fetch('/api/auth/activate', { method: 'POST' }).catch(() => {})

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-7">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Account email — read-only, reassures the person whose account this is */}
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
      </div>

      {/* Full name — this screen is the first thing every invited employee sees,
          and until now nothing ever asked. Without it user_metadata.full_name is
          only set when an admin typed it at invite time, so certificates and
          emails fell back to the raw email address — which is what ends up on the
          firm's compliance record. Editable later in Settings. */}
      <div className="flex flex-col gap-2.5">
        <label htmlFor="full-name" className="text-base font-medium text-zinc-900">
          Your full name
        </label>
        <input
          id="full-name"
          type="text"
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
          placeholder="Jane Marsh"
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#32C7FF] disabled:opacity-50"
        />
        <p className="text-sm font-extralight text-zinc-500">
          This is the name printed on your compliance certificate.
        </p>
      </div>

      {/* New password + strength-reactive bot */}
      <PasswordField
        id="password"
        label="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      >
        <div className="mt-1.5 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isStrong ? '/bot-hey-face.svg' : '/bot-huh-face.svg'}
            alt=""
            aria-hidden
            className="h-7 w-7"
          />
          <span
            className={`text-sm font-extralight ${isStrong ? 'text-[#0094FF]' : 'text-zinc-500'}`}
          >
            {isStrong ? 'Strong enough.' : 'Use at least 8 characters.'}
          </span>
        </div>
      </PasswordField>

      {/* Confirm password */}
      <PasswordField
        id="confirm"
        label="Confirm password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={loading}
      />

      <button
        type="submit"
        disabled={loading}
        className="mt-1 flex w-full items-center justify-center rounded-2xl bg-[#32C7FF] px-6 py-4 text-lg font-bold text-white transition-[filter] hover:brightness-95 active:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Set & continue'}
      </button>
    </form>
  )
}
