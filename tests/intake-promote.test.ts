/**
 * Promote — the intake's answers becoming real rows.
 *
 * Driven against a real database, because everything worth checking here IS the
 * database: the roster name has to survive into user_metadata.full_name, and the
 * seat count has to fall out of the sync_used_seats trigger from 0015 rather
 * than out of any arithmetic in our own code. A mocked version of this would
 * only assert that the mock was written to match the code.
 *
 * What it pins:
 *   - the roster name reaches user_metadata.full_name (the certificate bug)
 *   - is_attorney lands, and occupies_seat is its inverse
 *   - used_seats ends up equal to the non-attorney count, via the trigger
 *   - max_seats is NOT rewritten from the roster
 *   - promote is idempotent — the property the "flip status last" design rests on
 *   - a roster email belonging to another firm is refused, not stolen
 *
 * Teardown order (same as rls-isolation): firms (cascade) → auth.users.
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'
import { promoteIntake } from '@/lib/intake/promote'
import type { AnswerMap, RosterRow } from '@/lib/intake/types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
      'Ensure .env.local contains NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
      'and SUPABASE_SERVICE_ROLE_KEY.'
  )
}

const OWNER_PASSWORD = 'PromoteGate!7731xQ'

const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: globalThis.WebSocket },
})

const runId = crypto.randomUUID().slice(0, 8)
const at = (local: string) => `promote-${local}-${runId}@test.invalid`

const PURCHASED_SEATS = 9

let firmId: string
let ownerId: string
/** A second firm, to prove a roster cannot poach another firm's staff. */
let otherFirmId: string
let otherStaffId: string
/** A third firm: staff invited BEFORE the intake, then rostered. */
let overlapFirmId: string
let overlapStaffId: string
/** Every auth user this suite creates, for teardown. */
const created = new Set<string>()

function must<R extends { data: unknown; error: { message: string } | null }>(
  result: R,
  label: string
): NonNullable<R['data']> {
  if (result.error) throw new Error(`[seed:${label}] ${result.error.message}`)
  if (result.data == null) throw new Error(`[seed:${label}] returned null`)
  return result.data as unknown as NonNullable<R['data']>
}

async function createUser(email: string, password?: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, password })
  if (error) throw new Error(`[seed:createUser ${email}] ${error.message}`)
  created.add(data.user.id)
  return data.user.id
}

async function seedFirm(label: string, ownerEmail: string) {
  // A real password: the gate test below signs in as this owner to prove the
  // RLS read the middleware depends on actually works for them.
  const uid = await createUser(ownerEmail, OWNER_PASSWORD)
  const firm = must(
    await admin
      .from('firms')
      .insert({
        // The placeholder the Stripe webhook writes. Promote replacing THIS is
        // the thing under test.
        name: 'My Firm',
        owner_id: uid,
        tier: 'basic',
        max_seats: PURCHASED_SEATS,
      })
      .select('id')
      .single(),
    `insert firm ${label}`
  )
  must(
    await admin
      .from('seats')
      .insert({ firm_id: firm.id, max_seats: PURCHASED_SEATS, used_seats: 0 })
      .select('id')
      .single(),
    `insert seats ${label}`
  )
  await admin.auth.admin.updateUserById(uid, {
    app_metadata: { firm_id: firm.id, role: 'admin' },
  })
  must(
    await admin
      .from('firm_members')
      .insert({
        firm_id: firm.id,
        user_id: uid,
        role: 'admin',
        status: 'invited',
        // As the webhook creates it: the admin has not said whether they train.
        occupies_seat: false,
      })
      .select('id')
      .single(),
    `insert admin member ${label}`
  )
  return { firmId: firm.id, ownerId: uid }
}

const usedSeats = async (id: string) => {
  const { data } = await admin.from('seats').select('used_seats, max_seats').eq('firm_id', id).single()
  return data!
}

const fullNameOf = async (userId: string) => {
  const { data } = await admin.auth.admin.getUserById(userId)
  return (data?.user?.user_metadata?.full_name as string | undefined) ?? null
}

const memberFor = async (id: string, email: string) => {
  const { data: uid } = await admin.rpc('find_user_id_by_email', { p_email: email })
  if (!uid) return null
  const { data } = await admin
    .from('firm_members')
    .select('user_id, role, status, is_attorney, occupies_seat')
    .eq('firm_id', id)
    .eq('user_id', uid as string)
    .maybeSingle()
  return data ? { ...data, userId: uid as string } : null
}

// The roster: the admin as a NON-attorney office manager (so their own row has
// to flip to occupying a seat), one attorney, two staff.
const ROSTER: RosterRow[] = [
  { name: 'Dana Office-Manager', email: at('owner'), isAttorney: false },
  { name: 'Aisha Counsel', email: at('attorney'), isAttorney: true },
  { name: 'Ben Paralegal', email: at('para'), isAttorney: false },
  { name: 'Cleo Clerk', email: at('clerk'), isAttorney: false },
]

const ANSWERS: AnswerMap = { firm_name: 'Byron & Lovelace LLP', roster: ROSTER }

// The overlap firm's roster: the person already invited, plus two who are not.
const OVERLAP_ROSTER: RosterRow[] = [
  { name: 'Owner Person', email: at('overlapowner'), isAttorney: true },
  // Same address the invite created, typed back with DIFFERENT CASE. The match
  // has to survive that — find_user_id_by_email compares case-insensitively and
  // GoTrue stores lowercased.
  { name: 'Sarah Chen', email: at('invited-first').toUpperCase(), isAttorney: false },
  { name: 'New Hire One', email: at('new-1'), isAttorney: false },
  { name: 'New Hire Two', email: at('new-2'), isAttorney: true },
]

beforeAll(async () => {
  const main = await seedFirm('main', at('owner'))
  firmId = main.firmId
  ownerId = main.ownerId

  const other = await seedFirm('other', at('otherowner'))
  otherFirmId = other.firmId

  // The overlap case: a firm that invited somebody while exploring, and only
  // then did the intake. Katy reversed the hard gate on 2026-08-26 12:11, so
  // this is now the normal order of events rather than an edge case.
  const overlap = await seedFirm('overlap', at('overlapowner'))
  overlapFirmId = overlap.firmId
  overlapStaffId = await createUser(at('invited-first'))
  await admin.auth.admin.updateUserById(overlapStaffId, {
    app_metadata: { firm_id: overlapFirmId, role: 'employee' },
  })
  must(
    await admin
      .from('firm_members')
      .insert({
        firm_id: overlapFirmId,
        user_id: overlapStaffId,
        role: 'employee',
        // Exactly what invite/bulk leaves behind: a member with NO name, because
        // that route accepts { name, email } and discards the name.
        status: 'invited',
        occupies_seat: true,
      })
      .select('id')
      .single(),
    'insert pre-invited staff'
  )

  // A staff member who already belongs to the OTHER firm.
  otherStaffId = await createUser(at('poached'))
  await admin.auth.admin.updateUserById(otherStaffId, {
    app_metadata: { firm_id: otherFirmId, role: 'employee' },
  })
  must(
    await admin
      .from('firm_members')
      .insert({ firm_id: otherFirmId, user_id: otherStaffId, role: 'employee', status: 'active' })
      .select('id')
      .single(),
    'insert other-firm staff'
  )
}, 90_000)

afterAll(async () => {
  // The users promote itself created are not in `created` — resolve them by the
  // roster email so the suite does not leak auth rows into staging.
  for (const row of ROSTER) {
    const { data: uid } = await admin.rpc('find_user_id_by_email', { p_email: row.email })
    if (uid) created.add(uid as string)
  }
  for (const row of OVERLAP_ROSTER) {
    const { data: uid } = await admin.rpc('find_user_id_by_email', { p_email: row.email })
    if (uid) created.add(uid as string)
  }
  for (const id of [firmId, otherFirmId, overlapFirmId]) {
    if (id) await admin.from('firms').delete().eq('id', id)
  }
  for (const id of created) await admin.auth.admin.deleteUser(id)
})

describe('promoteIntake', () => {
  it('renames the firm off its placeholder', async () => {
    const before = await admin.from('firms').select('name').eq('id', firmId).single()
    expect(before.data!.name).toBe('My Firm')

    const result = await promoteIntake(admin, firmId, ANSWERS)
    expect(result.skipped).toEqual([])
    expect(result.firmName).toBe('Byron & Lovelace LLP')

    const after = await admin.from('firms').select('name').eq('id', firmId).single()
    expect(after.data!.name).toBe('Byron & Lovelace LLP')
  }, 60_000)

  it('carries the ROSTER name into user_metadata.full_name', async () => {
    // The bug this closes: invite/bulk discards the name, and cert generation
    // falls back to the raw email address — so a paralegal who skipped the
    // password-set field got a certificate made out to para@firm.com.
    for (const row of ROSTER) {
      const member = await memberFor(firmId, row.email)
      expect({ email: row.email, name: await fullNameOf(member!.userId) }).toEqual({
        email: row.email,
        name: row.name,
      })
    }
  }, 60_000)

  it('records attorney status and makes occupies_seat its inverse', async () => {
    for (const row of ROSTER) {
      const member = await memberFor(firmId, row.email)
      expect({ email: row.email, isAttorney: member!.is_attorney, occupies: member!.occupies_seat }).toEqual({
        email: row.email,
        isAttorney: row.isAttorney,
        occupies: !row.isAttorney,
      })
    }
  }, 60_000)

  it('does not demote the buyer to an employee on their own roster', async () => {
    // Writing app_metadata.role unconditionally would lock a firm out of its own
    // dashboard the moment the admin appears on the roster they just typed.
    const member = await memberFor(firmId, at('owner'))
    expect(member!.role).toBe('admin')
    expect(member!.userId).toBe(ownerId)

    const { data } = await admin.auth.admin.getUserById(ownerId)
    expect(data?.user?.app_metadata?.role).toBe('admin')
  }, 60_000)

  it('lands used_seats on the non-attorney count, via the 0015 trigger', async () => {
    const seats = await usedSeats(firmId)
    // Three non-attorneys: the office-manager admin, the paralegal, the clerk.
    expect(seats.used_seats).toBe(3)
  }, 60_000)

  it('does NOT rewrite max_seats from the roster', async () => {
    // max_seats is what Stripe sold. Rewriting it here would hand a firm
    // capacity it never paid for, or shrink capacity it did.
    const seats = await usedSeats(firmId)
    expect(seats.max_seats).toBe(PURCHASED_SEATS)
  }, 60_000)

  it('is idempotent — the property the "flip status last" ordering rests on', async () => {
    const second = await promoteIntake(admin, firmId, ANSWERS)

    // Nothing new created; every row recognised and updated in place.
    expect(second.created).toBe(0)
    expect(second.updated).toBe(ROSTER.length)
    expect(second.skipped).toEqual([])

    const { count } = await admin
      .from('firm_members')
      .select('id', { count: 'exact', head: true })
      .eq('firm_id', firmId)
    expect(count).toBe(ROSTER.length)

    // And the trigger has not double-counted.
    expect((await usedSeats(firmId)).used_seats).toBe(3)
  }, 90_000)

  it('refuses a roster email that belongs to another firm, without touching it', async () => {
    const nameBefore = await fullNameOf(otherStaffId)

    const result = await promoteIntake(admin, firmId, {
      firm_name: 'Byron & Lovelace LLP',
      roster: [...ROSTER, { name: 'Stolen Person', email: at('poached'), isAttorney: false }],
    })

    expect(result.skipped).toEqual([{ email: at('poached'), reason: 'other_firm' }])

    // 🔴 The guard runs BEFORE any write. Their name and their firm are untouched.
    expect(await fullNameOf(otherStaffId)).toBe(nameBefore)
    const { data } = await admin.auth.admin.getUserById(otherStaffId)
    expect(data?.user?.app_metadata?.firm_id).toBe(otherFirmId)

    // And they did not gain a membership in the poaching firm.
    expect(await memberFor(firmId, at('poached'))).toBeNull()
  }, 90_000)

  it('skips a malformed email rather than failing the whole promote', async () => {
    const result = await promoteIntake(admin, firmId, {
      firm_name: 'Byron & Lovelace LLP',
      roster: [...ROSTER, { name: 'Typo Person', email: 'not-an-email', isAttorney: false }],
    })
    expect(result.skipped).toEqual([{ email: 'not-an-email', reason: 'invalid_email' }])
    // The good rows still went through.
    expect(result.updated).toBe(ROSTER.length)
  }, 90_000)
})

/**
 * The read the gate is built on.
 *
 * middleware.ts asks "does this firm have a submitted intake?" as the SIGNED-IN
 * USER, not the service role — migration 0028 gives firm admins a SELECT policy
 * on intake_sessions and that is meant to be exactly enough. If it were not, the
 * query would come back as an ERROR, the gate fails open by design, and every
 * admin would sail through to an empty dashboard with nothing anywhere saying
 * why. That failure is silent, which is why it is pinned here.
 */
describe('the gate query, under RLS as the admin', () => {
  let sessionId: string
  let otherSessionId: string
  let asOwner: ReturnType<typeof createClient<Database>>

  beforeAll(async () => {
    const mine = must(
      await admin
        .from('intake_sessions')
        .insert({ firm_id: firmId, started_by: ownerId, status: 'submitted', submitted_at: new Date().toISOString() })
        .select('id')
        .single(),
      'insert submitted session'
    )
    sessionId = mine.id

    const { data: otherFirm } = await admin.from('firms').select('owner_id').eq('id', otherFirmId).single()
    const theirs = must(
      await admin
        .from('intake_sessions')
        .insert({ firm_id: otherFirmId, started_by: otherFirm!.owner_id, status: 'submitted', submitted_at: new Date().toISOString() })
        .select('id')
        .single(),
      'insert other-firm session'
    )
    otherSessionId = theirs.id

    asOwner = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: globalThis.WebSocket },
    })
    const { error } = await asOwner.auth.signInWithPassword({
      email: at('owner'),
      password: OWNER_PASSWORD,
    })
    if (error) throw new Error(`[gate:signIn] ${error.message}`)
  }, 60_000)

  it('lets the firm admin see their own submitted session', async () => {
    const { data, error } = await asOwner
      .from('intake_sessions')
      .select('id')
      .eq('firm_id', firmId)
      .eq('status', 'submitted')
      .limit(1)
      .maybeSingle()

    // No error is half the assertion: an error here disables the gate silently.
    expect(error).toBeNull()
    expect(data?.id).toBe(sessionId)
  }, 60_000)

  it('does not let them see another firm\'s session', async () => {
    const { data, error } = await asOwner
      .from('intake_sessions')
      .select('id')
      .eq('id', otherSessionId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull()
  }, 60_000)

  it('leaves intake_sensitive unreadable — RLS on, NO policy', async () => {
    // The one table in 0028 with no policy at all. A firm admin reading it would
    // be reading an admission a partner made in confidence to the drafting
    // attorney.
    must(
      await admin
        .from('intake_sensitive')
        .insert({ session_id: sessionId, question_key: 'prior_ai_error', value: 'yes' })
        .select('id')
        .single(),
      'insert sensitive answer'
    )

    const { data, error } = await asOwner.from('intake_sensitive').select('id').eq('session_id', sessionId)

    // RLS with no policy returns an empty set rather than an error.
    expect(error).toBeNull()
    expect(data).toEqual([])
  }, 60_000)
})

/**
 * Item 2, batch 5: promote RECONCILES, it does not refuse.
 *
 * Exploring is allowed now, so inviting while exploring is allowed, and a firm
 * can invite three people and then roster five. firm_members carries unique
 * (firm_id, user_id), so a plain insert fails the moment somebody is already
 * there — every row has to be matched on the resolved auth user id instead.
 */
describe('promote over an existing roster', () => {
  it('updates the person already invited instead of duplicating them', async () => {
    // Before: one member, no name, invite/bulk having discarded it.
    expect(await fullNameOf(overlapStaffId)).toBeNull()

    const result = await promoteIntake(admin, overlapFirmId, {
      firm_name: 'Chen & Partners',
      roster: OVERLAP_ROSTER,
    })

    expect(result.skipped).toEqual([])
    // Three new people, one recognised — the admin and the pre-invited staffer.
    expect(result.updated).toBe(2)
    expect(result.created).toBe(2)

    // 🔴 Nobody duplicated. Four roster rows, four members, and the person who
    // was invited first is still exactly one row.
    const { count } = await admin
      .from('firm_members')
      .select('id', { count: 'exact', head: true })
      .eq('firm_id', overlapFirmId)
    expect(count).toBe(4)

    const { data: theirRows } = await admin
      .from('firm_members')
      .select('id, status, is_attorney, occupies_seat')
      .eq('firm_id', overlapFirmId)
      .eq('user_id', overlapStaffId)
    expect(theirRows).toHaveLength(1)

    // The roster supplied the name that was missing.
    expect(await fullNameOf(overlapStaffId)).toBe('Sarah Chen')
    expect(theirRows![0].is_attorney).toBe(false)
    expect(theirRows![0].occupies_seat).toBe(true)
    // Their invite is still outstanding — promote does not silently activate
    // somebody, and it does not re-send anything either.
    expect(theirRows![0].status).toBe('invited')
  }, 90_000)

  it('lands used_seats on the non-attorney count with no double-count', async () => {
    // Two non-attorneys across the four: Sarah (already held a seat) and New
    // Hire One. The owner and New Hire Two are attorneys.
    const seats = await usedSeats(overlapFirmId)
    expect(seats.used_seats).toBe(2)
    expect(seats.max_seats).toBe(PURCHASED_SEATS)
  }, 60_000)

  it('is still idempotent over the overlap', async () => {
    const again = await promoteIntake(admin, overlapFirmId, {
      firm_name: 'Chen & Partners',
      roster: OVERLAP_ROSTER,
    })
    expect(again.created).toBe(0)
    expect(again.updated).toBe(OVERLAP_ROSTER.length)

    const { count } = await admin
      .from('firm_members')
      .select('id', { count: 'exact', head: true })
      .eq('firm_id', overlapFirmId)
    expect(count).toBe(4)
    expect((await usedSeats(overlapFirmId)).used_seats).toBe(2)
  }, 90_000)
})
