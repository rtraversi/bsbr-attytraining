import { describe, it, expect } from 'vitest'
import { parseRecipients } from '@/lib/resend'

/**
 * Resend accepts a string OR an array, but not one string containing commas.
 * The failure mode this guards against is quiet: a comma-joined
 * OPERATOR_ALERT_EMAIL is a well-formed request with one malformed recipient,
 * so the alert that a customer paid and received nothing simply never arrives.
 *
 * The cert-worker carries a duplicate of this function (it builds independently
 * of the app). If one changes, change both.
 */
describe('parseRecipients', () => {
  it('passes a single address through unchanged', () => {
    expect(parseRecipients('rob@example.com')).toEqual(['rob@example.com'])
  })

  it('splits several addresses into an array', () => {
    expect(parseRecipients('rob@example.com,max@example.com')).toEqual([
      'rob@example.com',
      'max@example.com',
    ])
  })

  it('trims the whitespace people actually type after a comma', () => {
    expect(parseRecipients('rob@example.com, max@example.com')).toEqual([
      'rob@example.com',
      'max@example.com',
    ])
  })

  it('drops empty entries from a trailing comma', () => {
    // A stray comma in a Worker secret would otherwise become an empty
    // recipient and a 422 from Resend.
    expect(parseRecipients('rob@example.com,')).toEqual(['rob@example.com'])
    expect(parseRecipients('rob@example.com,,max@example.com')).toEqual([
      'rob@example.com',
      'max@example.com',
    ])
  })

  it('returns nothing for an empty or whitespace-only value', () => {
    // sendEmail turns this into a thrown error rather than a silent no-send.
    expect(parseRecipients('')).toEqual([])
    expect(parseRecipients('   ')).toEqual([])
    expect(parseRecipients(' , , ')).toEqual([])
  })

  it('handles surrounding whitespace on a single address', () => {
    expect(parseRecipients('  rob@example.com  ')).toEqual(['rob@example.com'])
  })
})
