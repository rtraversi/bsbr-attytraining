const RESEND_API_URL = 'https://api.resend.com/emails'
// Display name only — the aistaffcompliance.com address stays until the new
// domain is verified in Resend (Phase B). Sending from an unverified domain
// silently fails, so the address must not move ahead of that.
const FROM_ADDRESS = 'IURIX <info@aistaffcompliance.com>'

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
