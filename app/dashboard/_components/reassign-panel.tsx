'use client'

import { useState, useEffect } from 'react'
import { TrainingStatusBadge, type MemberDetail } from './team-table'
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
      // Same two-column width as the form below — no max-w cap here either, so
      // the panel doesn't shrink back down once it succeeds. Column 2 reuses
      // the real preserved-record summary (still true/relevant post-reassign)
      // instead of leaving that half empty.
      <div className="w-full">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col justify-between gap-6">
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

          <ReplacementSummary member={member} />
        </div>
      </div>
    )
  }

  return (
    // No max-w cap — fills the full width of the parent table card. Two
    // columns (form+actions / replacement summary) share that width instead
    // of leaving it empty; grid's default items-stretch makes the summary
    // card match the form column's height, so there's no dead space under it.
    <div className="w-full">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Column 1 — inputs on top, actions pinned to the bottom so the
            column uses the full stretched height instead of clumping at the top. */}
        <form onSubmit={handleSubmit} className="flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-5">
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

            {error && <p className="text-sm text-[#DC2626]">{error}</p>}
          </div>

          {/* Stacked full-width Confirm + quiet centered Cancel — the pair no
              longer needs to fit on one line now that the column is narrower. */}
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={phase === 'loading'}
              className="w-full rounded-xl bg-black px-7 py-3 text-base font-bold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-white"
            >
              {phase === 'loading' ? 'Sending invite…' : 'Confirm & send invite'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={phase === 'loading'}
              className="self-center rounded-xl px-4 py-2 text-base font-bold text-[#3D3D3D] transition-colors hover:text-[#0094FF] disabled:opacity-50 dark:text-[#C4C9CE] dark:hover:text-[#32C7FF]"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Column 2 — merged notice + preserved-record card. Left half restates
            who's being replaced (icon-chip + "Replacing [email]"); right half
            makes "training history and certificates will be preserved"
            concrete via status + whichever fields actually have values. */}
        <ReplacementSummary member={member} />
      </div>
    </div>
  )
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ReplacementSummary({ member }: { member: MemberDetail }) {
  const rows: Array<[string, string]> = []
  if (member.score !== null) rows.push(['Score', `${Math.round(member.score)}%`])
  if (member.completedAt) rows.push(['Completed', fmt(member.completedAt)])
  if (member.certNumber) rows.push(['Certificate', `#${member.certNumber}`])
  if (member.certIssuedAt) rows.push(['Issued', fmt(member.certIssuedAt)])
  if (member.certExpiresAt) rows.push(['Expires', fmt(member.certExpiresAt)])

  return (
    <div className="flex h-full flex-col gap-5 rounded-2xl bg-[#F5F7FA] p-5 dark:bg-[#131A20] lg:flex-row lg:gap-6">
      {/* Left half — icon-chip + notice copy. min-w-0 lets the flex item shrink
          below its content size so a long email wraps (break-words) instead of
          forcing this half wider and squeezing the fields grid on the right. */}
      <div className="flex min-w-0 items-start gap-4 lg:flex-1 lg:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF8FF] text-[#0094FF] dark:bg-[#0094FF]/15 dark:text-[#32C7FF]">
          <SwapIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="break-words text-base font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
            Replacing{' '}
            <span className="text-[#0094FF] dark:text-[#32C7FF]">{member.email}</span>
          </p>
          <p className="mt-1 text-sm text-[#8A8A8A] dark:text-[#7A8189]">
            Their training history and certificates will be preserved — only the seat&apos;s
            owner changes.
          </p>
        </div>
      </div>

      {/* Divider: horizontal border-top when stacked, vertical rule at lg+ */}
      <div className="flex min-w-0 flex-col gap-3 border-t border-[#E5EEF5] pt-5 dark:border-[#1F2429] lg:flex-1 lg:justify-center lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <TrainingStatusBadge status={member.trainingStatus} />

        {rows.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-[#8A8A8A] dark:text-[#7A8189]">{label}</dt>
                <dd className="mt-0.5 break-words text-sm font-bold leading-snug text-[#0A0A0A] dark:text-[#F5F7FA]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
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
