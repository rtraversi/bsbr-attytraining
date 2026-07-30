import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { TrainingReminderEmail } from '@/emails/training-reminder'

type AdminClient = ReturnType<typeof createAdminClient>

type Result = { ok: true } | { ok: false; error: string; status: number }

/**
 * Generates a fresh magic link for `email` and sends the training-reminder email.
 * Shared by /api/invite/remind (resolves email from a userId) and
 * /api/invite/resend (resolves email by matching within the firm). Callers are
 * responsible for auth + confirming the email belongs to the caller's firm — this
 * helper only does the link + send once that's established.
 */
export async function sendTrainingReminder(
  admin: AdminClient,
  firmId: string,
  email: string
): Promise<Result> {
  const { data: firm } = await admin.from('firms').select('name').eq('id', firmId).single()
  const firmName = firm?.name ?? 'Your firm'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/auth/callback?next=/dashboard/training` },
  })

  if (linkError) {
    console.error('[training-reminder] generateLink error:', linkError)
    return { ok: false, error: 'Failed to generate login link', status: 500 }
  }

  const hashedToken = linkData?.properties?.hashed_token
  const actionLink = hashedToken
    ? `${appUrl}/auth/confirm?token_hash=${hashedToken}&type=magiclink&next=/dashboard/training`
    : linkData?.properties?.action_link

  try {
    const html = await render(TrainingReminderEmail({ firmName, actionLink: actionLink ?? '' }))
    await sendEmail({
      to: email,
      // Matches the template's headline and the cert-worker cron's subject —
      // all three carry the same all-or-none framing (Max, 2026-07-30).
      subject: 'Your firm can’t be certified until everyone completes their training',
      html,
    })
  } catch (err) {
    console.error('[training-reminder] sendEmail error:', err)
    return { ok: false, error: 'Failed to send reminder email', status: 500 }
  }

  return { ok: true }
}
