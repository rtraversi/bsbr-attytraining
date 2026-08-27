// =============================================================================
// POST /api/intake/submit — validate, prune, promote, lock.
//
// The order is the design, not an accident:
//
//   1. VALIDATE against the STORED answers. The client runs the same check to
//      decide what to turn red; this one is what actually decides.
//   2. PRUNE orphans. Last moment a retracted answer can be removed before it
//      reaches Katy — see the notetaker example on pruneOrphans.
//   3. PROMOTE. firm_name → firms.name, the roster → auth users + firm_members,
//      the non-attorney count → the seat count.
//   4. FLIP the status, and only then.
//
// 🔴 Step 4 is last because step 3 CANNOT be one transaction. Auth users are
// created through GoTrue's admin API and no BEGIN encloses an HTTP call to
// another service. So promote is idempotent instead, and while the status is
// still 'in_progress' the firm can press Send again and the second run finishes
// what the first did not. Flipping the status first would turn a half-finished
// promote into a locked intake with no way to complete it — the failure mode
// this ordering exists to make impossible.
//
// Invites are deliberately NOT sent here. The roster feeds a dashboard action
// the admin fires when ready, reusing the bulk-invite path minus the send.
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
import {
  isComplete,
  missingRequired,
  orphanKeys,
  pruneOrphans,
  rosterOverSeats,
} from '@/lib/intake/branching'
import { promoteIntake } from '@/lib/intake/promote'
import { getQuestion } from '@/lib/intake/questions'
import type { RosterRow } from '@/lib/intake/types'

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

  // ── the seat cap ──────────────────────────────────────────────────────────
  //
  // Enforced here as well as in the roster screen, because the client is not the
  // thing that decides. Max reversed flag-never-block on 2026-08-26: a firm
  // cannot roster more NON-ATTORNEY staff than it has seats for. Attorneys are
  // unlimited and never consume a seat.
  //
  // Known and accepted: a capped firm cannot reach full accreditation until it
  // buys the extra seat. That is the intended consequence.
  //
  // 🔴 A SEAT COUNT WE CANNOT READ IS NOT A SEAT COUNT OF ZERO, AND NOT NO CAP.
  //
  // seatsPurchased() used to answer 0 for a missing row, a slow read and a
  // failed one alike, and 0 meant "unknown, so no cap" — so the one thing that
  // could not check the roster was also the one thing that waved it through, and
  // a firm could promote past its seat count. The roster SCREEN stays permissive
  // on null, because nobody should get a dead form over a slow query. This route
  // must not: it is what writes the auth users and the firm_members rows.
  //
  // The message says what is actually wrong. Reusing the over-seats copy here
  // would tell a firm within its seats to go and buy more — a lie, and one they
  // could act on by spending money they did not need to.
  const roster = Array.isArray(answers['roster']) ? (answers['roster'] as RosterRow[]) : []
  const seats = await seatsPurchased(admin, auth.actor.firmId)

  if (seats === null) {
    return NextResponse.json(
      {
        error:
          'We could not read how many seats your firm has, so we have not sent this yet. Nothing you typed is lost — try again in a moment, and contact support if it keeps happening.',
      },
      { status: 503 },
    )
  }

  const over = rosterOverSeats(roster, seats)

  if (over > 0) {
    return NextResponse.json(
      {
        error: `Your roster lists ${over} more ${over === 1 ? 'person' : 'people'} needing training than you have seats for. Add ${over} more ${over === 1 ? 'seat' : 'seats'} in Billing, or take them off the roster.`,
        overSeats: over,
      },
      { status: 422 },
    )
  }

  // ── promote ───────────────────────────────────────────────────────────────
  //
  // Promoted from the PRUNED map, not the raw one. A retracted answer must not
  // reach firms or firm_members any more than it reaches Katy.
  let promoted
  try {
    promoted = await promoteIntake(admin, auth.actor.firmId, pruneOrphans(answers))
  } catch (err) {
    // The session is still 'in_progress', so nothing is lost and Send can be
    // pressed again. Reporting the failure beats locking the intake behind it.
    console.error('[intake/submit] promote failed:', err)
    return NextResponse.json(
      { error: 'We saved your answers but could not finish setting up your firm. Try again in a moment.' },
      { status: 500 },
    )
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

  return NextResponse.json({ ok: true, submittedAt, prunedKeys: orphans, promoted })
}
