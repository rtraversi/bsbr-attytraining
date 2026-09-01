// =============================================================================
// Policy intake — promote.
//
// At submit, the three facts the platform genuinely needs move out of the
// transient answer tables and into the real ones, where they live like any
// other data:
//
//   firm_name                        → firms.name
//   roster rows                      → an auth user each + a firm_members row
//   count of non-attorney roster rows → the seat count
//
// Everything else stays in intake_answers / intake_sensitive and is wiped once
// the policy is delivered.
//
// ── 🔴 THIS IS NOT ONE POSTGRES TRANSACTION, AND CANNOT BE ──────────────────
//
// Auth users are created through GoTrue's admin API. No BEGIN encloses an HTTP
// call to another service, so a single atomic promote is not available at any
// price. Pretending otherwise would be the dangerous option, because the
// failure it hides is a firm whose roster half-landed.
//
// What replaces it, and it has to be read as a whole:
//
//   1. EVERY STEP IS IDEMPOTENT. Re-running promote renames a firm to the name
//      it already has, skips a member who already exists, and re-stamps a name
//      that is already correct.
//   2. THE STATUS FLIP HAPPENS LAST, in the caller. A promote that fails
//      halfway leaves intake_sessions.status = 'in_progress', so the firm
//      presses Send again and the second run finishes what the first did not.
//   3. NOTHING HERE IS DESTRUCTIVE. It creates and updates; it never deletes a
//      member, never demotes an admin, and never removes someone the roster
//      omits. Removing staff is a dashboard action with its own confirmation,
//      not a side effect of a form.
//
// ── It RECONCILES, it does not refuse ───────────────────────────────────────
//
// A firm can invite three people, look around, and only then do the intake and
// roster five. Exploring is allowed (Katy reversed the hard gate on 2026-08-26
// 12:11), so inviting while exploring is allowed too, and promote has to expect
// an overlap rather than treat one as an error.
//
// firm_members carries unique (firm_id, user_id), so a plain insert fails the
// moment somebody is already there. Every roster row is therefore matched on the
// RESOLVED AUTH USER ID: an existing member is updated in place, and only the
// genuinely new ones are inserted. Matching on the user id rather than the email
// string is what makes that reliable — find_user_id_by_email compares
// case-insensitively, so "S.Chen@firm.com" on the roster finds the
// "s.chen@firm.com" already invited.
//
// ── What it deliberately does NOT do ────────────────────────────────────────
//
// NO INVITES ARE SENT. The roster feeds a dashboard action the admin fires when
// they are ready, reusing the bulk-invite path minus the send.
//
// seats.max_seats IS NOT REWRITTEN. See the seat note on promoteRoster.
// =============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import type { AnswerMap, RosterRow } from './types'

type AdminClient = ReturnType<typeof createAdminClient>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export interface PromoteResult {
  firmName: string | null
  /** Roster rows that produced a brand new auth user. */
  created: number
  /** Roster rows that matched somebody already in this firm and were updated. */
  updated: number
  /**
   * Rows that were skipped, with why. Never fatal — a promote that refused one
   * row must not strand the whole policy, and the admin can fix the row and
   * press Send again.
   */
  skipped: { email: string; reason: 'invalid_email' | 'other_firm' | 'create_failed' }[]
  /** Non-attorney roster rows — what used_seats should equal once the trigger settles. */
  trainingSeats: number
}

/**
 * firm_name → firms.name.
 *
 * The firm row has carried the literal placeholder 'My Firm' since the Stripe
 * webhook created it (app/api/webhooks/stripe/route.ts). This is the first
 * moment the platform learns what the firm is actually called — the name is
 * question one of the intake and stays there, because Katy would not have it
 * moved out (2026-08-25 11:04).
 */
async function promoteFirmName(
  admin: AdminClient,
  firmId: string,
  answers: AnswerMap,
): Promise<string | null> {
  const name = typeof answers['firm_name'] === 'string' ? answers['firm_name'].trim() : ''
  if (!name) return null

  await admin.from('firms').update({ name }).eq('id', firmId)
  return name
}

/**
 * The roster → auth users + firm_members.
 *
 * ── Why this is not a plain insert ──────────────────────────────────────────
 *
 * app/api/invite/bulk/route.ts already accepts { name, email } per row and
 * SILENTLY DISCARDS the name: it calls createUser(email) and never writes
 * user_metadata.full_name. The name on a certificate therefore comes from the
 * staff member typing it at password-set, and cert generation falls back to the
 * EMAIL ADDRESS when they do not (app/api/certs/generate/route.ts:102) — so a
 * paralegal who skipped the field gets a compliance certificate made out to
 * paralegal@firm.com.
 *
 * The roster is now authoritative for names (Max, 2026-08-26), and the field is
 * gone from the password-set screen in the same change. That obliges this
 * function to stamp user_metadata.full_name itself. It is the whole reason the
 * bulk-invite path could not simply be reused here.
 *
 * ── How the seat count is reached ───────────────────────────────────────────
 *
 * occupies_seat = !isAttorney. The sync_used_seats trigger from 0015 then counts
 * exactly the non-attorney rows, so used_seats lands on the roster's
 * non-attorney count with NO change to that trigger and NO change to
 * lib/seats.ts. Katy, 2026-08-25 11:57: attorneys never consume a seat and use
 * the training for free.
 *
 * 🔴 seats.max_seats is NOT rewritten from the roster. max_seats is what Stripe
 * sold, and pushing a changed quantity to Stripe is explicitly out of this
 * build. Setting it from the roster would either hand a firm capacity it never
 * paid for or shrink capacity it did. A roster over the seats bought is flagged
 * and never blocked (Max, 2026-08-26), so a firm can finish an intake
 * over-subscribed and somebody settles it afterwards.
 */
async function promoteRoster(
  admin: AdminClient,
  firmId: string,
  rows: RosterRow[],
): Promise<Omit<PromoteResult, 'firmName'>> {
  const skipped: PromoteResult['skipped'] = []
  let created = 0
  let updated = 0

  // Who is already in this firm, by auth user id. Used to tell "update the
  // admin's own row" apart from "add somebody new".
  const { data: existingMembers } = await admin
    .from('firm_members')
    .select('id, user_id, role')
    .eq('firm_id', firmId)

  const membersByUserId = new Map((existingMembers ?? []).map((m) => [m.user_id, m]))

  for (const row of rows) {
    const email = (row.email ?? '').trim().toLowerCase()
    const name = (row.name ?? '').trim()

    if (!EMAIL_RE.test(email)) {
      skipped.push({ email, reason: 'invalid_email' })
      continue
    }

    // Resolve first. find_user_id_by_email (0018) compares case-insensitively,
    // because Stripe echoes whatever the buyer typed while GoTrue stores the
    // address lowercased — and it orders by created_at so a duplicate address
    // resolves deterministically rather than to an arbitrary row.
    const { data: foundId } = await admin.rpc('find_user_id_by_email', { p_email: email })
    let userId = (foundId as string | null) ?? null

    if (userId) {
      // 🔴 The firm guard comes BEFORE anything is written. An email that
      // already belongs to another firm's staff must not be renamed, re-homed
      // or attached here — that is one firm editing another firm's employee,
      // and the same refusal the Stripe webhook makes as `email_in_use`.
      const { data: userRecord } = await admin.auth.admin.getUserById(userId)
      const existingFirmId = userRecord?.user?.app_metadata?.firm_id as string | undefined

      if (existingFirmId && existingFirmId !== firmId) {
        skipped.push({ email, reason: 'other_firm' })
        continue
      }
    } else {
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        // Stamped at creation rather than in a follow-up call, so a user can
        // never exist with no name for a window in which something reads it.
        user_metadata: name ? { full_name: name } : undefined,
      })

      if (createError || !newUser?.user) {
        skipped.push({ email, reason: 'create_failed' })
        continue
      }

      userId = newUser.user.id
      created += 1
    }

    // The roster wins on names, so this re-stamps every time — including for
    // somebody who already had one. That is the point of "authoritative".
    //
    // app_metadata is only written for a user who does not already belong to
    // this firm. Writing role here unconditionally would demote the buyer to
    // 'employee' the moment they appear on their own roster, which is a firm
    // locking itself out of its own dashboard.
    await admin.auth.admin.updateUserById(userId, {
      ...(name ? { user_metadata: { full_name: name } } : {}),
      ...(membersByUserId.has(userId) ? {} : { app_metadata: { firm_id: firmId, role: 'employee' } }),
    })

    const existing = membersByUserId.get(userId)

    if (existing) {
      await admin
        .from('firm_members')
        .update({
          is_attorney: row.isAttorney,
          // Katy, 2026-08-25: the admin's own attorney answer is what decides
          // whether they occupy a seat. The trigger watches this column, so the
          // update settles used_seats by itself.
          occupies_seat: !row.isAttorney,
        })
        .eq('id', existing.id)
      updated += 1
    } else {
      const { data: inserted, error: memberError } = await admin
        .from('firm_members')
        .insert({
          firm_id: firmId,
          user_id: userId,
          role: 'employee',
          // 'invited' and not 'active': the seat is reserved from this moment
          // (Max, 2026-07-29) but nobody has been emailed yet, and status is what
          // the dashboard reads to decide whether an invite is still outstanding.
          status: 'invited',
          is_attorney: row.isAttorney,
          occupies_seat: !row.isAttorney,
        })
        .select('id')
        .maybeSingle()

      if (memberError) {
        // The auth user survives deliberately. Deleting it would be destructive
        // on a re-run — the second attempt resolves the same address, finds no
        // member row, and inserts one. Rolling back here would instead delete an
        // account that may already have been used.
        console.error('[intake/promote] firm_members insert failed:', memberError)
        skipped.push({ email, reason: 'create_failed' })
        continue
      }

      // The REAL id, not a placeholder. A roster that lists the same person
      // twice (two spellings of one address) reaches the update branch on the
      // second pass, and an empty id there would silently update nothing.
      if (inserted) membersByUserId.set(userId, { id: inserted.id, user_id: userId, role: 'employee' })
    }
  }

  return {
    created,
    updated,
    skipped,
    trainingSeats: rows.filter((r) => !r.isAttorney).length,
  }
}

/**
 * Promote one submitted intake. Safe to call again on the same session.
 *
 * The caller flips intake_sessions.status AFTER this returns — see the header.
 */
export async function promoteIntake(
  admin: AdminClient,
  firmId: string,
  answers: AnswerMap,
): Promise<PromoteResult> {
  const firmName = await promoteFirmName(admin, firmId, answers)

  const rows = Array.isArray(answers['roster']) ? (answers['roster'] as RosterRow[]) : []
  const roster = await promoteRoster(admin, firmId, rows)

  return { firmName, ...roster }
}
