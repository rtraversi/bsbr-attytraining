'use client'

import { useState, useEffect } from 'react'
import type { MemberDetail } from './team-table'
import { useToast } from './toast-provider'

interface ReassignPanelProps {
  member: MemberDetail
  onClose: () => void
  onSuccess: (memberId: string) => void
}

/**
 * Inline reassign UI — rendered IN PLACE of the Manage Team table (see
 * ManageTeamPanel's cross-fade), not as a floating backdrop-blur modal.
 * Deliberate choice: a centered modal over a blurred screen reads as generic;
 * morphing the panel itself keeps the interaction anchored to the row that
 * triggered it. No backdrop/overlay chrome here — the parent grid cell
 * provides the frame.
 */
export function ReassignPanel({ member, onClose, onSuccess }: ReassignPanelProps) {
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'idle' | 'loading' | 'success'>('idle')
  const [confirmedName, setConfirmedName] = useState('')
  const [confirmedEmail, setConfirmedEmail] = useState('')
  const [error, setError] = useState('')

  // Reset form state whenever a different row opens the panel
  useEffect(() => {
    setName('')
    setEmail('')
    setError('')
    setPhase('idle')
    setConfirmedName('')
    setConfirmedEmail('')
  }, [member.id])

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
          memberId: member.id,
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

  if (phase === 'success') {
    return (
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-start gap-4 rounded-2xl bg-[#F5F7FA] p-5 dark:bg-[#131A20]">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#32C7FF]/15">
            <svg
              className="h-5 w-5 text-[#0094FF] dark:text-[#32C7FF]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-[#0094FF] dark:text-[#32C7FF]">Invite sent</p>
            <p className="mt-1 text-base text-[#3D3D3D] dark:text-[#C4C9CE]">
              {confirmedName && <span className="font-semibold">{confirmedName}</span>}
              {confirmedName && confirmedEmail && ' '}
              {confirmedEmail && (
                <span className="text-[#8A8A8A] dark:text-[#7A8189]">({confirmedEmail})</span>
              )}
            </p>
            <p className="mt-1 text-sm text-[#8A8A8A] dark:text-[#7A8189]">
              They&apos;ll receive an email to set their password and start training.
            </p>
          </div>
        </div>
        <button
          onClick={() => onSuccess(member.id)}
          className="self-end rounded-xl bg-black px-7 py-3 text-base font-bold text-white transition-colors hover:bg-gray-800 dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-white"
        >
          Done
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Context callout — same icon-chip + rounded-2xl language as the rest of
          the dashboard (QuickAction tiles, CertificationForecast's projection
          box), instead of a stray unstyled paragraph. */}
      <div className="mb-8 flex items-start gap-4 rounded-2xl bg-[#F5F7FA] p-5 dark:bg-[#131A20]">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF8FF] text-[#0094FF] dark:bg-[#0094FF]/15 dark:text-[#32C7FF]">
          <SwapIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
            Replacing{' '}
            <span className="text-[#0094FF] dark:text-[#32C7FF]">{member.email}</span>
          </p>
          <p className="mt-1 text-sm text-[#8A8A8A] dark:text-[#7A8189]">
            Their training history and certificates will be preserved — only the seat&apos;s owner
            changes.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#8A8A8A] dark:text-[#7A8189]">
              New employee name
            </label>
            <input
              type="text"
              required
              placeholder="Jane Smith"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={phase === 'loading'}
              className="w-full rounded-xl border border-[#E5EEF5] bg-white px-4 py-3.5 text-base text-[#0A0A0A] outline-none transition-colors placeholder:text-[#B0B7BF] focus:border-[#32C7FF] focus:ring-2 focus:ring-[#32C7FF]/30 disabled:opacity-50 dark:border-[#1F2429] dark:bg-[#050607] dark:text-[#F5F7FA]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#8A8A8A] dark:text-[#7A8189]">
              New employee email
            </label>
            <input
              type="email"
              required
              placeholder="jane@yourfirm.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={phase === 'loading'}
              className="w-full rounded-xl border border-[#E5EEF5] bg-white px-4 py-3.5 text-base text-[#0A0A0A] outline-none transition-colors placeholder:text-[#B0B7BF] focus:border-[#32C7FF] focus:ring-2 focus:ring-[#32C7FF]/30 disabled:opacity-50 dark:border-[#1F2429] dark:bg-[#050607] dark:text-[#F5F7FA]"
            />
          </div>
        </div>

        {error && <p className="text-sm text-[#DC2626]">{error}</p>}

        {/* Quiet Cancel + prominent Confirm, right-aligned — a considered action
            pair rather than two equal-weight pills stretched full width. */}
        <div className="flex items-center justify-end gap-5 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={phase === 'loading'}
            className="rounded-xl px-4 py-3 text-base font-bold text-[#3D3D3D] transition-colors hover:text-[#0094FF] disabled:opacity-50 dark:text-[#C4C9CE] dark:hover:text-[#32C7FF]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={phase === 'loading'}
            className="rounded-xl bg-black px-7 py-3 text-base font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-white"
          >
            {phase === 'loading' ? 'Sending invite…' : 'Confirm & send invite'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
}
