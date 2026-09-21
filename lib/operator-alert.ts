import { sendEmail } from '@/lib/resend'

/**
 * Best-effort operator alert. A mail failure is logged and swallowed.
 *
 * Extracted from app/api/webhooks/stripe/route.ts (where it originated) so a
 * route outside the webhook — e.g. app/api/billing/cancel-refund/route.ts —
 * can use the identical pattern instead of re-implementing it.
 *
 * May hold SEVERAL addresses, comma-separated. sendEmail splits them (see
 * parseRecipients in lib/resend.ts), so an alert that a customer paid and got
 * nothing can reach more than one person — a single address is a single point
 * of failure for exactly the message that must not be missed.
 */
export async function alertOperator(subject: string, lines: string[]) {
  const operatorEmail = process.env.OPERATOR_ALERT_EMAIL ?? 'info@iurixaccreditation.com'

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:32px 24px">
<ul style="font-size:14px">
${lines.map((l) => `  <li>${l}</li>`).join('\n')}
</ul>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">IURIX</p>
</body></html>`

  try {
    await sendEmail({ to: operatorEmail, subject, html })
  } catch (mailErr) {
    console.error('[operator-alert] operator alert email failed:', mailErr)
  }
}
