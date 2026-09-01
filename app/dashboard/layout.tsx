import { NavPill, type SetupState } from './_components/nav-pill'
import { DashboardShell } from './_components/dashboard-shell'
import { ThemeProvider, ThemeScript } from './_components/theme'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasSubmittedIntake, intakeInProgress } from '@/lib/intake/gate'
import { latestSession } from '@/lib/intake/session'
import { intakeStateOf } from '@/lib/intake/review'
import { needsEmailAttention } from '@/lib/email-verification'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = (user?.app_metadata?.role as string | undefined) ?? null

  // Firm name for the nav pill (same firm_id source as app/dashboard/training/page.tsx).
  const firmId = user?.app_metadata?.firm_id as string | undefined
  let firmName: string | null = null
  let setup: SetupState | null = null
  let policyDelivered = false

  if (firmId) {
    const admin = createAdminClient()
    const { data: firm } = await admin.from('firms').select('name').eq('id', firmId).maybeSingle()
    firmName = firm?.name ?? null

    // Setup chips are admin-only, so employees pay for none of this.
    if (role === 'admin') {
      setup = await resolveSetupState(firmId)

      // The Policy nav link, gated on the policy actually being delivered — a
      // link to a waiting screen teaches people to ignore the nav. One indexed
      // single-row read, admin only, and it reuses intakeStateOf() rather than
      // asking its own question so the nav and the page cannot disagree about
      // whether a policy exists. That matters for the D8-2 case: a firm that
      // resubmitted after delivery is back to `submitted`, and the link goes
      // away again until the revision is released.
      policyDelivered = intakeStateOf(await latestSession(admin, firmId)) === 'delivered'
    }
  }

  const pill = (
    <NavPill
      firmName={firmName}
      role={role}
      setup={setup}
      policyDelivered={policyDelivered}
    />
  )

  // Shell choice is route-based (see DashboardShell): the training routes always
  // get the training shell + bottom tab bar regardless of role, so an admin can
  // take their own training. ThemeProvider/ThemeScript wrap both shells identically.
  return (
    <ThemeProvider>
      <ThemeScript />
      <DashboardShell role={role} pill={pill}>
        {children}
      </DashboardShell>
    </ThemeProvider>
  )
}

/**
 * What the two setup chips in the nav pill need.
 *
 * ── Why this is in the LAYOUT and not the dashboard page ────────────────────
 *
 * Because the pill is in the layout. The chips replaced two full-width banners
 * that app/dashboard/page.tsx rendered inside AdminDashboard; a page cannot feed
 * a sibling that the layout renders above it without a client context and a
 * post-hydration flash, so the reads moved up with the UI.
 *
 * ⚠️ The cost is real and worth stating: this runs on every /dashboard route for
 * an admin, where before it ran only on /dashboard. It is three queries — two
 * single-row intake lookups and one firm_members select — all on indexed
 * firm_id, and they run in parallel with each other. Auth lookups, the expensive
 * part, happen ONLY for members already flagged, which for a healthy firm is
 * zero. Net for /dashboard itself is unchanged, since page.tsx dropped the same
 * intake reads in the same commit.
 *
 * Related but separate: the ~5s-per-route auth cost in STATE.md §5 is
 * getUser()-vs-getClaims() and is untouched by this.
 *
 * Fails quiet. Every branch degrades to "no chip", never to a broken pill —
 * `hasSubmittedIntake` already fails OPEN by design, and a failed member read
 * yields an empty list. A database hiccup must not paste an alarm across a
 * working dashboard.
 */
async function resolveSetupState(firmId: string): Promise<SetupState | null> {
  const admin = createAdminClient()

  const [intakeSubmitted, intakeResumable, membersRes] = await Promise.all([
    hasSubmittedIntake(admin, firmId),
    intakeInProgress(admin, firmId),
    admin
      .from('firm_members')
      .select('id, user_id, invite_email_failed, email_verified_at')
      .eq('firm_id', firmId)
      // Deleted and reassigned members are people the firm no longer expects to
      // reach. Same exclusions app/dashboard/page.tsx applies.
      .neq('status', 'deleted')
      .neq('status', 'reassigned'),
  ])

  const flagged = (membersRes.data ?? []).filter(needsEmailAttention)

  // Only now, and only for the flagged rows, do we pay for an auth lookup to get
  // the address. Resolving all of them up front would put one GoTrue round-trip
  // per member on every dashboard route.
  const unreachable = await Promise.all(
    flagged.map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id)
      const email = data?.user?.email ?? '(unknown)'
      return {
        id: m.id,
        email,
        // firm_members has no name column. Matches page.tsx's resolution exactly
        // — and the chip's popover prints this ONCE, because for almost every
        // member full_name is unset and this IS the email.
        name: (data?.user?.user_metadata?.full_name as string | undefined) || email,
        invite_email_failed: m.invite_email_failed,
      }
    }),
  )

  // Nothing outstanding — no chips, so hand the pill nothing to render.
  if (intakeSubmitted && unreachable.length === 0) return null

  return { intakeSubmitted, intakeInProgress: intakeResumable, unreachable }
}
