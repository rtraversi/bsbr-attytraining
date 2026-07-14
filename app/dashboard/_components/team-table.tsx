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
 * Team state lives in a provider rather than the panel itself so other cards
 * can read the same data: ManageTeamPanel (the merged actionable table) and
 * CertificationForecast (projects a completion date off the same members —
 * a delete updates both live). Handlers and gating are unchanged from the
 * pre-merge two-panel version.
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

export function useTeam(): TeamCtx {
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
  'font-headline text-xl md:text-2xl font-bold text-[#0A0A0A] dark:text-[#F5F7FA]'
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'

// Extra-muted, one step lighter than MUTED (matches PersonPlusIcon) — for the
// em-dash placeholders in Score/Completed/Certificate, which read heavy at
// MUTED next to real values.
const EM_DASH = 'text-[#C7CDD3] dark:text-[#3A4048]'

// Neutral outline button — kept for the pagination Prev/Next controls only.
const ROW_ACTION =
  'whitespace-nowrap rounded-lg border border-[#E5EEF5] px-2.5 py-1 text-[11px] font-semibold text-[#3D3D3D] transition-colors hover:border-[#0094FF] hover:text-[#0094FF] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2429] dark:text-[#C4C9CE] dark:hover:border-[#32C7FF] dark:hover:text-[#32C7FF]'

// Text-only row actions: coloured text, no fill, no border — all matching the
// Delete (danger) look. Hover is a slight opacity shift.
const TEXT_ROW_ACTION =
  'whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40'
const ROW_ACTION_REMIND = `${TEXT_ROW_ACTION} text-[#FF6600]`
const ROW_ACTION_REASSIGN = `${TEXT_ROW_ACTION} text-[#0094FF]`
const ROW_ACTION_DANGER = `${TEXT_ROW_ACTION} text-[#DC2626]`

// Window the member list so the block can't grow unbounded and break the
// six-block grid. Panels paginate past this many members; below it, nothing
// changes visually except the fixed-height scroll container.
const PAGE_SIZE = 20

// Height-follower: fill the space the card has left after its heading, then scroll
// internally. `min-h-0` is load-bearing — a flex child won't shrink below its
// content's natural size without it, so the overflow would never kick in. The
// card's actual height is set by its parent grid cell (see admin-dashboard.tsx).
const LIST_SCROLL = 'flex-1 min-h-0 overflow-y-auto'

/* ── Manage team — merged table (status + certificate + actions) ───────────── */

export function ManageTeamPanel() {
  const {
    visible,
    total,
    remindStates,
    deletingIds,
    reassignedIds,
    handleRemind,
    handleDelete,
    setReassignTarget,
    setCertPreview,
  } = useTeam()

  // currentPage clamps `page` so a delete that shrinks the list off the last
  // page snaps back into range.
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageItems = visible.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  return (
    <div className={`${CARD} flex h-full flex-col`}>
      <div className="mb-4">
        <h2 className={HEADING}>Manage team</h2>
      </div>

      {total === 0 ? (
        <EmptyTeam />
      ) : (
        <>
          {/* overflow-x scrolls wide rows; LIST_SCROLL caps height + scrolls vertically. */}
          <div className={`-mx-2 overflow-x-auto ${LIST_SCROLL}`}>
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[#E5EEF5] dark:border-[#1F2429]">
                  {['Employee', 'Status', 'Score', 'Completed', 'Certificate', 'Actions'].map(h => {
                    // Status/Score/Completed center; Employee/Certificate stay
                    // left; Actions right, matching its right-aligned cells.
                    const centered = h === 'Status' || h === 'Score' || h === 'Completed'
                    return (
                      <th
                        key={h}
                        className={`whitespace-nowrap px-2 py-2 text-xs font-semibold ${
                          centered ? 'text-center' : h === 'Actions' ? 'text-right' : 'text-left'
                        } ${MUTED}`}
                      >
                        {h}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#1F2429]">
                {pageItems.map(m => {
                  if (reassignedIds.has(m.id)) {
                    return (
                      <tr key={m.id}>
                        <td colSpan={6} className={`px-2 py-3 text-xs italic ${MUTED}`}>
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
                    <tr key={m.id}>
                      <td className="px-2 py-3">
                        <p className="font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">{m.name}</p>
                        <p className={`text-xs ${MUTED}`}>{m.email}</p>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <TrainingStatusBadge status={m.trainingStatus} />
                      </td>
                      <td className={`px-2 py-3 whitespace-nowrap text-center ${m.score !== null ? 'font-semibold' : EM_DASH}`}>
                        {m.score !== null ? `${Math.round(m.score)}%` : '—'}
                      </td>
                      <td className={`whitespace-nowrap px-2 py-3 text-center ${m.completedAt ? MUTED : EM_DASH}`}>
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
                          <span className={EM_DASH}>—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {canRemind &&
                            (remindState === 'idle' ? (
                              <button onClick={() => handleRemind(m.user_id, m.name)} className={ROW_ACTION_REMIND}>
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
                            <button onClick={() => setReassignTarget(m)} className={ROW_ACTION_REASSIGN}>
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
                      </td>
                    </tr>
                  )
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`px-2 py-6 text-center text-sm ${MUTED}`}>
                      All members have been removed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {visible.length > PAGE_SIZE && (
            <PaginationControls
              page={currentPage}
              totalPages={totalPages}
              onPrev={() => setPage(currentPage - 1)}
              onNext={() => setPage(currentPage + 1)}
            />
          )}
        </>
      )}
    </div>
  )
}

/* ── Bits ──────────────────────────────────────────────────────────────────── */

// Prev/Next + "Page X of Y". `page` is the already-clamped currentPage, so the
// disabled bounds are always correct even right after a delete shrinks the list.
function PaginationControls({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <button type="button" onClick={onPrev} disabled={page === 0} className={ROW_ACTION}>
        Prev
      </button>
      <span className={`text-xs ${MUTED}`}>
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages - 1}
        className={ROW_ACTION}
      >
        Next
      </button>
    </div>
  )
}

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
