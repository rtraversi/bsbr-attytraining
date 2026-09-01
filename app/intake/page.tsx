import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authorizeIntake,
  getOrCreateOpenSession,
  latestSession,
  loadAnswers,
  seatsPurchased,
} from '@/lib/intake/session'
import { buildReview, intakeStateOf } from '@/lib/intake/review'
import { ThemeProvider, ThemeScript } from '@/app/dashboard/_components/theme'
import { IntakeClient } from './_components/intake-client'
import { IntakeReview } from './_components/intake-review'
import { IntakeShell } from './_components/intake-shell'
import type { AnswerMap } from '@/lib/intake/types'

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

  // ── Submitted, delivered or purged: read-only ────────────────────────────
  //
  // Until 2026-08-28 all three of these were one `locked` flag that loaded no
  // answers at all, so a firm that pressed Send saw an empty screen from then
  // on and could not check or correct anything they had said. Now the three
  // are distinct, and only the last of them has nothing to show.
  const state = intakeStateOf(latest)

  if (latest && state !== 'editable') {
    // Nothing is read on a purged session. There is nothing there — that is
    // what purged means — and the screen says so rather than rendering an
    // empty page.
    const answers: AnswerMap = state === 'purged' ? {} : await loadAnswers(admin, latest.id)

    return (
      <ThemeProvider>
        <ThemeScript />
        <IntakeShell firmName={firmName}>
          <IntakeReview
            state={state}
            sections={state === 'purged' ? [] : buildReview(answers)}
            submittedAt={latest.submitted_at}
            deliveredAt={latest.policy_delivered_at}
            reopenedCount={latest.reopened_count ?? 0}
          />
        </IntakeShell>
      </ThemeProvider>
    )
  }

  // ── Open: the editable intake ────────────────────────────────────────────
  const session = await getOrCreateOpenSession(admin, auth.actor)
  const [answers, seats] = await Promise.all([
    loadAnswers(admin, session.id),
    seatsPurchased(admin, auth.actor.firmId),
  ])

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
