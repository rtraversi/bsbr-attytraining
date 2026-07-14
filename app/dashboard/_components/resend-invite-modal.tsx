'use client'

import { useState } from 'react'
import { useToast } from './toast-provider'

/**
 * Quick-action tile that opens a "Resend invite" modal. Styled to match the other
 * QuickAction tiles via the `tileClassName` passed from admin-dashboard (single
 * source of truth for the tile look), so a restyle there carries here for free.
 */
export function ResendInviteAction({ tileClassName }: { tileClassName: string }) {
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={tileClassName}>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF8FF] text-[#0094FF] dark:bg-[#0094FF]/15 dark:text-[#32C7FF]">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </span>
        <span className="text-center text-base font-semibold">Resend invite</span>
      </button>

      {open && (
        <ResendInviteModal
          onClose={() => setOpen(false)}
          onSuccess={msg => {
            addToast(msg)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

function ResendInviteModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (message: string) => void
}) {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'idle' | 'loading'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPhase('loading')
    setError('')

    const submitted = email.trim().toLowerCase()

    try {
      const res = await fetch('/api/invite/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: submitted }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to resend invite. Please try again.')
        setPhase('idle')
        return
      }
      onSuccess(`Invite resent to ${submitted}`)
    } catch {
      setError('Network error. Please try again.')
      setPhase('idle')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={phase === 'idle' ? onClose : undefined}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <h2 className="mb-1 text-sm font-medium text-zinc-200">Resend invite</h2>
        <p className="mb-5 text-xs text-zinc-500">
          Send a fresh login link to a team member. Enter the email on their seat.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-zinc-500">Team member email</label>
            <input
              type="email"
              required
              placeholder="jane@yourfirm.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={phase === 'loading'}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={phase === 'loading'}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={phase === 'loading'}
              className="flex-1 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-teal-400 active:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === 'loading' ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
