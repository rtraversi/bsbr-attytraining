const RESEND_API_URL = 'https://api.resend.com/emails'
// iurixaccreditation.com is verified in Resend (Rob, 2026-07-29) — DKIM, SPF and
// DMARC all confirmed live. noreply@ is deliberate: the zone has no inbound MX,
// so replies would bounce; don't imply a reply is possible. If a monitored
// address is ever wanted, add MX + a mailbox first, then change this.
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

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: recipients, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}
