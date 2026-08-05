'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Offered to an admin who declined training at onboarding. Claiming a seat is a
 * billable act, so the seat cost is stated on the button itself rather than
 * buried in the surrounding copy.
 */
export function EnrollSelfButton() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setStatus('saving')
    setError(null)
    try {
      const res = await fetch('/api/firm/enroll-self', { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        setError(body.error ?? 'Something went wrong. Please try again.')
        setStatus('idle')
        return
      }

      // The gate lives in a Server Component, so a refresh is what actually
      // reveals the course — don't clear `saving` first or the button flickers
      // back to idle while the server round-trip is still in flight.
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('idle')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'saving'}
        className="cursor-pointer rounded-xl bg-[var(--brand-emphasis)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0083E0] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 disabled:cursor-default disabled:opacity-60"
      >
        {status === 'saving' ? 'Enrolling…' : 'Enroll me (uses 1 seat)'}
      </button>
      {error ? (
        <p className="mt-3 text-sm text-[#DC2626]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
