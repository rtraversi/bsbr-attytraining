'use client'

import { useState, useEffect } from 'react'
import type { MemberDetail } from './team-table'
import { useToast } from './toast-provider'

interface ReassignModalProps {
  member: MemberDetail | null
  onClose: () => void
  onSuccess: (memberId: string) => void
}

export function ReassignModal({ member, onClose, onSuccess }: ReassignModalProps) {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'idle' | 'loading' | 'success'>('idle')
  const [confirmedName, setConfirmedName] = useState('')
  const [confirmedEmail, setConfirmedEmail] = useState('')
  const [error, setError] = useState('')

  // Reset form state whenever a different row opens the modal
  useEffect(() => {
    if (member) {
      setName('')
      setEmail('')
      setError('')
      setPhase('idle')
      setConfirmedName('')
      setConfirmedEmail('')
    }
  }, [member?.id])

  if (!member) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPhase('loading')
    setError('')

    const submittedName = name.trim()
    const submittedEmail = email.trim().toLowerCase()

    try {
      const res = await fetch('/api/firm/member/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member!.id,
          newName: submittedName,
          newEmail: submittedEmail,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Reassignment failed. Please try again.')
        setPhase('idle')
        return
      }
      setConfirmedName(submittedName)
      setConfirmedEmail(submittedEmail)
      setPhase('success')
      addToast(`Seat reassigned — invite sent to ${submittedName || submittedEmail}`)
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
        {phase === 'success' ? (
          /* Success confirmation panel */
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-teal-400 mb-1">Invite sent</p>
                <p className="text-sm text-zinc-300">
                  {confirmedName && <span className="font-medium">{confirmedName}</span>}
                  {confirmedName && confirmedEmail && ' '}
                  {confirmedEmail && <span className="text-zinc-400">({confirmedEmail})</span>}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  They&apos;ll receive an email to set their password and start training.
                </p>
              </div>
            </div>
            <button
              onClick={() => onSuccess(member.id)}
              className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Entry form */
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
