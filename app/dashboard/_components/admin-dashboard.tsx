import Link from 'next/link'
import { InviteForm } from './invite-form'
import { CsvUploadForm } from './csv-upload-form'
import { TeamProvider, ManageTeamPanel, type MemberDetail } from './team-table'
import { ComplianceScore } from './compliance-score'
import { CertificationForecast } from './certification-forecast'
import { ResendInviteAction } from './resend-invite-modal'
import { OutOfSeatsNotice } from './out-of-seats-notice'

const CARD = 'rounded-3xl bg-white p-6 dark:border dark:border-[#1F2429] dark:bg-[#0D0F12]'
const HEADING = 'font-headline text-2xl md:text-3xl font-bold text-[#0A0A0A] dark:text-[#F5F7FA]'
const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'
const LABEL = `text-xs font-bold uppercase tracking-wide ${MUTED}`

// Light card tile holding a bare icon — the coloured chip behind the icon was
// removed (Max) so only the glyph carries the colour. Single source of truth so
// the resend-invite tile (which takes this as a prop) matches for free.
// justify-center matters at lg+, where the tiles stretch to fill the viewport-
// proportional row instead of leaving dead space under a natural-height grid.
const QUICK_ACTION_TILE =
  'flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#E5EEF5] bg-[#F5F7FA] px-3 py-4 transition-all hover:-translate-y-0.5 hover:border-[var(--brand-emphasis)] hover:bg-[#EAF8FF] dark:border-[#1F2429] dark:bg-[#131A20] dark:hover:border-[var(--brand-primary)] dark:hover:bg-[var(--brand-emphasis)]/10'

export interface AdminDashboardProps {
  memberDetails: MemberDetail[]
  /** The signed-in admin's own auth user id — so they can't delete themselves. */
  currentUserId: string
  totalCount: number
  complianceScore: number
  seatsUsed: number
  seatsTotal: number
  seatsRemaining: number
  firmStatus: string
  tier: string
  /** Formatted renewal date, or an em dash when the firm has no period end. */
  renewalDate: string
  /** Days past `current_period_end`; null when there is no period end. */
  daysOverdue: number | null
  isGracePeriod: boolean
  isLapsed: boolean
}

/**
 * The six-block admin dashboard. Pure presentation — all data is resolved by
 * `app/dashboard/page.tsx`, which keeps this renderable from a preview harness.
 *
 * Grid: one 12-col container. 4+8 fills row one (Quick actions / Manage team),
 * 5+7 fills row two (left stack / Certification forecast), so auto-flow lands
 * each block without explicit row placement.
 */
export function AdminDashboard({
  memberDetails,
  currentUserId,
  totalCount,
  complianceScore,
  seatsUsed,
  seatsTotal,
  seatsRemaining,
  firmStatus,
  tier,
  renewalDate,
  daysOverdue,
  isGracePeriod,
  isLapsed,
}: AdminDashboardProps) {
  const seatsPct = seatsTotal > 0 ? Math.min(100, Math.round((seatsUsed / seatsTotal) * 100)) : 0
  const planName = tier.charAt(0).toUpperCase() + tier.slice(1)

  return (
    <TeamProvider memberDetails={memberDetails} currentUserId={currentUserId}>
      {/*
        Row heights at lg+ are fr-based fractions of whatever height the shell hands
        this grid (viewport minus pill + padding — see dashboard-shell.tsx), so the
        whole dashboard fits the screen with no page scroll and bigger monitors get
        proportionally more room. minmax(0, Nfr) — not bare Nfr, which means
        minmax(auto, Nfr) and lets tall content (Manage Team's list) blow the track
        out — keeps the split strict so the internal scrollers actually engage.
        19:26 weights row 2 (Certified/Invitations/Forecast get the height the
        full-bleed shell freed up — Max's call); tune the two numbers here.
        Mobile keeps normal single-column page-scroll (all of this is lg:-only).
      */}
      <div className="grid grid-cols-12 gap-4 lg:h-full lg:grid-rows-[minmax(0,19fr)_minmax(0,26fr)]">
        {/* ── Quick actions ─────────────────────────────────────────────────── */}
        {/* flex-col + flex-1 + grid-rows-2 lets the 2×2 tile grid stretch into the
            row height (tiles grow, no dead space); below lg it sits at natural height. */}
        <section className={`col-span-12 flex flex-col lg:col-span-4 lg:min-h-0 ${CARD}`}>
          <h2 className={`${HEADING} mb-4`}>Quick actions</h2>
          <div className="grid grid-cols-2 gap-3 lg:min-h-0 lg:flex-1 lg:grid-rows-2">
            {/* Not a "send now" action — auto-reminder cadence is configured in Settings. */}
            <QuickAction href="/dashboard/settings" label="Auto-reminders">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </QuickAction>
            <QuickAction href="/api/firm/audit-log/export" label="Export audit log" external>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </QuickAction>
            <QuickAction href="/api/firm/attestation" label="Firm attestation" external>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </QuickAction>
            {/* On-demand resend (item 1) — opens a modal, so it's a client tile, not a link. */}
            <ResendInviteAction tileClassName={QUICK_ACTION_TILE} />
          </div>
        </section>

        {/* ── Manage team (merged table) ────────────────────────────────────── */}
        {/* The row track's definite height is what makes the panel's inner
            flex-1 min-h-0 overflow-y-auto actually clip + scroll. id anchors the
            forecast card's "View who's left" link. */}
        <section id="manage-team" className="col-span-12 lg:col-span-8 lg:min-h-0">
          <ManageTeamPanel />
        </section>

        {/* ── Left stack: Certified + Invitations, then Billing ──────────────── */}
        {/* The row-2 track height gives the flex-1 sub-grid below something
            definite to divide with Billing. */}
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-5 lg:min-h-0">
          {/* Expands to fill the space above Billing (lg:flex-1). lg:grid-rows-1
              makes its single row a 1fr track so Certified + Invitations stretch to
              fill it instead of sitting at natural height with whitespace below. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-rows-1">
            <ComplianceScore score={complianceScore} total={totalCount} />

            {/* flex-col + flex-1 spreads the forms into the full row-track height
                instead of leaving a dead strip at the bottom. justify-center-safe
                (not plain justify-center) is load-bearing: when the forms are
                taller than the track, plain centering overflows in BOTH directions
                and the top half spills over the "Invitations" heading — safe
                centering falls back to start-aligned, and overflow-y-auto keeps
                the excess inside the card. */}
            <section className={`flex flex-col ${CARD}`}>
              <h2 className={`${HEADING} mb-3`}>Invitations</h2>
              <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:justify-center-safe lg:overflow-y-auto">
                <InviteForm seatsRemaining={seatsRemaining} />
                <CsvUploadForm seatsRemaining={seatsRemaining} />
                {seatsRemaining <= 0 && <OutOfSeatsNotice />}
              </div>
            </section>
          </div>

          {/* ── Billing and seats ───────────────────────────────────────────── */}
          <section className={CARD}>
            <div className="mb-2 flex items-start justify-between gap-3">
              {/* Plan subtext reveals beside the heading on hover, not below it. */}
              <div className="group flex min-w-0 items-baseline gap-2.5">
                <h2 className={`${HEADING} whitespace-nowrap`}>Billing and seats</h2>
                <p className="truncate text-xl font-semibold text-[var(--brand-emphasis)] opacity-0 transition-opacity group-hover:opacity-100 dark:text-[var(--brand-primary)]">
                  {planName} Plan &middot; Annual billing
                </p>
              </div>
              <FirmStatusBadge status={firmStatus} />
            </div>

            <div className="mb-4">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className={LABEL}>Seats used</span>
                <span className="text-sm font-bold">
                  {seatsUsed}
                  <span className={`font-medium ${MUTED}`}>/{seatsTotal}</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5EEF5] dark:bg-[#1F2429]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${seatsPct}%`,
                    background: 'linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-emphasis) 100%)',
                  }}
                />
              </div>
            </div>

            {/* Subscription warnings live inline here rather than as page-wide banners. */}
            {isGracePeriod && daysOverdue !== null && (
              <div className="mb-4 rounded-xl border border-[#FDE8B8] bg-[#FFF7E6] px-3 py-2.5 dark:border-[#B45309]/40 dark:bg-[#B45309]/10">
                <p className="text-xs leading-relaxed text-[#B45309] dark:text-[#F0B357]">
                  <strong>Payment overdue.</strong> {30 - daysOverdue} day
                  {30 - daysOverdue !== 1 ? 's' : ''} left to renew before your grace period ends.
                </p>
              </div>
            )}
            {isLapsed && (
              <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEE2E2] px-3 py-2.5 dark:border-[#DC2626]/40 dark:bg-[#DC2626]/10">
                <p className="text-xs leading-relaxed text-[#DC2626] dark:text-[#F87171]">
                  <strong>Your grace period has ended.</strong> Renewing now starts a new subscription
                  cycle. Existing compliance records are preserved.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div>
                <span className={`mb-1 block ${LABEL}`}>Next renewal</span>
                <p className="text-sm font-semibold">{renewalDate}</p>
              </div>
              <a
                href="/api/portal"
                className="shrink-0 rounded-full bg-black px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-gray-800 dark:bg-[#F5F7FA] dark:text-[#0A0A0A] dark:hover:bg-white"
              >
                Manage billing
              </a>
            </div>
          </section>
        </div>

        {/* ── Certification forecast ────────────────────────────────────────── */}
        {/* Took over Team overview's slot when that table merged into Manage team. */}
        <section className="col-span-12 lg:col-span-7 lg:min-h-0">
          <CertificationForecast />
        </section>
      </div>
    </TeamProvider>
  )
}

/* ── Bits ──────────────────────────────────────────────────────────────────── */

function QuickAction({
  href,
  label,
  external = false,
  wide = false,
  children,
}: {
  href: string
  label: string
  external?: boolean
  wide?: boolean
  children: React.ReactNode
}) {
  const className = `${QUICK_ACTION_TILE} ${wide ? 'col-span-2' : ''}`

  const inner = (
    <>
      <span className="flex items-center justify-center text-[var(--brand-emphasis)] dark:text-[var(--brand-primary)]">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          {children}
        </svg>
      </span>
      <span className="text-center text-base font-semibold">{label}</span>
    </>
  )

  // Audit log + attestation are file downloads from route handlers, not app routes.
  return external ? (
    <a href={href} className={className}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={className}>
      {inner}
    </Link>
  )
}

function FirmStatusBadge({ status }: { status: string }) {
  // Only the warning states get a badge. 'active' (and any healthy/unknown status)
  // is redundant — if you're using the dashboard, you're active — so render nothing.
  // These two carry real weight, matching the inline grace/lapsed banners above.
  const config: Record<string, { pill: string; label: string }> = {
    payment_failed: {
      pill: 'bg-[#FFF7E6] text-[#B45309] dark:bg-[#B45309]/15 dark:text-[#F0B357]',
      label: 'Payment failed',
    },
    cancelled: {
      pill: 'bg-[#FEE2E2] text-[#DC2626] dark:bg-[#DC2626]/15 dark:text-[#F87171]',
      label: 'Cancelled',
    },
  }
  const entry = config[status]
  if (!entry) return null
  const { pill, label } = entry

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 py-[3px] text-[11px] font-bold ${pill}`}
    >
      {label}
    </span>
  )
}
