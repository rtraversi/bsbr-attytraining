'use client'

import { createContext, useContext, useMemo, useState } from 'react'
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

/**
 * The spec splits one table into two cards — actionable "Manage team" and
 * read-only "Team overview" — that sit in different grid cells. They share
 * row state (a delete in one must drop the row from the other), so the state
 * lives in a provider that wraps both. Handlers and gating are unchanged from
 * the single-table version.
 */
interface TeamCtx {
  visible: MemberDetail[]
  total: number
  remindStates: Record<string, RemindState>
  deletingIds: Set<string>
  reassignedIds: Set<string>
  handleRemind: (userId: string, displayName: string) => void
  handleDelete: (memberId: string, displayName: string) => void
  setReassignTarget: (m: MemberDetail) => void
  setCertPreview: (m: MemberDetail) => void
}

const Ctx = createContext<TeamCtx | null>(null)

function useTeam(): TeamCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('Team panels must be rendered inside <TeamProvider>')
  return ctx
}

export function TeamProvider({
  memberDetails,
  children,
}: {
  memberDetails: MemberDetail[]
  children: React.ReactNode
}) {
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

  const visible = useMemo(
    () => memberDetails.filter(m => !deletedIds.has(m.id)),
    [memberDetails, deletedIds]
  )

  const value: TeamCtx = {
    visible,
    total: memberDetails.length,
    remindStates,
    deletingIds,
    reassignedIds,
    handleRemind,
    handleDelete,
    setReassignTarget,
    setCertPreview,
  }

  return (
    <Ctx.Provider value={value}>
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
      {children}
    </Ctx.Provider>
  )
}

/* ── Shared tokens ─────────────────────────────────────────────────────────── */

const CARD =
  'rounded-3xl bg-white p-6 dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]'
const HEADING =
  'font-headline text-[1.05rem] font-bold text-[#0A0A0A] dark:text-[#F5F7FA]'
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'

const ROW_ACTION =
  'whitespace-nowrap rounded-lg border border-[#E5EEF5] px-2.5 py-1 text-[11px] font-semibold text-[#3D3D3D] transition-colors hover:border-[#0094FF] hover:text-[#0094FF] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2429] dark:text-[#C4C9CE] dark:hover:border-[#32C7FF] dark:hover:text-[#32C7FF]'
const ROW_ACTION_DANGER =
  'whitespace-nowrap rounded-lg border border-[#FEE2E2] px-2.5 py-1 text-[11px] font-semibold text-[#DC2626] transition-colors hover:border-[#DC2626] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#3A1D1D]'

/* ── Manage team — actionable rows ─────────────────────────────────────────── */

export function ManageTeamPanel() {
  const { visible, total, remindStates, deletingIds, reassignedIds, handleRemind, handleDelete, setReassignTarget } =
    useTeam()

  return (
    <div className={CARD}>
      <div className="mb-4 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h2 className={HEADING}>Manage team</h2>
        <span className={`text-xs ${MUTED}`}>Remind, reassign, or remove a team member</span>
      </div>

      {total === 0 ? (
        <EmptyTeam />
      ) : (
        <div className="flex flex-col divide-y divide-[#F2F4F7] dark:divide-[#1F2429]">
          {visible.map(m => {
            if (reassignedIds.has(m.id)) {
              return (
                <p key={m.id} className={`py-3 text-xs italic ${MUTED}`}>
                  Reassigned — invite sent to new employee
                </p>
              )
            }

            const remindState = remindStates[m.user_id] ?? 'idle'
            const canRemind = m.trainingStatus === 'not_started' || m.trainingStatus === 'in_progress'
            const canReassign = m.trainingStatus !== 'passed'
            const isDeleting = deletingIds.has(m.id)

            return (
              <div key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">{m.name}</p>
                  <p className={`truncate text-xs ${MUTED}`}>{m.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {canRemind &&
                    (remindState === 'idle' ? (
                      <button onClick={() => handleRemind(m.user_id, m.name)} className={ROW_ACTION}>
                        Remind
                      </button>
                    ) : remindState === 'loading' ? (
                      <span className={`text-[11px] ${MUTED}`}>Sending…</span>
                    ) : remindState === 'sent' ? (
                      <span className="text-[11px] font-semibold text-[#0094FF]">Sent ✓</span>
                    ) : (
                      <button
                        onClick={() => handleRemind(m.user_id, m.name)}
                        className="text-[11px] font-semibold text-[#DC2626] hover:underline"
                      >
                        Failed — try again
                      </button>
                    ))}

                  {canReassign && (
                    <button onClick={() => setReassignTarget(m)} className={ROW_ACTION}>
                      Reassign
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(m.id, m.name)}
                    disabled={isDeleting}
                    className={ROW_ACTION_DANGER}
                  >
                    {isDeleting ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}

          {visible.length === 0 && (
            <p className={`py-6 text-center text-sm ${MUTED}`}>All members have been removed.</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Team overview — read-only status table ────────────────────────────────── */

export function TeamOverviewTable() {
  const { visible, total, setCertPreview } = useTeam()

  return (
    <div className={`${CARD} h-full`}>
      <div className="mb-4">
        <h2 className={`${HEADING} mb-0.5`}>Team overview</h2>
        <p className={`text-xs ${MUTED}`}>Real-time status of all employees</p>
      </div>

      {total === 0 ? (
        <EmptyTeam />
      ) : (
        <div className="-mx-2 overflow-x-auto">
          {/* Scroll the table rather than crushing names/dates on a narrow card. */}
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#E5EEF5] dark:border-[#1F2429]">
                {['Employee', 'Status', 'Score', 'Completed', 'Certificate'].map(h => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-2 py-2 text-left text-xs font-semibold ${MUTED}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#1F2429]">
              {visible.map(m => (
                <tr key={m.id}>
                  <td className="px-2 py-3">
                    <p className="font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">{m.name}</p>
                    <p className={`text-xs ${MUTED}`}>{m.email}</p>
                  </td>
                  <td className="px-2 py-3">
                    <TrainingStatusBadge status={m.trainingStatus} />
                  </td>
                  <td className={`px-2 py-3 whitespace-nowrap ${m.score !== null ? 'font-semibold' : MUTED}`}>
                    {m.score !== null ? `${Math.round(m.score)}%` : '—'}
                  </td>
                  <td className={`whitespace-nowrap px-2 py-3 ${MUTED}`}>
                    {m.completedAt
                      ? new Date(m.completedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3">
                    {m.certId ? (
                      <button
                        onClick={() => setCertPreview(m)}
                        className="text-xs font-semibold text-[#0094FF] hover:underline"
                      >
                        View &amp; download
                      </button>
                    ) : (
                      <span className={MUTED}>—</span>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className={`px-2 py-6 text-center text-sm ${MUTED}`}>
                    All members have been removed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Bits ──────────────────────────────────────────────────────────────────── */

function EmptyTeam() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <PersonPlusIcon />
      <p className={`text-sm font-medium ${MUTED}`}>Your team is empty</p>
      <p className={`max-w-xs text-xs leading-relaxed ${MUTED}`}>
        Invite your first team member to get started with AI compliance training.
      </p>
    </div>
  )
}

function PersonPlusIcon() {
  return (
    <svg className="h-8 w-8 text-[#C7CDD3] dark:text-[#3A4048]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
    </svg>
  )
}

export function TrainingStatusBadge({ status }: { status: TrainingStatus }) {
  const config: Record<TrainingStatus, { pill: string; label: string }> = {
    not_started: {
      pill: 'bg-[#F2F4F7] text-[#8A8A8A] dark:bg-[#1A1F24] dark:text-[#7A8189]',
      label: 'Not started',
    },
    in_progress: {
      pill: 'bg-[#FFF7E6] text-[#B45309] dark:bg-[#B45309]/15 dark:text-[#F0B357]',
      label: 'In progress',
    },
    passed: {
      pill: 'bg-[#EAF8FF] text-[#0094FF] dark:bg-[#0094FF]/15 dark:text-[#32C7FF]',
      label: 'Passed',
    },
    expired: {
      pill: 'bg-[#FEE2E2] text-[#DC2626] dark:bg-[#DC2626]/15 dark:text-[#F87171]',
      label: 'Expired',
    },
  }

  const { pill, label } = config[status]
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-[3px] text-[11px] font-bold ${pill}`}
    >
      {label}
    </span>
  )
}
