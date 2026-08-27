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
  /** Holds a paid seat (0015). With role+status this is the full seat predicate
   *  in lib/seats — CertificationForecast filters on it so members who cannot be
   *  certified stay out of its denominator while still appearing in the table. */
  occupies_seat: boolean
  email: string
  name: string
  trainingStatus: TrainingStatus
  score: number | null
  completedAt: string | null
  certId: string | null
  certNumber: string | null
  certIssuedAt: string | null
  certExpiresAt: string | null
  /** Their invite email failed to send (0016). Cleared by a successful resend. */
  invite_email_failed: boolean
  /** Deliverability PROVEN (0029). Null means unproven, never "bad" — see the
   *  migration. Read with invite_email_failed by needsEmailAttention, which
   *  feeds the deliverability chip in the nav pill (see setup-notices.tsx). */
  email_verified_at: string | null
}

// 'rate_limited' is deliberately distinct from 'error'. A nudge blocked by the
// 48h window is the system working correctly, and the attorney needs to be told
// that — not shown a failure they might retry, and not shown a dead button that
// reads as the feature having been taken away from them.
type RemindState = 'idle' | 'loading' | 'sent' | 'error' | 'rate_limited'

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

      if (res.ok) {
        setRemindStates(s => ({ ...s, [userId]: 'sent' }))
        addToast(`Nudge sent to ${displayName}`)
        return
      }

      // 429 is the 48h nudge window, not a failure. Surface the server's own
      // message — it names the time the next nudge becomes available, which is
      // the only thing that makes the disabled state feel deliberate.
      if (res.status === 429) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setRemindStates(s => ({ ...s, [userId]: 'rate_limited' }))
        addToast(data?.error ?? `You already nudged ${displayName} in the last 48 hours.`)
        return
      }

      setRemindStates(s => ({ ...s, [userId]: 'error' }))
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
  'whitespace-nowrap rounded-lg border border-[#E5EEF5] px-2.5 py-1 text-sm font-semibold text-[#3D3D3D] transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#1F2429] dark:text-[#C4C9CE] dark:hover:border-[var(--brand-primary)] dark:hover:text-[var(--brand-primary)]'

// Per-column row actions: bare icon buttons, one column each (Remind /
// Reassign / Delete). The column headers carry the label, so the buttons stay
// icon-only and the table doesn't balloon. Colours keep the established coding:
// remind orange, reassign blue, delete red.
//
// The contour and hover fill were removed (Max) — only the glyph is left. The
// h-8 w-8 box stays: it is the pointer/tap target, not decoration, and with no
// border left the focus-visible ring is the only thing that marks keyboard
// focus, so it is explicit rather than left to the UA default.
const ICON_ACTION =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-[#0D0F12]'
const ICON_ACTION_REMIND = `${ICON_ACTION} text-[#FF6600]`
const ICON_ACTION_REASSIGN = `${ICON_ACTION} text-[var(--brand-emphasis)] dark:text-[var(--brand-primary)]`
const ICON_ACTION_DANGER = `${ICON_ACTION} text-[#DC2626] dark:text-[#F87171]`

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
                          {m.invite_email_failed && (
                            <span
                              className="mt-1 flex items-center justify-center gap-1 whitespace-nowrap text-xs font-semibold text-[#DC2626] dark:text-[#F87171]"
                              title="Their invite email failed to send. Use the bell to resend it."
                            >
                              <WarningIcon />
                              Invite not delivered
                            </span>
                          )}
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
                              className="text-sm font-semibold text-[var(--brand-emphasis)] hover:underline"
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
                                title={`Nudge ${m.name}`}
                                aria-label={`Nudge ${m.name}`}
                              >
                                <BellIcon />
                              </button>
                            ) : remindState === 'loading' ? (
                              <span className={`text-sm ${MUTED}`}>…</span>
                            ) : remindState === 'sent' ? (
                              <span className="text-sm font-semibold text-[var(--brand-emphasis)]">Sent ✓</span>
                            ) : remindState === 'rate_limited' ? (
                              // Not an error and not a dead control: the reminder
                              // already went out. Muted rather than red, and the
                              // title carries the reason so hovering explains it.
                              <span
                                className={`text-sm ${MUTED}`}
                                title={`${m.name} was nudged in the last 48 hours. You can send another after that.`}
                              >
                                Sent recently
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRemind(m.user_id, m.name)}
                                className={ICON_ACTION_DANGER}
                                title="Sending failed — try again"
                                aria-label={`Retry nudge for ${m.name}`}
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

function WarningIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
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
      pill: 'bg-[#EAF8FF] text-[var(--brand-emphasis)] dark:bg-[var(--brand-emphasis)]/15 dark:text-[var(--brand-primary)]',
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
