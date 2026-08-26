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

  await touchSession(
    admin,
    session.id,
    typeof body.currentQuestion === 'string' ? body.currentQuestion : questionKey,
  )

  return NextResponse.json({ ok: true })
}
