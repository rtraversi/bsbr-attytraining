/**
 * resolveBuyer — driven against a real database, same reasoning as
 * intake-promote.test.ts: the whole point is what the RPC and the table
 * lookups actually return, not whether a mock was written to match the code.
 *
 * ix-dupcheck (OPEN-ISSUES.md #9c). This is the function both
 * app/api/checkout/route.ts (layer 1, pre-charge) and
 * app/api/webhooks/stripe/route.ts (layer 2, post-charge) call — pinning it
 * here covers both call sites at once, since neither wraps it in logic of
 * its own beyond translating the result to an HTTP response.
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'
import { resolveBuyer } from '@/lib/buyer-identity'

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

const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: globalThis.WebSocket },
})

const runId = crypto.randomUUID().slice(0, 8)
const at = (local: string) => `buyerid-${local}-${runId}@test.invalid`
const PASSWORD = 'BuyerIdentityGate!7731xQ'

const created = new Set<string>()
const firmIds: string[] = []

async function makeUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: at(local),
    password: PASSWORD,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`[seed:${local}] ${error?.message}`)
  created.add(data.user.id)
  return data.user.id
}

async function makeFirm(ownerId: string, status: 'active' | 'cancelled' | 'payment_failed') {
  const { data, error } = await admin
    .from('firms')
    .insert({ name: `Buyer Identity Test ${runId}`, owner_id: ownerId, tier: 'basic', max_seats: 5, status })
    .select('id')
    .single()
  if (error || !data) throw new Error(`[seed:firm] ${error?.message}`)
  firmIds.push(data.id)
  return data.id
}

let activeOwnerEmail: string
let cancelledOwnerEmail: string
let staffAtActiveFirmEmail: string
let staffAtCancelledFirmEmail: string
let loginOnlyEmail: string

beforeAll(async () => {
  const activeOwnerId = await makeUser('active-owner')
  activeOwnerEmail = at('active-owner')
  await makeFirm(activeOwnerId, 'active')

  const cancelledOwnerId = await makeUser('cancelled-owner')
  cancelledOwnerEmail = at('cancelled-owner')
  await makeFirm(cancelledOwnerId, 'cancelled')

  // A firm the staff member below belongs to, active — makes them email_in_use.
  const employerOwnerId = await makeUser('employer-owner')
  const employerFirmId = await makeFirm(employerOwnerId, 'active')

  const staffId = await makeUser('staff-active')
  staffAtActiveFirmEmail = at('staff-active')
  await admin.auth.admin.updateUserById(staffId, {
    app_metadata: { firm_id: employerFirmId, role: 'employee' },
  })

  // A second employer, cancelled — staff there should NOT be blocked.
  const lapsedEmployerOwnerId = await makeUser('lapsed-employer-owner')
  const lapsedEmployerFirmId = await makeFirm(lapsedEmployerOwnerId, 'cancelled')

  const lapsedStaffId = await makeUser('staff-lapsed')
  staffAtCancelledFirmEmail = at('staff-lapsed')
  await admin.auth.admin.updateUserById(lapsedStaffId, {
    app_metadata: { firm_id: lapsedEmployerFirmId, role: 'employee' },
  })

  await makeUser('login-only')
  loginOnlyEmail = at('login-only')
}, 60_000)

afterAll(async () => {
  for (const id of firmIds) {
    await admin.from('firms').delete().eq('id', id)
  }
  for (const id of created) {
    await admin.auth.admin.deleteUser(id)
  }
})

describe('resolveBuyer', () => {
  it('classifies the owner of an active firm as duplicate', async () => {
    const buyer = await resolveBuyer(admin, activeOwnerEmail)
    expect(buyer.kind).toBe('duplicate')
  })

  it('is case-insensitive, matching how Stripe echoes back typed casing', async () => {
    const buyer = await resolveBuyer(admin, activeOwnerEmail.toUpperCase())
    expect(buyer.kind).toBe('duplicate')
  })

  it('classifies the owner of a cancelled firm as returning, not duplicate', async () => {
    const buyer = await resolveBuyer(admin, cancelledOwnerEmail)
    expect(buyer.kind).toBe('returning')
  })

  it('classifies staff at an active firm as email_in_use', async () => {
    const buyer = await resolveBuyer(admin, staffAtActiveFirmEmail)
    expect(buyer.kind).toBe('email_in_use')
  })

  it('does NOT block staff at a lapsed firm — they are free to buy their own', async () => {
    const buyer = await resolveBuyer(admin, staffAtCancelledFirmEmail)
    expect(buyer.kind).not.toBe('email_in_use')
    expect(buyer.kind).not.toBe('duplicate')
  })

  it('classifies a user with a login but no firm as existing_user_no_firm', async () => {
    const buyer = await resolveBuyer(admin, loginOnlyEmail)
    expect(buyer.kind).toBe('existing_user_no_firm')
  })

  it('classifies an email nobody has registered as unresolved', async () => {
    const buyer = await resolveBuyer(admin, at('never-registered'))
    expect(buyer.kind).toBe('unresolved')
  })
})
