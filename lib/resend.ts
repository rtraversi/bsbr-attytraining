const RESEND_API_URL = 'https://api.resend.com/emails'
// iurixaccreditation.com is verified in Resend (Rob, 2026-07-29) — DKIM, SPF and
// DMARC all confirmed live.
//
// noreply@ is still deliberate, but the ORIGINAL reason is now void. This said
// "the zone has no inbound MX, so replies would bounce"; that stopped being true
// on 2026-08-04, when Zoho MX went live on the apex (mx.zoho.com, with
// v=spf1 include:one.zoho.com ~all). Inbound mail is now delivered.
//
// It stays noreply@ because nothing monitors a reply to a transactional send —
// certificate deliveries, reminders and renewal notices all reach people who
// have a real support route, and inviting replies into an inbox nobody watches
// for them is worse than declining them. Changing it is a decision about who
// reads that mail, not a DNS question any more.
//
// The Zoho SPF sits at the APEX while Resend sends from
// send.iurixaccreditation.com, which carries its own SPF, so inbound and
// outbound do not collide.
const FROM_ADDRESS = 'IURIX <noreply@iurixaccreditation.com>'

/**
 * Split a recipient value into the array Resend's API expects.
 *
 * Resend accepts a string OR an array, but NOT one string containing commas —
 * "a@x.com, b@y.com" is treated as a single malformed address and the send
 * fails. So a config value holding several addresses has to be split here
 * rather than passed through.
 *
 * This is what lets OPERATOR_ALERT_EMAIL hold a list: alerts about a customer
 * who paid and got nothing should reach more than one person, and a single
 * address is a single point of failure for exactly the message that must not be
 * missed.
 *
 * Empty entries are dropped, so a trailing comma or a stray space in a Worker
 * secret cannot produce an empty recipient and a 422 from Resend.
 */
export function parseRecipients(to: string): string[] {
  return to
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean)
}

/**
 * True for an address on the reserved `.invalid` TLD (RFC 2606), which can
 * never receive mail.
 *
 * The test suite seeds its users at `@test.invalid` and drives real pipelines
 * — a quiz pass fires the real cert email. While Resend was answering 403 that
 * was invisible; once it verified (2026-09-24) every test run bounced real
 * sends, and a sustained bounce rate is what gets a Resend account suspended —
 * the same account that delivers customers' invites. Deleted members are also
 * rewritten to `@redacted.invalid`; callers already skip those, this is the
 * backstop.
 */
export function isUndeliverable(address: string): boolean {
  return /\.invalid>?$/i.test(address.trim())
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  /** One address, or several separated by commas. */
  to: string
  subject: string
  html: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not set')

  const recipients = parseRecipients(to)
  // Thrown rather than silently skipped: a caller that believes it sent an
  // operator alert and did not is worse than a visible failure, and every call
  // site here already treats a send failure as loggable.
  if (recipients.length === 0) throw new Error('sendEmail: no valid recipients')

  // Skipped, not thrown — unlike an empty list above, a `.invalid` recipient
  // is a known test or redacted address, not a misconfiguration.
  const deliverable = recipients.filter((address) => !isUndeliverable(address))
  if (deliverable.length === 0) return

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: deliverable, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}
