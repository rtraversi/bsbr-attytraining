// =============================================================================
// POST /api/intake/answer — one answer, plus the resume point.
//
// One answer per call rather than a whole-form save. The intake is one question
// at a time and a firm may take days over it; a batched save means a closed tab
// loses everything since the last one.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  authorizeIntake,
  getOrCreateOpenSession,
  latestSession,
  writeAnswer,
  deleteAnswer,
  touchSession,
} from '@/lib/intake/session'
import { getQuestion } from '@/lib/intake/questions'
import { promoteFirmName } from '@/lib/intake/promote'
import type { AnswerValue } from '@/lib/intake/types'

interface Body {
  questionKey?: unknown
  /** Absent or null clears the answer. See AnswerMap — nothing stores an explicit null. */
  value?: unknown
  /** Where the firm is now, written to intake_sessions.current_question. */
  currentQuestion?: unknown
}

export async function POST(req: NextRequest) {
  const auth = await authorizeIntake()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const questionKey = typeof body.questionKey === 'string' ? body.questionKey : null
  if (!questionKey) return NextResponse.json({ error: 'questionKey is required' }, { status: 400 })

  // The key must name a question in the repo's set. Anything else would land a
  // row nothing reads, ride through to Katy's export, and never be prunable
  // (pruneOrphans drops unknown keys, but only once someone runs it).
  if (!getQuestion(questionKey)) {
    return NextResponse.json({ error: `Unknown question "${questionKey}"` }, { status: 400 })
  }

  const admin = createAdminClient()

  // A submitted intake is locked. Refusing here and not only in the UI is the
  // point: the client is not the thing enforcing it.
  const latest = await latestSession(admin, auth.actor.firmId)
  if (latest && latest.status !== 'in_progress') {
    return NextResponse.json({ error: 'This intake has already been submitted' }, { status: 409 })
  }

  const session = await getOrCreateOpenSession(admin, auth.actor)

  if (body.value === undefined || body.value === null) {
    await deleteAnswer(admin, session.id, questionKey)
  } else {
    const { error } = await writeAnswer(admin, session.id, questionKey, body.value as AnswerValue)
    if (error) return NextResponse.json({ error }, { status: 500 })
  }

  // The firm's name lands on firms.name the moment it is typed, not at submit.
  //
  // The Stripe webhook creates the firm with an empty name, and promote at
  // submit used to be the only thing that ever filled it in — so every surface
  // that reads firms.name (the nav pill, invite emails, the intake heading)
  // spent the whole intake with nothing to show. Writing through here is what
  // makes the name appear in real time, because the /intake h1 sits above every
  // section and re-renders on the next load.
  //
  // Reuses promoteFirmName rather than repeating the update: one definition of
  // "what firm_name does to firms.name", trimmed the same way in both places.
  // The promote-time call is deliberately left where it is as the backstop.
  //
  // Deliberately NOT awaited into the response contract: a failed rename must
  // not lose the answer the firm just gave, which is already committed above.
  // The backstop at submit re-runs it.
  if (questionKey === 'firm_name' && typeof body.value === 'string' && body.value.trim()) {
    try {
      await promoteFirmName(admin, auth.actor.firmId, { firm_name: body.value })
    } catch (err) {
      console.error('[intake/answer] promoteFirmName failed:', err)
    }
  }

  await touchSession(
    admin,
    session.id,
    typeof body.currentQuestion === 'string' ? body.currentQuestion : questionKey,
  )

  return NextResponse.json({ ok: true })
}
