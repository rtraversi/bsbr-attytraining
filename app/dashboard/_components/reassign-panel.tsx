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
    // No max-w cap — fills the full width of the parent table card. Three
    // columns (form+actions / notice / preserved record) share that width
    // instead of leaving it empty; grid's default items-stretch makes the
    // notice and preserved-record cards match whichever column is tallest,
    // so there's no dead space under the shorter ones either.
    <div className="w-full">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px_260px]">
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

        {/* Column 2 — notice callout, same icon-chip + rounded-2xl language as
            the rest of the dashboard. Content is vertically centered since the
            row stretches to match the (usually taller) preserved-record column. */}
        <div className="flex h-full items-center gap-4 rounded-2xl bg-[#F5F7FA] p-5 dark:bg-[#131A20]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF8FF] text-[#0094FF] dark:bg-[#0094FF]/15 dark:text-[#32C7FF]">
            <SwapIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
              Replacing{' '}
              <span className="text-[#0094FF] dark:text-[#32C7FF]">{member.email}</span>
            </p>
            <p className="mt-1 text-sm text-[#8A8A8A] dark:text-[#7A8189]">
              Their training history and certificates will be preserved — only the seat&apos;s
              owner changes.
            </p>
          </div>
        </div>

        {/* Column 3 — preserved record */}
        <OutgoingSeatRecap member={member} />
      </div>
    </div>
  )
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Right-column companion to the callout above — makes "training history and
// certificates will be preserved" concrete instead of just asserted. Same
// rounded-2xl/icon-chip card language as the callout, so the two read as one
// idea split across columns rather than two unrelated boxes.
function OutgoingSeatRecap({ member }: { member: MemberDetail }) {
  const rows: Array<[string, string]> = []
  if (member.score !== null) rows.push(['Score', `${Math.round(member.score)}%`])
  if (member.completedAt) rows.push(['Completed', fmt(member.completedAt)])
  if (member.certNumber) rows.push(['Certificate', `#${member.certNumber}`])
  if (member.certIssuedAt) rows.push(['Issued', fmt(member.certIssuedAt)])
  if (member.certExpiresAt) rows.push(['Expires', fmt(member.certExpiresAt)])

  return (
    <div className="h-full rounded-2xl bg-[#F5F7FA] p-5 dark:bg-[#131A20]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF8FF] text-[#0094FF] dark:bg-[#0094FF]/15 dark:text-[#32C7FF]">
          <ArchiveIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">Preserved record</p>
          <p className="text-xs text-[#8A8A8A] dark:text-[#7A8189]">Outgoing seat holder</p>
        </div>
      </div>

      <p className="truncate font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">{member.name}</p>
      <p className="truncate text-sm text-[#8A8A8A] dark:text-[#7A8189]">{member.email}</p>

      <div className="mt-3">
        <TrainingStatusBadge status={member.trainingStatus} />
      </div>

      {rows.length > 0 && (
        <dl className="mt-4 space-y-2 border-t border-[#E5EEF5] pt-4 text-sm dark:border-[#1F2429]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <dt className="text-[#8A8A8A] dark:text-[#7A8189]">{label}</dt>
              <dd className="truncate font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">{value}</dd>
            </div>
          ))}
        </dl>
      )}
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

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8M10 12h4" />
    </svg>
  )
}
