'use client'

import { useState, useEffect } from 'react'
import type { MemberDetail } from './team-table'

interface ReassignModalProps {
  member: MemberDetail | null
  onClose: () => void
  onSuccess: (memberId: string) => void
}

export function ReassignModal({ member, onClose, onSuccess }: ReassignModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'idle' | 'loading'>('idle')
  const [error, setError] = useState('')

  // Reset form state whenever a different row opens the modal
  useEffect(() => {
    if (member) {
      setName('')
      setEmail('')
      setError('')
      setPhase('idle')
    }
  }, [member?.id])

  if (!member) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPhase('loading')
    setError('')

    try {
      const res = await fetch('/api/firm/member/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member!.id,
          newName: name.trim(),
          newEmail: email.trim().toLowerCase(),
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Reassignment failed. Please try again.')
        setPhase('idle')
        return
      }
      onSuccess(member!.id)
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
        <h2 className="text-sm font-medium text-zinc-200 mb-1">Reassign seat</h2>
        <p className="text-xs text-zinc-500 mb-5">
          Replacing{' '}
          <span className="text-zinc-400">{member.email}</span>.
          Their training history and certificates will be preserved.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">
              New employee name
            </label>
            <input
              type="text"
              required
              placeholder="Jane Smith"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={phase === 'loading'}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">
              New employee email
            </label>
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

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={phase === 'loading'}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={phase === 'loading'}
              className="flex-1 rounded-lg bg-teal-500 hover:bg-teal-400 active:bg-teal-600 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phase === 'loading' ? 'Sending invite…' : 'Confirm & send invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
