import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authorizeIntake,
  getOrCreateOpenSession,
  latestSession,
  loadAnswers,
  seatsPurchased,
  seedAutoAnswers,
} from '@/lib/intake/session'
import { buildReview, intakeStateOf } from '@/lib/intake/review'
import { retentionOf } from '@/lib/intake/retention'
import { ThemeProvider, ThemeScript } from '@/app/dashboard/_components/theme'
import { IntakeClient } from './_components/intake-client'
import { IntakeReview } from './_components/intake-review'
import { IntakeShell } from './_components/intake-shell'

export const metadata = {
  title: "Your firm's AI policy — IURIX",
}

/**
 * The policy intake.
 *
 * Batch 4 reroutes the post-checkout flow into this page; for now it is reached
 * directly. It sits OUTSIDE /dashboard on purpose — Katy, 2026-08-25: "I want
 * the intake to be there, at the beginning", and "I dont want the name part to
 * move, I want the whole intake there". It is what the firm lands on, not a tab
 * inside the thing it comes before.
 *
 * The session is resolved here rather than by a fetch on mount, so the first
 * paint is the first question and not a spinner. GET /api/intake/session shares
 * the same helpers and exists for the client to re-sync.
 */
export default async function IntakePage() {
  const auth = await authorizeIntake()

  // Not signed in → login. Signed in but not an admin of a firm → the dashboard
  // will route them wherever they belong. The intake collects a roster of the
  // whole firm and two admissions made in confidence; an employee has no
  // business in any of it.
  if (!auth.ok) redirect(auth.status === 401 ? '/login' : '/dashboard')

  const admin = createAdminClient()
  const latest = await latestSession(admin, auth.actor.firmId)

  const { data: firm } = await admin
    .from('firms')
    .select('name')
    .eq('id', auth.actor.firmId)
    .maybeSingle()
  const firmName = firm?.name ?? null

  // ── Submitted or delivered: read-only, and both can be reopened ──────────
  //
  // Until 2026-08-28 both of these were one `locked` flag that loaded no
  // answers at all, so a firm that pressed Send saw an empty screen from then
  // on. There used to be a third state here, `purged`, which had nothing to
  // show and said so; D8-1 removed it, and the answers are always there now.
  const state = intakeStateOf(latest)

  if (latest && state !== 'editable') {
    const [answers, firmRow] = await Promise.all([
      loadAnswers(admin, latest.id),
      admin
        .from('firms')
        .select('status, current_period_end')
        .eq('id', auth.actor.firmId)
        .maybeSingle(),
    ])

    return (
      <ThemeProvider>
        <ThemeScript />
        <IntakeShell firmName={firmName}>
          <IntakeReview
            state={state}
            sections={buildReview(answers)}
            submittedAt={latest.submitted_at}
            deliveredAt={latest.policy_delivered_at}
            reopenedCount={latest.reopened_count ?? 0}
            retention={retentionOf(firmRow.data)}
          />
        </IntakeShell>
      </ThemeProvider>
    )
  }

  // ── Open: the editable intake ────────────────────────────────────────────
  const session = await getOrCreateOpenSession(admin, auth.actor)
  const [loaded, seats] = await Promise.all([
    loadAnswers(admin, session.id),
    seatsPurchased(admin, auth.actor.firmId),
  ])

  // 🔴 Question one is seeded as a REAL answer row, not as a display-only prop.
  //
  // It was a prop until 2026-09-02, and the bug that produced was reported from
  // a browser: the field looked filled in, but the value was never in `answers`,
  // so missingRequired() reported firm_name missing and Send refused until the
  // firm RETYPED the name it had already given at the gate.
  //
  // Persisting it also means the submit route — which reads the database, not
  // the client's state — sees it.
  const answers = await seedAutoAnswers(admin, session.id, loaded, firmName)

  return (
    <ThemeProvider>
      <ThemeScript />
      <IntakeClient
        resumeAt={session.current_question}
        initialAnswers={answers}
        seatsPurchased={seats}
        adminName={auth.actor.name}
        adminEmail={auth.actor.email}
        firmName={firmName}
      />
    </ThemeProvider>
  )
}
