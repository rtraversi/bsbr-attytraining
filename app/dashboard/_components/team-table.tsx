'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { ReassignPanel } from './reassign-panel'
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
  /** The signed-in admin's own auth user id — so they can't delete themselves. */
  currentUserId: string
  remindStates: Record<string, RemindState>
  deletingIds: Set<string>
  reassignedIds: Set<string>
  /** Non-null while a reassign is in progress — ManageTeamPanel morphs the
   *  table into the ReassignPanel in place rather than opening a floating modal. */
  reassignTarget: MemberDetail | null
  handleRemind: (userId: string, displayName: string) => void
  handleDelete: (memberId: string, displayName: string) => void
  setReassignTarget: (m: MemberDetail | null) => void
  handleReassignSuccess: (memberId: string) => void
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
  currentUserId,
  children,
}: {
  memberDetails: MemberDetail[]
  currentUserId: string
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
    currentUserId,
    remindStates,
    deletingIds,
    reassignedIds,
    reassignTarget,
    handleRemind,
    handleDelete,
    setReassignTarget,
    handleReassignSuccess,
    setCertPreview,
  }

  return (
    <Ctx.Provider value={value}>
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
  'font-headline text-2xl md:text-3xl font-bold text-[#0A0A0A] dark:text-[#F5F7FA]'
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'

// Extra-muted, one step lighter than MUTED (matches PersonPlusIcon) — for the
// em-dash placeholders in Score/Completed/Certificate, which read heavy at
// MUTED next to real values.
const EM_DASH = 'text-[#C7CDD3] dark:text-[#3A4048]'

// Neutral outline button — kept for the pagination Prev/Next controls only.
const ROW_ACTION =
  'whitespace-nowrap rounded-lg border border-[#E5EEF5] px-2.5 py-1 text-sm font-semibold text-[#3D3D3D] transition-colors hover:border-[#0094FF] hover:text-[#0094FF] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2429] dark:text-[#C4C9CE] dark:hover:border-[#32C7FF] dark:hover:text-[#32C7FF]'

// Per-column row actions: compact bordered icon buttons, one column each
// (Remind / Reassign / Delete). The column headers carry the label, so the
// buttons stay icon-only and the table doesn't balloon. Colours keep the
// established coding: remind orange, reassign blue, delete red.
const ICON_ACTION =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40'
const ICON_ACTION_REMIND = `${ICON_ACTION} border-[#FF6600]/35 text-[#FF6600] hover:bg-[#FF6600]/10 dark:border-[#FF6600]/45`
const ICON_ACTION_REASSIGN = `${ICON_ACTION} border-[#0094FF]/35 text-[#0094FF] hover:bg-[#EAF8FF] dark:border-[#0094FF]/45 dark:hover:bg-[#0094FF]/10`
const ICON_ACTION_DANGER = `${ICON_ACTION} border-[#DC2626]/35 text-[#DC2626] hover:bg-[#DC2626]/10 dark:border-[#DC2626]/45`

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
    currentUserId,
    remindStates,
    deletingIds,
    reassignedIds,
    reassignTarget,
    handleRemind,
    handleDelete,
    setReassignTarget,
    handleReassignSuccess,
    setCertPreview,
  } = useTeam()

  // currentPage clamps `page` so a delete that shrinks the list off the last
  // page snaps back into range.
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const pageItems = visible.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const reassigning = reassignTarget !== null

  return (
    <div className={`${CARD} flex h-full flex-col`}>
      <div className="mb-4">
        <h2 className={HEADING}>{reassigning ? 'Reassign seat' : 'Manage team'}</h2>
      </div>

      {/* Table and reassign form share this grid cell and cross-fade between
          each other — a deliberate alternative to a floating backdrop-blur
          modal, which reads as generic. Both layers stay mounted (rather than
          swapping via a plain conditional) so the transition has something to
          animate; the hidden one gets pointer-events-none so it can't be
          interacted with or tabbed into. */}
      <div className="relative grid min-h-0 flex-1 grid-cols-1 grid-rows-1">
        <div
          className={`col-start-1 row-start-1 flex min-h-0 flex-col transition-[opacity,transform] duration-300 ease-out ${
            reassigning ? 'pointer-events-none scale-[0.98] opacity-0' : 'opacity-100'
          }`}
        >
        {total === 0 ? (
          <EmptyTeam />
        ) : (
          <>
            {/* overflow-x scrolls wide rows; LIST_SCROLL caps height + scrolls vertically. */}
            <div className={`-mx-2 overflow-x-auto ${LIST_SCROLL}`}>
              <table className="w-full min-w-[820px] text-base">
                <thead>
                  <tr className="border-b border-[#E5EEF5] dark:border-[#1F2429]">
                    {/* Each action gets its own labelled column — the row buttons
                        below are icon-only, so the header is what names them. */}
                    {['Employee', 'Status', 'Score', 'Completed', 'Certificate', 'Remind', 'Reassign', 'Delete'].map(h => (
                      <th
                        key={h}
                        className={`whitespace-nowrap px-2 py-2 text-sm font-semibold ${
                          h === 'Employee' ? 'text-left' : 'text-center'
                        } ${MUTED}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#1F2429]">
                  {pageItems.map(m => {
                    if (reassignedIds.has(m.id)) {
                      return (
                        <tr key={m.id}>
                          <td colSpan={8} className={`px-2 py-3 text-sm italic ${MUTED}`}>
                            Reassigned — invite sent to new employee
                          </td>
                        </tr>
                      )
                    }
  
                    const remindState = remindStates[m.user_id] ?? 'idle'
                    const canRemind = m.trainingStatus === 'not_started' || m.trainingStatus === 'in_progress'
                    const canReassign = m.trainingStatus !== 'passed'
                    const canDelete = m.user_id !== currentUserId
                    const isDeleting = deletingIds.has(m.id)
  
                    return (
                      <tr key={m.id}>
                        {/* Name only — it falls back to the email when the member
                            hasn't set one, so a second email line is redundant. */}
                        <td className="px-2 py-3">
                          <p className="font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">{m.name}</p>
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
                        <td className="whitespace-nowrap px-2 py-3 text-center">
                          {m.certId ? (
                            <button
                              onClick={() => setCertPreview(m)}
                              className="text-sm font-semibold text-[#0094FF] hover:underline"
                            >
                              View &amp; download
                            </button>
                          ) : (
                            <span className={EM_DASH}>—</span>
                          )}
                        </td>
                        {/* One column per action; ineligible rows show the same
                            extra-muted em dash as the data columns. Gating is
                            unchanged: remind on not_started/in_progress, reassign
                            on non-passed, delete always (confirm + PII redaction). */}
                        <td className="whitespace-nowrap px-2 py-3 text-center">
                          {canRemind ? (
                            remindState === 'idle' ? (
                              <button
                                onClick={() => handleRemind(m.user_id, m.name)}
                                className={ICON_ACTION_REMIND}
                                title={`Send ${m.name} a reminder`}
                                aria-label={`Remind ${m.name}`}
                              >
                                <BellIcon />
                              </button>
                            ) : remindState === 'loading' ? (
                              <span className={`text-sm ${MUTED}`}>…</span>
                            ) : remindState === 'sent' ? (
                              <span className="text-sm font-semibold text-[#0094FF]">Sent ✓</span>
                            ) : (
                              <button
                                onClick={() => handleRemind(m.user_id, m.name)}
                                className={ICON_ACTION_DANGER}
                                title="Sending failed — try again"
                                aria-label={`Retry reminder for ${m.name}`}
                              >
                                <BellIcon />
                              </button>
                            )
                          ) : (
                            <span className={EM_DASH}>—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-center">
                          {canReassign ? (
                            <button
                              onClick={() => setReassignTarget(m)}
                              className={ICON_ACTION_REASSIGN}
                              title={`Reassign ${m.name}'s seat`}
                              aria-label={`Reassign ${m.name}`}
                            >
                              <SwapIcon />
                            </button>
                          ) : (
                            <span className={EM_DASH}>—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-center">
                          {canDelete ? (
                            <button
                              onClick={() => handleDelete(m.id, m.name)}
                              disabled={isDeleting}
                              className={ICON_ACTION_DANGER}
                              title={`Delete ${m.name}`}
                              aria-label={`Delete ${m.name}`}
                            >
                              {isDeleting ? <span className="text-sm">…</span> : <TrashIcon />}
                            </button>
                          ) : (
                            <span className={EM_DASH} title="You can't delete your own account">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={8} className={`px-2 py-6 text-center text-sm ${MUTED}`}>
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

        <div
          className={`col-start-1 row-start-1 flex min-h-0 items-start overflow-y-auto transition-[opacity,transform] duration-300 ease-out ${
            reassigning ? 'opacity-100' : 'pointer-events-none scale-[0.98] opacity-0'
          }`}
        >
          {reassignTarget && (
            <ReassignPanel
              member={reassignTarget}
              onClose={() => setReassignTarget(null)}
              onSuccess={handleReassignSuccess}
            />
          )}
        </div>
      </div>
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
      <span className={`text-sm ${MUTED}`}>
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

// Row-action icons — h-4 w-4 to sit comfortably in the h-8 w-8 buttons.
function BellIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}

function SwapIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
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
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1 text-sm font-bold ${pill}`}
    >
      {label}
    </span>
  )
}
