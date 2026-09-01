// =============================================================================
// Email deliverability — minting and consuming the proof.
//
// See migration 0029 for the whole argument. In one line: identity is already
// proven far better than an email could prove it, but DELIVERABILITY is not
// proven at all, and roster addresses are the riskiest because the admin types
// them for other people.
//
// 🔴 NOTHING HERE MAY BLOCK. Resend returns 403 on every send today
// (ix-dnszoho). Every function below reports failure as a value; none throws to
// stop a caller doing its real work.
// =============================================================================

import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Re-send window. Long enough that a double-click cannot spam somebody, short
 * enough that an admin fixing a typo is not told to come back tomorrow.
 */
export const VERIFICATION_RESEND_COOLDOWN_MS = 10 * 60 * 1000

/** The path the emailed link lands on. */
export const VERIFICATION_PATH = '/verify-email'

/**
 * A fresh single-use token on a member row, returned with the full link.
 *
 * Regenerating replaces any previous token, so the most recent link is the only
 * one that works. That is what makes a corrected address safe: fix the typo,
 * mint again, and the link sent to the wrong address is dead.
 */
export async function mintVerificationToken(
  admin: AdminClient,
  memberId: string,
  appUrl: string,
): Promise<{ token: string; link: string } | { error: string }> {
  // crypto.randomUUID twice: 256 bits of the platform CSPRNG, available
  // identically in Node, workerd and the browser. No dependency, and nothing
  // here is guessable by someone who knows a member id.
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')

  const { error } = await admin
    .from('firm_members')
    .update({
      email_verification_token: token,
      email_verification_sent_at: new Date().toISOString(),
    })
    .eq('id', memberId)

  if (error) return { error: error.message }

  return { token, link: `${appUrl}${VERIFICATION_PATH}?token=${token}` }
}

export type VerificationOutcome =
  | { ok: true; memberId: string; firmId: string }
  | { ok: false; reason: 'unknown_token' }

/**
 * Consume a token: mark the address proven and burn the link.
 *
 * Also clears invite_email_failed (0016). The two columns answer the same
 * question from opposite ends — "we tried and it did not go" and "we have never
 * had proof it would" — and a person who just clicked a link we sent them has
 * answered both. Leaving the older flag set would keep them in the notice
 * forever with no way to clear it.
 *
 * The conditional UPDATE is what makes it single-use: the second request matches
 * no row, because the first nulled the token.
 */
export async function consumeVerificationToken(
  admin: AdminClient,
  token: string,
): Promise<VerificationOutcome> {
  const { data, error } = await admin
    .from('firm_members')
    .update({
      email_verified_at: new Date().toISOString(),
      email_verification_token: null,
      invite_email_failed: false,
    })
    .eq('email_verification_token', token)
    .select('id, firm_id')

  if (error || !data || data.length === 0) return { ok: false, reason: 'unknown_token' }

  return { ok: true, memberId: data[0].id, firmId: data[0].firm_id }
}

/**
 * Record that an address is proven reachable, without a token.
 *
 * Used when somebody accepts an invite: they could only have reached the
 * password-set screen through a link that was emailed to them, so the address
 * demonstrably works.
 *
 * ⚠️ Slightly weaker than a clicked verification link — an invite could have
 * been forwarded by a colleague. Accepted deliberately: the alternative is
 * showing a firm "we cannot reach Sarah" about somebody who has already signed
 * in and started their training, which is the kind of wrong that teaches people
 * to ignore the notice.
 */
export async function markVerifiedByActivation(
  admin: AdminClient,
  userId: string,
  firmId: string,
): Promise<void> {
  await admin
    .from('firm_members')
    .update({
      email_verified_at: new Date().toISOString(),
      email_verification_token: null,
      invite_email_failed: false,
    })
    .eq('user_id', userId)
    .eq('firm_id', firmId)
    .is('email_verified_at', null)
}

/**
 * Whether this member should appear in the dashboard's deliverability notice.
 *
 * One notice, both signals — 0029's `email_verified_at` and 0016's
 * `invite_email_failed`. A firm does not care which column is set; they care
 * whether their paralegal is going to get their certificate.
 */
export function needsEmailAttention(member: {
  email_verified_at: string | null
  invite_email_failed: boolean
}): boolean {
  return member.email_verified_at === null || member.invite_email_failed
}
