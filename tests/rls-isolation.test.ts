/**
 * Cross-tenant RLS isolation test (FND-02, FND-03).
 *
 * Seeding strategy
 * ─────────────────
 * Two firms (firm_a, firm_b) are created with one admin user each.
 * firm_b receives a complete row in every tenant-scoped table so there is
 * real data to potentially leak.  All queries run as firm_a's authenticated
 * user (JWT carrying app_metadata.firm_id = firmAId).
 *
 * What passes and what must not pass
 * ────────────────────────────────────
 * Positive controls verify that RLS is not completely broken (firm_a can see
 * its OWN rows).  Isolation assertions verify that an unfiltered SELECT on
 * each table returns zero rows belonging to firm_b.
 *
 * FK / cascade constraints that govern teardown order
 * ────────────────────────────────────────────────────
 * training_events.firm_member_id → firm_members(id)  ON DELETE RESTRICT
 *   → delete training_events before deleting firm_members (via firms cascade)
 * firms.owner_id → auth.users(id)  ON DELETE RESTRICT
 *   → delete firms before deleting auth users
 * enrollments.course_id → courses(id)  ON DELETE RESTRICT
 *   → firms cascade deletes enrollments first; then courses can be deleted
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

// ---------------------------------------------------------------------------
// Env-var guard — fail immediately with an actionable message
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
      'Ensure .env.local contains:\n' +
      '  NEXT_PUBLIC_SUPABASE_URL\n' +
      '  NEXT_PUBLIC_SUPABASE_ANON_KEY\n' +
      '  SUPABASE_SERVICE_ROLE_KEY\n' +
      'Also confirm that supabase db push has been run for both migrations.'
  )
}

// ---------------------------------------------------------------------------
// Service-role client — bypasses RLS; used only for seeding and teardown
// ---------------------------------------------------------------------------

const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  // Bypass the realtime WebSocketFactory CF-Workers detection (unused here)
  realtime: { transport: globalThis.WebSocket },
})

// ---------------------------------------------------------------------------
// Test-run identity
// ---------------------------------------------------------------------------

// Short runId scopes every created row so parallel runs don't collide and
// teardown can be surgically precise.
const runId = crypto.randomUUID().slice(0, 8)
const USER_A_EMAIL = `rls-a-${runId}@test.invalid`
const USER_B_EMAIL = `rls-b-${runId}@test.invalid`
const TEST_PASSWORD = 'TestRLS!9876xY'

// ---------------------------------------------------------------------------
// State captured during beforeAll
// ---------------------------------------------------------------------------

let firmAId: string
let firmBId: string
let userAId: string
let userBId: string
let memberBId: string
let courseId: string

// Authenticated client for firm_a's admin — populated after signInWithPassword
let clientA: SupabaseClient<Database>

// ---------------------------------------------------------------------------
// Helper: throw on Supabase error with a clear label
// ---------------------------------------------------------------------------

function must<R extends { data: unknown; error: { message: string } | null }>(
  result: R,
  label: string
): NonNullable<R['data']> {
  if (result.error) throw new Error(`[seed:${label}] ${result.error.message}`)
  if (result.data == null) throw new Error(`[seed:${label}] returned null`)
  return result.data as unknown as NonNullable<R['data']>
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // 1. Course — shared reference data; both firms could enroll in it
  const course = must(
    await admin
      .from('courses')
      .insert({
        title: `RLS Test Course ${runId}`,
        cloudflare_stream_video_id: `vid-${runId}`,
        pass_threshold: 80,
        is_published: true,
      })
      .select('id')
      .single(),
    'insert course'
  )
  courseId = course.id

  // 2. Auth users
  //    email_confirm: true bypasses the email-verification step so we can
  //    signInWithPassword immediately after.
  const { data: dataA, error: errA } = await admin.auth.admin.createUser({
    email: USER_A_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (errA) throw new Error(`[seed:createUser A] ${errA.message}`)
  userAId = dataA.user.id

  const { data: dataB, error: errB } = await admin.auth.admin.createUser({
    email: USER_B_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  })
  if (errB) throw new Error(`[seed:createUser B] ${errB.message}`)
  userBId = dataB.user.id

  // 3. Firm rows — owner_id references auth.users so users must exist first
  const firmA = must(
    await admin
      .from('firms')
      .insert({ name: `Firm A ${runId}`, owner_id: userAId, tier: 'basic', max_seats: 5 })
      .select('id')
      .single(),
    'insert firm_a'
  )
  firmAId = firmA.id

  const firmB = must(
    await admin
      .from('firms')
      .insert({ name: `Firm B ${runId}`, owner_id: userBId, tier: 'basic', max_seats: 5 })
      .select('id')
      .single(),
    'insert firm_b'
  )
  firmBId = firmB.id

  // 4. Stamp app_metadata BEFORE sign-in.
  //    Supabase generates the JWT from current user state at sign-in time, so
  //    updating app_metadata here ensures the JWT carries the correct firm_id
  //    and role — exactly what auth.jwt()->'app_metadata' reads in RLS policies.
  const { error: metaErrA } = await admin.auth.admin.updateUserById(userAId, {
    app_metadata: { firm_id: firmAId, role: 'admin' },
  })
  if (metaErrA) throw new Error(`[seed:stamp user_a] ${metaErrA.message}`)

  const { error: metaErrB } = await admin.auth.admin.updateUserById(userBId, {
    app_metadata: { firm_id: firmBId, role: 'admin' },
  })
  if (metaErrB) throw new Error(`[seed:stamp user_b] ${metaErrB.message}`)

  // 5. Seats — insert before firm_members so the sync_used_seats trigger
  //    finds a row to increment when members are inserted with status='active'.
  must(
    await admin
      .from('seats')
      .insert({ firm_id: firmAId, max_seats: 5, used_seats: 0 })
      .select('id')
      .single(),
    'insert seats_a'
  )
  must(
    await admin
      .from('seats')
      .insert({ firm_id: firmBId, max_seats: 5, used_seats: 0 })
      .select('id')
      .single(),
    'insert seats_b'
  )

  // 6. firm_members — status:'active' fires the sync_used_seats trigger
  must(
    await admin
      .from('firm_members')
      .insert({ firm_id: firmAId, user_id: userAId, role: 'admin', status: 'active' })
      .select('id')
      .single(),
    'insert member_a'
  )
  const memberB = must(
    await admin
      .from('firm_members')
      .insert({ firm_id: firmBId, user_id: userBId, role: 'admin', status: 'active' })
      .select('id')
      .single(),
    'insert member_b'
  )
  memberBId = memberB.id

  // 7. Enrollment for user_b — gives firm_b a row in enrollments
  const enrollmentB = must(
    await admin
      .from('enrollments')
      .insert({
        firm_id: firmBId,
        user_id: userBId,
        course_id: courseId,
        status: 'in_progress',
      })
      .select('id')
      .single(),
    'insert enrollment_b'
  )

  // 8. Quiz attempt for user_b — gives firm_b a row in quiz_attempts
  must(
    await admin
      .from('quiz_attempts')
      .insert({
        firm_id: firmBId,
        enrollment_id: enrollmentB.id,
        user_id: userBId,
        score: 90,
        passed: true,
      })
      .select('id')
      .single(),
    'insert quiz_attempt_b'
  )

  // 9. Certificate for user_b — gives firm_b a row in certificates.
  //    certificate_number is globally unique so runId prevents collisions.
  must(
    await admin
      .from('certificates')
      .insert({
        firm_id: firmBId,
        user_id: userBId,
        enrollment_id: enrollmentB.id,
        certificate_number: `CERT-TEST-${runId}`,
        storage_path: `firms/${firmBId}/employees/${userBId}/${runId}.pdf`,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single(),
    'insert certificate_b'
  )

  // 10. Training event for user_b — gives firm_b a row in training_events.
  //     firm_member_id references firm_members (ON DELETE RESTRICT), so this
  //     row must be deleted before memberB can be deleted in teardown.
  must(
    await admin
      .from('training_events')
      .insert({
        firm_id: firmBId,
        firm_member_id: memberBId,
        event_type: 'login',
        ip_address: '127.0.0.1',
        metadata: { test_run: runId },
      })
      .select('id')
      .single(),
    'insert training_event_b'
  )

  // 11. Sign in as user_a.
  //     Supabase generates a fresh JWT from the user's current state, which
  //     includes the app_metadata we stamped in step 4.  The client holds
  //     the session in memory (persistSession: false) — no localStorage needed.
  clientA = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: globalThis.WebSocket },
  })
  const { error: signInErr } = await clientA.auth.signInWithPassword({
    email: USER_A_EMAIL,
    password: TEST_PASSWORD,
  })
  if (signInErr) throw new Error(`[seed:signIn user_a] ${signInErr.message}`)
}, 45_000)

// ---------------------------------------------------------------------------
// Teardown — must respect FK constraint order
// ---------------------------------------------------------------------------

afterAll(async () => {
  // training_events.firm_member_id → firm_members(id) ON DELETE RESTRICT:
  // delete events first so the firms-cascade can remove firm_members cleanly.
  if (firmBId) await admin.from('training_events').delete().eq('firm_id', firmBId)
  if (firmAId) await admin.from('training_events').delete().eq('firm_id', firmAId)

  // Deleting firms cascades to: seats, firm_members, enrollments,
  // quiz_attempts (via enrollments cascade), certificates (via enrollments cascade).
  if (firmBId) await admin.from('firms').delete().eq('id', firmBId)
  if (firmAId) await admin.from('firms').delete().eq('id', firmAId)

  // Courses can now be deleted — enrollments were removed in the firms cascade above.
  // (enrollments.course_id → courses(id) ON DELETE RESTRICT)
  if (courseId) await admin.from('courses').delete().eq('id', courseId)

  // Auth users last — firms held an owner_id FK (ON DELETE RESTRICT) that is
  // now gone because firms were deleted above.
  if (userBId) await admin.auth.admin.deleteUser(userBId)
  if (userAId) await admin.auth.admin.deleteUser(userAId)
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RLS cross-tenant isolation', () => {
  /**
   * Positive controls
   *
   * These must pass for the isolation tests to be meaningful.  If RLS were
   * completely disabled (returning nothing to any caller), every isolation
   * test would pass trivially — these controls catch that false-negative.
   */
  describe('positive controls — firm_a admin can read their own data', () => {
    it('can read firm_a row from firms', async () => {
      const { data, error } = await clientA
        .from('firms')
        .select('id')
        .eq('id', firmAId)
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data![0].id).toBe(firmAId)
    })

    it('can read firm_a rows from firm_members', async () => {
      const { data, error } = await clientA
        .from('firm_members')
        .select('id, firm_id')
        .eq('firm_id', firmAId)
      expect(error).toBeNull()
      expect(data!.length).toBeGreaterThanOrEqual(1)
      expect(data!.every(r => r.firm_id === firmAId)).toBe(true)
    })
  })

  /**
   * Isolation assertions
   *
   * Each test runs an UNFILTERED SELECT (no explicit firm_id filter in the
   * query) so RLS alone must be the barrier.  We then assert that none of
   * the returned rows belong to firm_b.  An additional targeted assertion
   * verifies that explicitly requesting firm_b data also returns empty.
   */
  describe('isolation — firm_a user cannot read any firm_b rows', () => {
    it('firms', async () => {
      const { data, error } = await clientA.from('firms').select('id')
      expect(error).toBeNull()
      expect((data ?? []).map(r => r.id)).not.toContain(firmBId)
    })

    it('firms — explicit id filter still returns empty', async () => {
      const { data, error } = await clientA
        .from('firms')
        .select('id')
        .eq('id', firmBId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('firm_members', async () => {
      const { data, error } = await clientA.from('firm_members').select('id, firm_id')
      expect(error).toBeNull()
      const leaked = (data ?? []).filter(r => r.firm_id === firmBId)
      expect(leaked).toHaveLength(0)
    })

    it('firm_members — explicit firm_id filter still returns empty', async () => {
      const { data, error } = await clientA
        .from('firm_members')
        .select('id')
        .eq('firm_id', firmBId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    })

    it('enrollments', async () => {
      const { data, error } = await clientA.from('enrollments').select('id, firm_id')
      expect(error).toBeNull()
      const leaked = (data ?? []).filter(r => r.firm_id === firmBId)
      expect(leaked).toHaveLength(0)
    })

    it('quiz_attempts', async () => {
      const { data, error } = await clientA.from('quiz_attempts').select('id, firm_id')
      expect(error).toBeNull()
      const leaked = (data ?? []).filter(r => r.firm_id === firmBId)
      expect(leaked).toHaveLength(0)
    })

    it('certificates', async () => {
      const { data, error } = await clientA.from('certificates').select('id, firm_id')
      expect(error).toBeNull()
      const leaked = (data ?? []).filter(r => r.firm_id === firmBId)
      expect(leaked).toHaveLength(0)
    })

    it('training_events', async () => {
      const { data, error } = await clientA.from('training_events').select('id, firm_id')
      expect(error).toBeNull()
      const leaked = (data ?? []).filter(r => r.firm_id === firmBId)
      expect(leaked).toHaveLength(0)
    })
  })
})
