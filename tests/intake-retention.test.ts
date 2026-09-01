// =============================================================================
// The retention clock — D8-3.
//
// What is being pinned here is mostly the SAFE DIRECTION. Every branch that
// cannot work out a date returns `grace` with no date, meaning "keep them", and
// there is exactly one input shape that ever reads as `expired`. Getting that
// backwards deletes a firm's answers unrecoverably — there is no copy anywhere
// else — so the tests are written around the ways it could go wrong rather than
// around the happy path.
// =============================================================================

import { describe, expect, it } from 'vitest'

import { RENEWAL_GRACE_DAYS, retentionOf } from '@/lib/intake/retention'

const NOW = new Date('2026-09-01T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const daysFromNow = (n: number) => new Date(NOW.getTime() + n * DAY).toISOString()

describe('while the firm is paying', () => {
  it('an active subscription has no deletion date at all', () => {
    const r = retentionOf({ status: 'active', current_period_end: daysFromNow(200) }, NOW)
    expect(r.state).toBe('active')
    expect(r.deletesAt).toBeNull()
    expect(r.daysLeft).toBeNull()
  })

  it('🔴 payment_failed is still ACTIVE, not the start of a clock', () => {
    // Stripe Smart Retries are still running at that point and the firm has not
    // lost anything. Treating a failed charge as the end of the subscription
    // would start deleting answers over a card that expired.
    const r = retentionOf({ status: 'payment_failed', current_period_end: daysFromNow(-5) }, NOW)
    expect(r.state).toBe('active')
    expect(r.deletesAt).toBeNull()
  })

  it('an active firm past its period end is still active', () => {
    // current_period_end goes stale between the renewal and the webhook landing.
    // Only `status` says the subscription is over.
    expect(retentionOf({ status: 'active', current_period_end: daysFromNow(-90) }, NOW).state).toBe(
      'active',
    )
  })
})

describe('once it is cancelled', () => {
  it('the grace window runs from the period end', () => {
    const r = retentionOf({ status: 'cancelled', current_period_end: daysFromNow(-10) }, NOW)
    expect(r.state).toBe('grace')
    expect(r.daysLeft).toBe(RENEWAL_GRACE_DAYS - 10)
    expect(r.deletesAt).toBe(new Date(NOW.getTime() + (RENEWAL_GRACE_DAYS - 10) * DAY).toISOString())
  })

  it('a cancellation with the period still to run has the whole window ahead of it', () => {
    const r = retentionOf({ status: 'cancelled', current_period_end: daysFromNow(30) }, NOW)
    expect(r.state).toBe('grace')
    expect(r.daysLeft).toBe(RENEWAL_GRACE_DAYS + 30)
  })

  it('expires once the grace period has run out', () => {
    const r = retentionOf(
      { status: 'cancelled', current_period_end: daysFromNow(-RENEWAL_GRACE_DAYS - 1) },
      NOW,
    )
    expect(r.state).toBe('expired')
    expect(r.daysLeft).toBe(0)
  })

  it('the boundary belongs to grace, not to expired', () => {
    // A firm renewing on the last day keeps its work. The alternative is
    // deleting it on a rounding decision.
    const justInside = retentionOf(
      { status: 'cancelled', current_period_end: new Date(NOW.getTime() - RENEWAL_GRACE_DAYS * DAY + 1000).toISOString() },
      NOW,
    )
    expect(justInside.state).toBe('grace')
  })
})

describe('🔴 the shapes that must never read as expired', () => {
  it('no firm row', () => {
    expect(retentionOf(null, NOW)).toEqual({ state: 'grace', deletesAt: null, daysLeft: null })
  })

  it('cancelled with no recorded period end', () => {
    // An old row, or a subscription that never carried one. Deleting a firm's
    // answers because we could not work out when their period ended is the one
    // outcome this file exists to prevent.
    const r = retentionOf({ status: 'cancelled', current_period_end: null }, NOW)
    expect(r.state).toBe('grace')
    expect(r.deletesAt).toBeNull()
  })

  it('cancelled with an unparseable period end', () => {
    const r = retentionOf({ status: 'cancelled', current_period_end: 'not a date' }, NOW)
    expect(r.state).toBe('grace')
    expect(r.deletesAt).toBeNull()
  })

  it('a status nobody has heard of', () => {
    // firms.status is CHECKed to three values, but this reads a string. An
    // unknown one must fall on the keeping side.
    expect(retentionOf({ status: 'trialing', current_period_end: null }, NOW).state).toBe('active')
  })
})

describe('purity', () => {
  it('the same inputs give the same answer', () => {
    const firm = { status: 'cancelled', current_period_end: daysFromNow(-3) }
    expect(retentionOf(firm, NOW)).toEqual(retentionOf(firm, NOW))
  })
})
