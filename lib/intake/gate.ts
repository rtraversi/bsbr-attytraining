// =============================================================================
// Policy intake — has this firm done it, and what should the dashboard say.
//
// ── 🔴 THIS NO LONGER GATES ANYTHING ────────────────────────────────────────
//
// It did. Batch 4 put a hard redirect in middleware: an admin whose firm had no
// submitted intake went to /intake from wherever they landed, with only billing
// and support exempt.
//
// Katy reversed the decision behind that on 2026-08-26 12:11: "The problem is
// that the intake is time consuming. People will want to explore without having
// to fill it all in." A firm that has just paid gets to look around first. The
// redirect contradicted her directly, so it is gone, and so is the per-request
// query that fed it — nothing redirects, so nothing should cost a round-trip on
// every request to decide not to.
//
// What replaces it is one query in app/dashboard/page.tsx driving a NOTICE.
//
// ── Why the notice must not be dismissible ──────────────────────────────────
//
// Because it is now the ONLY thing that gets the intake completed. Nothing
// forces it, nothing blocks on it, and a firm that dismisses the prompt has no
// remaining path to the product they actually bought — the written policy. A
// dismissible nudge for a task with no other route to it is a nudge that gets
// dismissed once and never seen again.
//
// The file survives the reversal because the QUESTION survives it. Only the
// consequence changed.
// =============================================================================

import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Where the notice's button goes. /intake resumes at current_question itself. */
export const INTAKE_PATH = '/intake'

/**
 * Has this firm submitted an intake?
 *
 * Service-role, because the caller is a Server Component that already holds an
 * admin client for its other reads — not because RLS would refuse. 0028 gives
 * firm admins a SELECT policy on intake_sessions and it works (pinned in
 * tests/intake-promote.test.ts).
 *
 * Fails OPEN — a query fault reads as "submitted" and shows no notice. Nothing
 * depends on the answer any more, and a database hiccup that pastes an alarming
 * banner across a working dashboard is worse than a hiccup that shows nothing.
 */
export async function hasSubmittedIntake(admin: AdminClient, firmId: string): Promise<boolean> {
  const { data, error } = await admin
    .from('intake_sessions')
    .select('id')
    .eq('firm_id', firmId)
    .eq('status', 'submitted')
    .limit(1)
    .maybeSingle()

  if (error) return true
  return !!data
}

/**
 * Whether an intake is part-finished, so the notice can say "pick up where you
 * left off" rather than "get started" to somebody who already has.
 */
export async function intakeInProgress(admin: AdminClient, firmId: string): Promise<boolean> {
  const { data } = await admin
    .from('intake_sessions')
    .select('id, current_question')
    .eq('firm_id', firmId)
    .eq('status', 'in_progress')
    .maybeSingle()

  return !!data?.current_question
}
