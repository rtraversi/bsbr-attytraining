import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseRecipients, isUndeliverable, sendEmail } from '@/lib/resend'

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

/**
 * The test suite seeds users at `@test.invalid` and drives real pipelines, so
 * a quiz pass would otherwise send a real cert email that bounces — and a
 * sustained bounce rate is what gets the Resend account suspended.
 */
describe('isUndeliverable / sendEmail skipping .invalid', () => {
  it('flags the reserved .invalid TLD, case-insensitively', () => {
    expect(isUndeliverable('quizforge-passer-abc@test.invalid')).toBe(true)
    expect(isUndeliverable('deleted-123@redacted.invalid')).toBe(true)
    expect(isUndeliverable('X@TEST.INVALID')).toBe(true)
    expect(isUndeliverable('Name <x@test.invalid>')).toBe(true)
  })

  it('does not flag real addresses that merely contain "invalid"', () => {
    expect(isUndeliverable('rob@example.com')).toBe(false)
    expect(isUndeliverable('invalid@example.com')).toBe(false)
    expect(isUndeliverable('x@invalid.example.com')).toBe(false)
  })

  describe('sendEmail', () => {
    const originalKey = process.env.RESEND_API_KEY
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
      process.env.RESEND_API_KEY = 're_test'
      fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
      vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      process.env.RESEND_API_KEY = originalKey
    })

    it('makes no request when every recipient is .invalid', async () => {
      await sendEmail({ to: 'a@test.invalid, b@test.invalid', subject: 's', html: 'h' })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('sends only to the deliverable recipients of a mixed list', async () => {
      await sendEmail({ to: 'rob@example.com, a@test.invalid', subject: 's', html: 'h' })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.to).toEqual(['rob@example.com'])
    })

    it('still throws on an empty recipient value', async () => {
      await expect(sendEmail({ to: ' , ', subject: 's', html: 'h' })).rejects.toThrow(
        'no valid recipients'
      )
    })
  })
})
