// =============================================================================
// POST /api/intake/submit — lock the intake.
//
// 🔴 THIS ROUTE DOES NOT PROMOTE. 🔴
//
// firm_name → firms.name, the roster → firm_members, and the non-attorney count
// → the seat count are all BATCH 4. They are deliberately not here: promote has
// to be one transaction alongside the auth-user provisioning that carries the
// roster name into user_metadata.full_name (see the roster-wins-on-names note in
// .planning/intake-spec.md), and half of that does not exist yet. A promote
// bolted onto this route would be a sequence of calls that can half-fail, which
// is the exact thing migration 0028 was shaped to avoid.
//
// What this route does: re-validate completeness on the server, drop orphaned
// answers, and flip the session to 'submitted'.
// =============================================================================

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeIntake, getOrCreateOpenSession, latestSession, loadAnswers } from '@/lib/intake/session'
import { isComplete, missingRequired, orphanKeys } from '@/lib/intake/branching'
import { getQuestion } from '@/lib/intake/questions'

export async function POST() {
  const auth = await authorizeIntake()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()

  const latest = await latestSession(admin, auth.actor.firmId)
  if (latest && latest.status !== 'in_progress') {
    return NextResponse.json({ error: 'This intake has already been submitted' }, { status: 409 })
  }

  const session = await getOrCreateOpenSession(admin, auth.actor)
  const answers = await loadAnswers(admin, session.id)

  // Validated against the stored answers, not against anything the client sends.
  // The client runs the same check to decide what to turn red; this one is what
  // actually decides.
  if (!isComplete(answers)) {
    return NextResponse.json(
      { error: 'Some questions are still unanswered', missing: missingRequired(answers).map((q) => q.key) },
      { status: 422 },
    )
  }

  // Prune before locking, not after. A retracted answer — the notetaker scope a
  // firm filled in before changing the stance to "not permitted" — would
  // otherwise ride into Katy's export and she would draft from something the
  // firm withdrew. This is the last moment anything can remove it.
  const orphans = orphanKeys(answers)
  if (orphans.length > 0) {
    const ordinary = orphans.filter((key) => !getQuestion(key)?.sensitive)
    const sensitive = orphans.filter((key) => getQuestion(key)?.sensitive)

    if (ordinary.length > 0) {
      await admin.from('intake_answers').delete().eq('session_id', session.id).in('question_key', ordinary)
    }
    if (sensitive.length > 0) {
      await admin.from('intake_sensitive').delete().eq('session_id', session.id).in('question_key', sensitive)
    }
  }

  const submittedAt = new Date().toISOString()

  // Conditional on status so a double-submit from two tabs writes once. The
  // second gets zero rows back and reads as already submitted, which it is.
  const { data, error } = await admin
    .from('intake_sessions')
    .update({ status: 'submitted', submitted_at: submittedAt, updated_at: submittedAt })
    .eq('id', session.id)
    .eq('status', 'in_progress')
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'This intake has already been submitted' }, { status: 409 })
  }

  return NextResponse.json({ ok: true, submittedAt, prunedKeys: orphans })
}
