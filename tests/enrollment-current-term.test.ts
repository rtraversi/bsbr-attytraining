/**
 * ix-maybesingle — the duplicate-enrollment factory.
 *
 * Earlier enrollment writers asked "does an enrollment exist?" with a bare
 * `.eq(user_id).eq(course_id).maybeSingle()`, no
 * firm_id, no ordering, and the error discarded.
 *
 * Migration 0007 dropped the unique constraint so a renewal inserts a FRESH row
 * per term — multiple rows are NORMAL. `.maybeSingle()` ERRORS on multiple
 * matches rather than returning one, so on any renewed account the read came
 * back `{ data: null, error }`, the caller read "no enrollment exists", and
 * inserted a third. The guard written to prevent duplicates was making them.
 *
 * The first test below runs the OLD query shape against a two-term learner and
 * asserts it fails, so the regression this suite guards is pinned rather than
 * described. The rest exercise the real lib/enrollments.ts that replaced it.
 *
 * Teardown order (same as rls-isolation):
 *   training_events → firms (cascade) → courses → auth.users
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'
import { ensureEnrollment, findCurrentEnrollment } from '@/lib/enrollments'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
      'Ensure .env.local contains NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  )
}

const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: globalThis.WebSocket },
})

const runId = crypto.randomUUID().slice(0, 8)

let firmId: string
let courseId: string
/** Renewed twice — the learner the old query broke on. */
let renewedUserId: string
/** No enrollment at all — the create path. */
let freshUserId: string
let lastTermId: string
let currentTermId: string

const LAST_TERM = '2025-08-01T10:00:00.000Z'
const CURRENT_TERM = '2026-08-01T10:00:00.000Z'

function must<R extends { data: unknown; error: { message: string } | null }>(
  result: R,
  label: string
): NonNullable<R['data']> {
  if (result.error) throw new Error(`[seed:${label}] ${result.error.message}`)
  if (result.data == null) throw new Error(`[seed:${label}] returned null`)
  return result.data as unknown as NonNullable<R['data']>
}

async function createUser(label: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `maybesingle-${label}-${runId}@test.invalid`,
    password: 'TestEnroll!9876xY',
    email_confirm: true,
  })
  if (error) throw new Error(`[seed:createUser ${label}] ${error.message}`)
  return data.user.id
}

beforeAll(async () => {
  const course = must(
    await admin
      .from('courses')
      .insert({
        title: `MaybeSingle Course ${runId}`,
        cloudflare_stream_video_id: `vid-${runId}`,
        pass_threshold: 80,
        is_published: true,
      })
      .select('id')
      .single(),
    'insert course'
  )
  courseId = course.id

  renewedUserId = await createUser('renewed')
  freshUserId = await createUser('fresh')

  const firm = must(
    await admin
      .from('firms')
      .insert({
        name: `MaybeSingle Firm ${runId}`,
        owner_id: renewedUserId,
        tier: 'basic',
        max_seats: 5,
      })
      .select('id')
      .single(),
    'insert firm'
  )
  firmId = firm.id

  must(
    await admin
      .from('seats')
      .insert({ firm_id: firmId, max_seats: 5, used_seats: 0 })
      .select('id')
      .single(),
    'insert seats'
  )

  for (const [userId, role] of [
    [renewedUserId, 'admin'],
    [freshUserId, 'employee'],
  ] as const) {
    must(
      await admin
        .from('firm_members')
        .insert({ firm_id: firmId, user_id: userId, role, status: 'active' })
        .select('id')
        .single(),
      `insert member ${role}`
    )
  }

  // Two terms for the same learner + course. This is what a renewal produces
  // and what 0007 deliberately allows.
  const last = must(
    await admin
      .from('enrollments')
      .insert({
        user_id: renewedUserId,
        course_id: courseId,
        firm_id: firmId,
        status: 'passed',
        enrolled_at: LAST_TERM,
      })
      .select('id')
      .single(),
    'insert enrollment last term'
  )
  lastTermId = last.id

  const current = must(
    await admin
      .from('enrollments')
      .insert({
        user_id: renewedUserId,
        course_id: courseId,
        firm_id: firmId,
        status: 'in_progress',
        enrolled_at: CURRENT_TERM,
      })
      .select('id')
      .single(),
    'insert enrollment current term'
  )
  currentTermId = current.id
}, 60_000)

afterAll(async () => {
  if (firmId) await admin.from('training_events').delete().eq('firm_id', firmId)
  if (firmId) await admin.from('firms').delete().eq('id', firmId)
  if (courseId) await admin.from('courses').delete().eq('id', courseId)
  for (const id of [freshUserId, renewedUserId]) {
    if (id) await admin.auth.admin.deleteUser(id)
  }
})

const countEnrollments = async (userId: string) => {
  const { count } = await admin
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('course_id', courseId)
  return count ?? 0
}

describe('ix-maybesingle — the old query shape', () => {
  it('the ORIGINAL read fails on a renewed learner, which is why duplicates were inserted', async () => {
    // Verbatim the query that shipped in both routes: no firm_id, no ordering,
    // resolved with maybeSingle().
    const { data, error } = await admin
      .from('enrollments')
      .select('id')
      .eq('user_id', renewedUserId)
      .eq('course_id', courseId)
      .maybeSingle()

    // Both halves matter. `error` non-null is the defect; `data` null is why it
    // went unnoticed — the routes discarded the error and read only the data,
    // so this looked exactly like "no enrollment exists".
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })
})

describe('findCurrentEnrollment', () => {
  it('resolves several terms down to the CURRENT one', async () => {
    const { enrollment, error } = await findCurrentEnrollment(admin, {
      userId: renewedUserId,
      courseId,
      firmId,
    })

    expect(error).toBeNull()
    expect(enrollment?.id).toBe(currentTermId)
    expect(enrollment?.id).not.toBe(lastTermId)
    // Ordered by enrolled_at, so it is the in_progress row, not last year's pass.
    expect(enrollment?.status).toBe('in_progress')
  })

  it('returns null — with no error — for a learner who has none', async () => {
    const { enrollment, error } = await findCurrentEnrollment(admin, {
      userId: freshUserId,
      courseId,
      firmId,
    })
    expect(error).toBeNull()
    expect(enrollment).toBeNull()
  })

  it('is scoped by firm_id, so another firm cannot resolve this learner', async () => {
    const { enrollment, error } = await findCurrentEnrollment(admin, {
      userId: renewedUserId,
      courseId,
      firmId: crypto.randomUUID(),
    })
    expect(error).toBeNull()
    expect(enrollment).toBeNull()
  })
})

describe('ensureEnrollment', () => {
  it('does NOT insert a third row for a learner already enrolled across two terms', async () => {
    // The assertion that would have caught ix-maybesingle.
    expect(await countEnrollments(renewedUserId)).toBe(2)

    const result = await ensureEnrollment(
      admin,
      { userId: renewedUserId, courseId, firmId },
      'not_started'
    )

    expect(result.outcome).toBe('existing')
    if (result.outcome !== 'existing') return
    expect(result.enrollment.id).toBe(currentTermId)

    expect(await countEnrollments(renewedUserId)).toBe(2)
  })

  it('is idempotent — calling it repeatedly never adds a row', async () => {
    for (let i = 0; i < 3; i++) {
      await ensureEnrollment(admin, { userId: renewedUserId, courseId, firmId }, 'not_started')
    }
    expect(await countEnrollments(renewedUserId)).toBe(2)
  })

  it('creates exactly one row for a learner who genuinely has none, then stops', async () => {
    expect(await countEnrollments(freshUserId)).toBe(0)

    const created = await ensureEnrollment(
      admin,
      { userId: freshUserId, courseId, firmId },
      'not_started'
    )
    expect(created.outcome).toBe('created')
    expect(await countEnrollments(freshUserId)).toBe(1)

    const second = await ensureEnrollment(
      admin,
      { userId: freshUserId, courseId, firmId },
      'not_started'
    )
    expect(second.outcome).toBe('existing')
    expect(await countEnrollments(freshUserId)).toBe(1)
  })
})
