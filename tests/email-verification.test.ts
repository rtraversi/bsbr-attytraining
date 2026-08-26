/**
 * Email deliverability (migration 0029).
 *
 * The question is not who somebody is — a card payment and a Stripe session
 * token settle that better than an email could. It is whether the address can
 * receive anything at all. Stripe validates an address's SHAPE, not its
 * existence, so "gmial.com" sails through checkout, and roster addresses are
 * riskier still because the admin types them for other people.
 *
 * 🔴 The property that matters most here is that NOTHING BLOCKS. Resend returns
 * 403 on every send today (ix-dnszoho); a version of this that gated anything
 * would brick every firm behind a banner nobody could clear. The tests below
 * pin the two halves of "clearable": a link works exactly once, and accepting an
 * invite clears the flag without any link at all.
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'
import {
  mintVerificationToken,
  consumeVerificationToken,
  markVerifiedByActivation,
  needsEmailAttention,
} from '@/lib/email-verification'

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
const APP = 'https://example.invalid'

let firmId: string
let ownerId: string
let staffId: string
let ownerMemberId: string
let staffMemberId: string

function must<R extends { data: unknown; error: { message: string } | null }>(r: R, label: string) {
  if (r.error) throw new Error(`[seed:${label}] ${r.error.message}`)
  if (r.data == null) throw new Error(`[seed:${label}] returned null`)
  return r.data as unknown as NonNullable<R['data']>
}

/** email_confirm: true, exactly as every real creation path does it. */
async function newUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (error || !data?.user) throw new Error(`[seed:createUser ${email}] ${error?.message ?? 'null'}`)
  return data.user.id
}

beforeAll(async () => {
  ownerId = await newUser(`verif-owner-${runId}@test.invalid`)
  staffId = await newUser(`verif-staff-${runId}@test.invalid`)

  const firm = must(
    await admin
      .from('firms')
      .insert({ name: `Verif Firm ${runId}`, owner_id: ownerId, tier: 'basic', max_seats: 5 })
      .select('id')
      .single(),
    'insert firm'
  )
  firmId = firm.id

  ownerMemberId = must(
    await admin
      .from('firm_members')
      .insert({ firm_id: firmId, user_id: ownerId, role: 'admin', status: 'active', occupies_seat: false })
      .select('id')
      .single(),
    'insert owner member'
  ).id

  staffMemberId = must(
    await admin
      .from('firm_members')
      .insert({
        firm_id: firmId,
        user_id: staffId,
        role: 'employee',
        status: 'invited',
        // 0016 — the send threw. The other half of the same question.
        invite_email_failed: true,
      })
      .select('id')
      .single(),
    'insert staff member'
  ).id
}, 60_000)

afterAll(async () => {
  if (firmId) await admin.from('firms').delete().eq('id', firmId)
  for (const id of [staffId, ownerId]) if (id) await admin.auth.admin.deleteUser(id)
})

const memberRow = async (id: string) => {
  const { data } = await admin
    .from('firm_members')
    .select('email_verified_at, email_verification_token, email_verification_sent_at, invite_email_failed')
    .eq('id', id)
    .single()
  return data!
}

describe('needsEmailAttention', () => {
  it('catches both signals and nothing else', () => {
    // Never proven.
    expect(needsEmailAttention({ email_verified_at: null, invite_email_failed: false })).toBe(true)
    // Tried and it bounced, even though it was verified once.
    expect(needsEmailAttention({ email_verified_at: '2026-01-01', invite_email_failed: true })).toBe(true)
    // Proven and nothing has bounced since.
    expect(needsEmailAttention({ email_verified_at: '2026-01-01', invite_email_failed: false })).toBe(false)
  })
})

describe('the verification link', () => {
  it('starts unproven — NOT inherited from GoTrue email_confirm', async () => {
    // Both users were created with email_confirm: true, exactly as the Stripe
    // webhook and the invite routes do. If this had reused
    // auth.users.email_confirmed_at, everybody would read as verified and the
    // whole signal would be inert.
    const row = await memberRow(ownerMemberId)
    expect(row.email_verified_at).toBeNull()
    expect(needsEmailAttention({ ...row })).toBe(true)
  }, 30_000)

  it('mints a link and marks the send', async () => {
    const minted = await mintVerificationToken(admin, ownerMemberId, APP)
    expect('error' in minted).toBe(false)
    if ('error' in minted) return

    expect(minted.link).toBe(`${APP}/verify-email?token=${minted.token}`)
    const row = await memberRow(ownerMemberId)
    expect(row.email_verification_token).toBe(minted.token)
    expect(row.email_verification_sent_at).not.toBeNull()
    // Minting is not proof of anything — only opening it is.
    expect(row.email_verified_at).toBeNull()
  }, 30_000)

  it('works exactly once', async () => {
    const minted = await mintVerificationToken(admin, staffMemberId, APP)
    if ('error' in minted) throw new Error(minted.error)

    const first = await consumeVerificationToken(admin, minted.token)
    expect(first).toEqual({ ok: true, memberId: staffMemberId, firmId })

    const row = await memberRow(staffMemberId)
    expect(row.email_verified_at).not.toBeNull()
    // The link is burned, which is what makes a corrected address safe: the one
    // sent to the typo is dead.
    expect(row.email_verification_token).toBeNull()
    // 🔴 And the 0016 flag cleared with it. Leaving that set would keep the
    // person in the notice forever with no way out — the unclearable banner.
    expect(row.invite_email_failed).toBe(false)
    expect(needsEmailAttention({ ...row })).toBe(false)

    const replay = await consumeVerificationToken(admin, minted.token)
    expect(replay).toEqual({ ok: false, reason: 'unknown_token' })
  }, 30_000)

  it('refuses a token nobody minted', async () => {
    const result = await consumeVerificationToken(admin, 'not-a-real-token')
    expect(result).toEqual({ ok: false, reason: 'unknown_token' })
  }, 30_000)

  it('clears without a link when somebody accepts their invite', async () => {
    // The second route out of the notice, and the one that matters while mail is
    // down: reaching the password-set screen at all required receiving the email.
    const uid = await newUser(`verif-activated-${runId}@test.invalid`)
    const memberId = must(
      await admin
        .from('firm_members')
        .insert({ firm_id: firmId, user_id: uid, role: 'employee', status: 'invited' })
        .select('id')
        .single(),
      'insert activated member'
    ).id

    expect((await memberRow(memberId)).email_verified_at).toBeNull()

    await markVerifiedByActivation(admin, uid, firmId)

    const row = await memberRow(memberId)
    expect(row.email_verified_at).not.toBeNull()
    expect(needsEmailAttention({ ...row })).toBe(false)

    await admin.from('firm_members').delete().eq('id', memberId)
    await admin.auth.admin.deleteUser(uid)
  }, 30_000)
})
