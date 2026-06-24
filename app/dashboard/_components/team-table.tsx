'use client'

import { useState } from 'react'
import { ReassignModal } from './reassign-modal'
import { CertPreviewModal } from './cert-preview-modal'
import { useToast } from './toast-provider'

export type TrainingStatus = 'not_started' | 'in_progress' | 'passed' | 'expired'

export interface MemberDetail {
  id: string
  user_id: string
  role: string
  status: string
  email: string
  name: string
  trainingStatus: TrainingStatus
  score: number | null
  completedAt: string | null
  certId: string | null
  certNumber: string | null
  certIssuedAt: string | null
  certExpiresAt: string | null
}

type RemindState = 'idle' | 'loading' | 'sent' | 'error'

export function TeamTable({ memberDetails }: { memberDetails: MemberDetail[] }) {
  const { addToast } = useToast()
  const [remindStates, setRemindStates] = useState<Record<string, RemindState>>({})
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [reassignedIds, setReassignedIds] = useState<Set<string>>(new Set())
  const [reassignTarget, setReassignTarget] = useState<MemberDetail | null>(null)
  const [certPreview, setCertPreview] = useState<MemberDetail | null>(null)

  async function handleRemind(userId: string, displayName: string) {
    setRemindStates(s => ({ ...s, [userId]: 'loading' }))
    try {
      const res = await fetch('/api/invite/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      setRemindStates(s => ({ ...s, [userId]: res.ok ? 'sent' : 'error' }))
      if (res.ok) addToast(`Reminder sent to ${displayName}`)
    } catch {
      setRemindStates(s => ({ ...s, [userId]: 'error' }))
    }
  }

  async function handleDelete(memberId: string, displayName: string) {
    const confirmed = window.confirm(
      `Are you sure? This will permanently remove ${displayName}'s personal information. Their certificate record will be preserved.`
    )
    if (!confirmed) return

    setDeletingIds(s => new Set(s).add(memberId))
    try {
      const res = await fetch('/api/firm/member/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      if (res.ok) {
        setDeletedIds(s => new Set(s).add(memberId))
        addToast('Employee record deleted')
      } else {
        const data = (await res.json()) as { error?: string }
        window.alert(data.error ?? 'Failed to delete member. Please try again.')
      }
    } catch {
      window.alert('Network error. Please try again.')
    } finally {
      setDeletingIds(s => { const next = new Set(s); next.delete(memberId); return next })
    }
  }

  function handleReassignSuccess(memberId: string) {
    setReassignedIds(s => new Set(s).add(memberId))
    setReassignTarget(null)
  }

  const visible = memberDetails.filter(m => !deletedIds.has(m.id))

  if (memberDetails.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 py-16 flex flex-col items-center gap-3 text-center">
        <PersonPlusIcon />
        <p className="text-sm font-medium text-zinc-400">Your team is empty</p>
        <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
          Invite your first team member above to get started with AI compliance training.
        </p>
      </div>
    )
  }

  return (
    <>
      <ReassignModal
        member={reassignTarget}
        onClose={() => setReassignTarget(null)}
        onSuccess={handleReassignSuccess}
      />
      {certPreview?.certId && (
        <CertPreviewModal
          certId={certPreview.certId}
          certNumber={certPreview.certNumber}
          employeeName={certPreview.name}
          issuedAt={certPreview.certIssuedAt}
          expiresAt={certPreview.certExpiresAt}
          onClose={() => setCertPreview(null)}
        />
      )}

      <div className="rounded-2xl border border-zinc-800 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-zinc-500 font-normal whitespace-nowrap">Name</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-normal whitespace-nowrap">Email</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-normal whitespace-nowrap">Training Status</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-normal whitespace-nowrap">Score</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-normal whitespace-nowrap">Completion Date</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-normal whitespace-nowrap">Certificate</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-normal whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {visible.map((m) => {
              // Reassigned rows show a one-line confirmation instead of normal cells
              if (reassignedIds.has(m.id)) {
                return (
                  <tr key={m.id} className="bg-zinc-900">
                    <td colSpan={7} className="px-4 py-3 text-xs text-zinc-500 italic">
                      Reassigned — invite sent to new employee
                    </td>
                  </tr>
                )
              }

              const remindState = remindStates[m.user_id] ?? 'idle'
              const canRemind = m.trainingStatus === 'not_started' || m.trainingStatus === 'in_progress'
              const canReassign = m.trainingStatus !== 'passed'
              const isDeleting = deletingIds.has(m.id)

              return (
                <tr key={m.id} className="bg-zinc-900 hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 text-zinc-200 whitespace-nowrap">{m.name}</td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{m.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <TrainingStatusBadge status={m.trainingStatus} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {m.score !== null ? `${Math.round(m.score)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {m.completedAt
                      ? new Date(m.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {m.certId ? (
                      <button
                        onClick={() => setCertPreview(m)}
                        className="text-teal-400 hover:text-teal-300 text-xs underline underline-offset-2 transition-colors"
                      >
                        View
                      </button>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {/* Remind — incomplete rows only */}
                      {canRemind && (
                        remindState === 'idle' ? (
                          <button
                            onClick={() => handleRemind(m.user_id, m.name)}
                            className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded px-2.5 py-1 transition-colors"
                          >
                            Remind
                          </button>
                        ) : remindState === 'loading' ? (
                          <span className="text-xs text-zinc-500">Sending…</span>
                        ) : remindState === 'sent' ? (
                          <span className="text-xs text-teal-400">Sent ✓</span>
                        ) : (
                          <button
                            onClick={() => handleRemind(m.user_id, m.name)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Failed — try again
                          </button>
                        )
                      )}

                      {/* Reassign — all non-passed rows */}
                      {canReassign && (
                        <button
                          onClick={() => setReassignTarget(m)}
                          className="text-xs text-zinc-400 hover:text-indigo-300 border border-zinc-700 hover:border-indigo-600/50 rounded px-2.5 py-1 transition-colors"
                        >
                          Reassign
                        </button>
                      )}

                      {/* Delete — all rows */}
                      <button
                        onClick={() => handleDelete(m.id, m.name)}
                        disabled={isDeleting}
                        className="text-xs text-red-900 hover:text-red-400 border border-red-900/40 hover:border-red-500/40 rounded px-2.5 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isDeleting ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-zinc-600">
                  {memberDetails.length === 0
                    ? 'No team members yet. Invite your first employee above.'
                    : 'All members have been removed.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function PersonPlusIcon() {
  return (
    <svg className="w-8 h-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  )
}

function TrainingStatusBadge({ status }: { status: TrainingStatus }) {
  const config: Record<TrainingStatus, { pill: string; icon: React.ReactNode; label: string }> = {
    not_started: {
      pill: 'bg-zinc-700/50 text-zinc-400',
      label: 'Not started',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
    in_progress: {
      pill: 'bg-yellow-500/15 text-yellow-400',
      label: 'In progress',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    passed: {
      pill: 'bg-teal-500/15 text-teal-400',
      label: 'Passed',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2 6.5l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    expired: {
      pill: 'bg-red-500/15 text-red-400',
      label: 'Expired',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M6 1L11 10H1L6 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M6 5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
        </svg>
      ),
    },
  }

  const { pill, icon, label } = config[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${pill}`}>
      {icon}
      {label}
    </span>
  )
}
