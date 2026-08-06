import { describe, it, expect } from 'vitest'
import {
  choosePriceId,
  isTestSecretKey,
  PriceResolutionError,
  SANDBOX_FALLBACK_PRICE_ID,
} from '@/lib/stripe-price'

/**
 * These cover the decision, not the network call. The rule that matters is the
 * asymmetry between test and live mode: in sandbox a missing lookup key falls
 * back so nothing breaks before the key is set, and in live mode the same
 * situation must refuse rather than charge against a Price nobody chose.
 *
 * Mocking stripe.prices.list would only assert that the mock was written to
 * match the code, so the network round trip is deliberately not covered here —
 * it is exercised by an actual checkout against the sandbox.
 */

const LIVE_KEY = 'sk_live_abc123'
const TEST_KEY = 'sk_test_abc123'

describe('isTestSecretKey', () => {
  it('recognises test and restricted-test keys', () => {
    expect(isTestSecretKey('sk_test_abc')).toBe(true)
    expect(isTestSecretKey('rk_test_abc')).toBe(true)
  })

  it('treats live, restricted-live and missing keys as not-test', () => {
    expect(isTestSecretKey('sk_live_abc')).toBe(false)
    expect(isTestSecretKey('rk_live_abc')).toBe(false)
    expect(isTestSecretKey(undefined)).toBe(false)
    expect(isTestSecretKey('')).toBe(false)
  })

  it('does not match a live key that merely contains the word test', () => {
    expect(isTestSecretKey('sk_live_testaccount')).toBe(false)
  })
})

describe('choosePriceId — the happy path', () => {
  it('uses the single active Price carrying the lookup key, in either mode', () => {
    for (const secretKey of [TEST_KEY, LIVE_KEY]) {
      const r = choosePriceId({
        matches: [{ id: 'price_live_real', active: true }],
        secretKey,
        lookupKey: 'per_seat_annual',
      })
      expect(r).toEqual({ priceId: 'price_live_real', usedFallback: false })
    }
  })

  it('ignores inactive Prices that carry the key', () => {
    const r = choosePriceId({
      matches: [
        { id: 'price_archived', active: false },
        { id: 'price_current', active: true },
      ],
      secretKey: LIVE_KEY,
      lookupKey: 'per_seat_annual',
    })
    expect(r).toEqual({ priceId: 'price_current', usedFallback: false })
  })
})

describe('choosePriceId — no Price carries the lookup key', () => {
  it('falls back to the sandbox Price in test mode, so sandbox keeps working', () => {
    const r = choosePriceId({
      matches: [],
      secretKey: TEST_KEY,
      lookupKey: 'per_seat_annual',
    })
    expect(r).toEqual({ priceId: SANDBOX_FALLBACK_PRICE_ID, usedFallback: true })
  })

  it('REFUSES in live mode rather than charging against an unchosen Price', () => {
    expect(() =>
      choosePriceId({ matches: [], secretKey: LIVE_KEY, lookupKey: 'per_seat_annual' })
    ).toThrow(PriceResolutionError)
  })

  it('refuses when the secret key is missing entirely', () => {
    // Safe default: absence of a key is not evidence of test mode.
    expect(() =>
      choosePriceId({ matches: [], secretKey: undefined, lookupKey: 'per_seat_annual' })
    ).toThrow(PriceResolutionError)
  })

  it('names the lookup key in the live-mode error so the fix is obvious', () => {
    expect(() =>
      choosePriceId({ matches: [], secretKey: LIVE_KEY, lookupKey: 'per_seat_annual' })
    ).toThrow(/per_seat_annual/)
  })

  it('treats a key-carrying but archived Price as no match', () => {
    expect(() =>
      choosePriceId({
        matches: [{ id: 'price_archived', active: false }],
        secretKey: LIVE_KEY,
        lookupKey: 'per_seat_annual',
      })
    ).toThrow(PriceResolutionError)
  })
})

describe('choosePriceId — ambiguity is never guessed at', () => {
  it('refuses when two active Prices share the lookup key, even in test mode', () => {
    for (const secretKey of [TEST_KEY, LIVE_KEY]) {
      expect(() =>
        choosePriceId({
          matches: [
            { id: 'price_old', active: true },
            { id: 'price_new', active: true },
          ],
          secretKey,
          lookupKey: 'per_seat_annual',
        })
      ).toThrow(PriceResolutionError)
    }
  })

  it('lists the competing ids so the operator can archive the wrong one', () => {
    expect(() =>
      choosePriceId({
        matches: [
          { id: 'price_old', active: true },
          { id: 'price_new', active: true },
        ],
        secretKey: LIVE_KEY,
        lookupKey: 'per_seat_annual',
      })
    ).toThrow(/price_old.*price_new/)
  })
})
