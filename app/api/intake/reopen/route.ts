import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeIntake, latestSession } from '@/lib/intake/session'

/**
 * Reopen a submitted intake so the firm can correct it.
 *
 * ── D8-2: available INDEFINITELY, including after delivery ──────────────────
 *
 * This used to refuse once `policy_delivered_at` was set, on the reasoning that
 * changing the answers would leave them disagreeing with the delivered
 * document. Katy reversed it on 2026-08-31: "they can update their answers
 * indefinitely to update the policy as they aquire more information, or change
 * their mind about free text items."
 *
 * The disagreement is the point of the edit. A firm that revises its answers
 * wants a revised policy, and the assembler regenerates one deterministically
 * from whatever the answers now say.
 *
 * ── The conditional UPDATE is the whole safety story ────────────────────────
 *
 * One statement, with every precondition in its WHERE clause, so there is no
 * gap between checking and writing. A read-then-write would let two tabs both
 * pass the check and both reopen, and the second would bump the counter for a
 * change nobody made.
 *
 * 🔴 23505 IS AN EXPECTED OUTCOME, NOT A BUG. 0028 puts a UNIQUE index on
 * (firm_id) WHERE status = 'in_progress', so this UPDATE is moving a row INTO a
 * uniquely-constrained state. If the firm somehow already has an open intake,
 * Postgres refuses and we report it. That index is what makes reopening safe:
 * it is impossible for a reopen to produce two open sessions racing each other
 * into promote, and we get that guarantee without a pre-check that could be
 * raced.
 *
 * The counter is the reason 0030 exists, and D8-2 does not retire it — only
 * the LOCK moved, not the RECORD. Katy may already be drafting; answers
 * changing under her silently is worse than not allowing the edit, so every
 * reopen is recorded and her export can say the intake moved after she got it.
 */
export async function POST() {
  const auth = await authorizeIntake()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const latest = await latestSession(admin, auth.actor.firmId)

  if (!latest) {
    return NextResponse.json({ error: 'There is no intake to reopen.' }, { status: 404 })
  }

  if (latest.status === 'in_progress') {
    // Already open — most likely a second tab got there first. Not an error
    // worth showing: the caller refreshes and finds the editable intake, which
    // is what they wanted.
    return NextResponse.json({ ok: true, alreadyOpen: true })
  }

  const { data, error } = await admin
    .from('intake_sessions')
    .update({
      status: 'in_progress',
      reopened_at: new Date().toISOString(),
      reopened_by: auth.actor.userId,
      // Read-modify-write on a counter is a race. Postgres has no `+ 1` through
      // PostgREST, so this is the one place the statement is not fully atomic —
      // and it is safe here because the WHERE clause below only matches a
      // SUBMITTED row. Two concurrent reopens cannot both match: the first
      // flips it to in_progress and the second finds nothing to update.
      reopened_count: (latest.reopened_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', latest.id)
    .eq('firm_id', auth.actor.firmId)
    // `status` is still the only precondition: a delivered session is a
    // SUBMITTED row that also carries policy_delivered_at, so matching on
    // status alone now covers both states D8-2 opens up, and still cannot
    // match an already-open one.
    .eq('status', 'submitted')
    .select('id')
    .maybeSingle()

  if (error) {
    // See the header: this is the 0028 index doing its job, not a fault.
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'This firm already has an intake open. Refresh and carry on with that one.' },
        { status: 409 },
      )
    }
    console.error('[intake/reopen] update failed:', error)
    return NextResponse.json({ error: 'Could not reopen the intake.' }, { status: 500 })
  }

  // Zero rows matched. The preconditions are in the WHERE clause, so re-read to
  // say WHICH one refused rather than a generic failure — "your policy has
  // already been delivered" is an answer; "could not reopen" is not.
  if (!data) {
    // With delivery no longer a bar, the only way to get here is a session that
    // is not in the submitted state — it was opened by another tab between the
    // read above and this write. Re-read so the message says which.
    const fresh = await latestSession(admin, auth.actor.firmId)
    if (fresh?.status === 'in_progress') {
      return NextResponse.json({ ok: true, alreadyOpen: true })
    }
    return NextResponse.json({ error: 'That intake could not be reopened.' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
