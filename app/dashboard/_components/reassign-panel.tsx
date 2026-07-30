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
    // No max-w cap — fills the full width of the parent table card.
    //
    // p-1 is load-bearing, not spacing: the parent cross-fade container is
    // `overflow-y-auto`, and per CSS a non-visible overflow on one axis forces
    // the other to compute to `auto` too — so it clips horizontally as well.
    // The inputs' 2px focus ring sits outside their border box and was landing
    // exactly on that clip edge, which is what read as the name field being cut
    // off. 4px of breathing room keeps the ring inside.
    //
    // The <form> now wraps the WHOLE grid rather than just column 1, because
    // Confirm moved into column 2 and a submit button has to stay inside it.
    <form onSubmit={handleSubmit} className="w-full p-1">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Column 1 — purely the form now (Max's steer). */}
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
                className="w-full rounded-xl border border-[#E5EEF5] bg-white px-4 py-3.5 text-base text-[#0A0A0A] outline-none transition-colors placeholder:text-[#B0B7BF] focus:border-[#32C7FF] dark:placeholder:text-[#454C54] focus:ring-2 focus:ring-[#32C7FF]/30 disabled:opacity-50 dark:border-[#1F2429] dark:bg-[#050607] dark:text-[#F5F7FA]"
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
                className="w-full rounded-xl border border-[#E5EEF5] bg-white px-4 py-3.5 text-base text-[#0A0A0A] outline-none transition-colors placeholder:text-[#B0B7BF] focus:border-[#32C7FF] dark:placeholder:text-[#454C54] focus:ring-2 focus:ring-[#32C7FF]/30 disabled:opacity-50 dark:border-[#1F2429] dark:bg-[#050607] dark:text-[#F5F7FA]"
              />
            </div>

            {error && <p className="text-sm text-[#DC2626]">{error}</p>}
        </div>

        {/* Column 2 — who's being replaced, then the actions. Confirm/Cancel
            moved here so column 1 is nothing but the form (Max's steer), which
            also shortens the panel enough to stop it scrolling. */}
        <div className="flex flex-col gap-5">
          <ReplacementSummary member={member} />

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
        </div>
      </div>
    </form>
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

  // Stacked, never side-by-side. Splitting "Replacing <person>" from their
  // training status into two columns implied the two were separate facts; they
  // are one statement about one person, and the split was also what forced this
  // card wide enough to make the whole panel scroll.
  //
  // The preamble is trimmed to the outgoing person's name plus their status
  // (Max's steer). The paragraph promising history would be preserved is gone —
  // the Preserved block below states the same thing concretely, with the actual
  // values, which is more convincing than the sentence was.
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-[#F5F7FA] p-5 dark:bg-[#131A20]">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF8FF] text-[#0094FF] dark:bg-[#0094FF]/15 dark:text-[#32C7FF]">
          <SwapIcon className="h-5 w-5" />
        </div>
        {/* min-w-0 lets this shrink below its content width so a long name or
            email wraps instead of widening the card. */}
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-[#8A8A8A] uppercase dark:text-[#7A8189]">
            Replacing
          </p>
          <p className="mt-0.5 break-words text-base font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
            {member.name}
          </p>
        </div>
      </div>

      <TrainingStatusBadge status={member.trainingStatus} />

      {rows.length > 0 && (
        <div className="border-t border-[#E5EEF5] pt-4 dark:border-[#1F2429]">
          <p className="mb-3 text-xs font-semibold tracking-wide text-[#8A8A8A] uppercase dark:text-[#7A8189]">
            Preserved
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-[#8A8A8A] dark:text-[#7A8189]">{label}</dt>
                <dd className="mt-0.5 break-words text-sm leading-snug font-bold text-[#0A0A0A] dark:text-[#F5F7FA]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
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
