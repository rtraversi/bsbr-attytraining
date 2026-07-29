const RESEND_API_URL = 'https://api.resend.com/emails'
// iurixaccreditation.com is verified in Resend (Rob, 2026-07-29) — DKIM, SPF and
// DMARC all confirmed live. noreply@ is deliberate: the zone has no inbound MX,
// so replies would bounce; don't imply a reply is possible. If a monitored
// address is ever wanted, add MX + a mailbox first, then change this.
const FROM_ADDRESS = 'IURIX <noreply@iurixaccreditation.com>'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not set')

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}
