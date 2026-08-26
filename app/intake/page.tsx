import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authorizeIntake,
  getOrCreateOpenSession,
  latestSession,
  loadAnswers,
  seatsPurchased,
} from '@/lib/intake/session'
import { ThemeProvider, ThemeScript } from '@/app/dashboard/_components/theme'
import { IntakeClient } from './_components/intake-client'
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

  const locked = !!latest && latest.status !== 'in_progress'
  const session = locked ? latest : await getOrCreateOpenSession(admin, auth.actor)

  // A locked intake renders no answers at all. Nothing firm-facing shows what
  // was said once it is submitted, and the two sensitive answers are never
  // rendered outside the session that typed them.
  const answers: AnswerMap = locked ? {} : await loadAnswers(admin, session.id)

  const [seats, firm] = await Promise.all([
    seatsPurchased(admin, auth.actor.firmId),
    admin.from('firms').select('name').eq('id', auth.actor.firmId).maybeSingle(),
  ])

  return (
    <ThemeProvider>
      <ThemeScript />
      <IntakeClient
        locked={locked}
        submittedAt={session.submitted_at}
        resumeAt={session.current_question}
        initialAnswers={answers}
        seatsPurchased={seats}
        adminName={auth.actor.name}
        adminEmail={auth.actor.email}
        firmName={firm.data?.name ?? null}
      />
    </ThemeProvider>
  )
}
