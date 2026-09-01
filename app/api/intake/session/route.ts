// =============================================================================
// GET /api/intake/session — the firm's open intake, plus everything answered.
//
// Creates the session when there is not an open one, so the client has exactly
// one call to make on mount and no "start" step to forget.
// =============================================================================

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authorizeIntake,
  getOrCreateOpenSession,
  latestSession,
  loadAnswers,
  seatsPurchased,
} from '@/lib/intake/session'

export async function GET() {
  const auth = await authorizeIntake()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  // A firm that has already submitted must NOT get a fresh blank intake. The
  // partial unique index only stops two OPEN sessions; without this check,
  // reloading /intake after submitting would silently open a second one and the
  // firm would appear to have lost every answer.
  const latest = await latestSession(admin, auth.actor.firmId)
  if (latest && latest.status !== 'in_progress') {
    return NextResponse.json({
      session: latest,
      answers: {},
      seatsPurchased: await seatsPurchased(admin, auth.actor.firmId),
      locked: true,
    })
  }

  const session = await getOrCreateOpenSession(admin, auth.actor)
  const [answers, seats] = await Promise.all([
    loadAnswers(admin, session.id),
    seatsPurchased(admin, auth.actor.firmId),
  ])

  return NextResponse.json({ session, answers, seatsPurchased: seats, locked: false })
}
