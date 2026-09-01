// =============================================================================
// Telling a firm their policy is ready — the notification half of delivery.
//
// 🔴 THE DELIVERY IS THE WRITE, NOT THE EMAIL. markDelivered() has already
// committed by the time anything here runs, and nothing here can undo it. A
// firm whose policy was approved has an approved policy whether or not the mail
// went out; rolling the approval back because an SMTP provider was down would
// be letting a notification decide a legal fact.
//
// So every failure path in this file returns a reason and logs. None of them
// throws, and the caller does not have a failure branch to write.
//
// ── It is dark today, for TWO independent reasons ───────────────────────────
//
//   1. Resend returns 403 — iurixaccreditation.com is not verified for this
//      key. Tracked separately; not this file's problem to fix.
//   2. THE COPY IS A PLACEHOLDER. emails/policy-delivered.tsx ships with
//      TODO(copy) markers and POLICY_EMAIL_COPY_APPROVED = false.
//
// Reason 2 is the one that matters, because reason 1 will be fixed by someone
// touching DNS and nothing else — and on that day, without the guard below,
// every delivery would start sending a real firm an email reading
// "[TODO(copy) — headline]". The flag is checked FIRST for exactly that
// sequence.
// =============================================================================

import { sendEmail } from '@/lib/resend'

/**
 * Whether emails/policy-delivered.tsx has had its TODO(copy) placeholders
 * replaced with approved copy.
 *
 * 🔴 A DELIBERATE TRIPWIRE, and it lives HERE rather than beside the copy for a
 * concrete reason: that file is JSX, Node's type stripping cannot parse JSX, and
 * scripts/deliver-policy.mjs therefore cannot import it at all. A guard the
 * operator script cannot read is not a guard. Checking it here means the script
 * learns it must not send WITHOUT loading the template.
 *
 * Set true only when every TODO(copy) marker in that file is gone.
 */
export const POLICY_EMAIL_COPY_APPROVED = false

/** TODO(copy) — the subject line. Max's to write; see the template's header. */
export const POLICY_DELIVERED_SUBJECT = '[TODO(copy) — subject line]'

export type DeliveryNotice =
  | { sent: true }
  | {
      sent: false
      /**
       * `copy-not-approved` — the template still holds TODO(copy) placeholders.
       * `no-recipient`      — the firm has no admin address to write to.
       * `no-app-url`        — NEXT_PUBLIC_APP_URL is unset, so the link would be relative.
       * `send-failed`       — Resend refused, or the template could not be
       *                        loaded. Today Resend returns 403, domain not verified.
       */
      reason: 'copy-not-approved' | 'no-recipient' | 'no-app-url' | 'send-failed'
      detail: string
    }

/**
 * Tell a firm their policy is ready. Never throws.
 *
 * Returns what happened so the operator script can print it — a delivery that
 * silently did not notify anybody looks identical to one that did, and the
 * person running it is the only one who can tell the firm by hand.
 */
export async function sendPolicyDeliveredEmail({
  to,
  firmName,
}: {
  to: string | null
  firmName: string
}): Promise<DeliveryNotice> {
  // Checked before anything else. See the header: when Resend starts working,
  // this is what stops placeholder copy reaching a real inbox.
  if (!POLICY_EMAIL_COPY_APPROVED) {
    return {
      sent: false,
      reason: 'copy-not-approved',
      detail:
        'emails/policy-delivered.tsx still contains TODO(copy) placeholders. The policy IS ' +
        'delivered; the firm has not been emailed. Tell them by hand, or write the copy.',
    }
  }

  if (!to) {
    return {
      sent: false,
      reason: 'no-recipient',
      detail: `No admin email address for ${firmName}.`,
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  if (!appUrl) {
    // A relative link in an email is a dead link. Better to refuse and say so
    // than to send mail whose only button goes nowhere.
    return {
      sent: false,
      reason: 'no-app-url',
      detail: 'NEXT_PUBLIC_APP_URL is unset, so the link in the email would not resolve.',
    }
  }

  try {
    // ⚠️ IMPORTED LAZILY, AND THAT IS LOAD-BEARING. Both this module and the
    // template are reachable from scripts/deliver-policy.mjs, which runs under
    // Node's type stripping — and that cannot parse JSX. A static import would
    // make this whole file unloadable from the script, taking markDelivered's
    // notify step down with it. Behind the flag check above, the template is
    // never even reached today.
    const [{ render }, { PolicyDeliveredEmail }] = await Promise.all([
      import('@react-email/render'),
      import('@/emails/policy-delivered'),
    ])
    const html = await render(
      PolicyDeliveredEmail({ firmName, policyUrl: `${appUrl}/dashboard/policy` }),
    )
    await sendEmail({ to, subject: POLICY_DELIVERED_SUBJECT, html })
    return { sent: true }
  } catch (err) {
    // Logged, not thrown. The delivery already happened.
    console.error('[policy-delivery] notification email failed:', err)
    return {
      sent: false,
      reason: 'send-failed',
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}
