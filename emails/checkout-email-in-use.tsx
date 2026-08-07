import { Section, Text } from '@react-email/components'
import * as React from 'react'
import {
  bullet,
  calloutBox,
  calloutItem,
  EMAIL_CLASS,
  EmailShell,
  heading,
  link,
  mutedText,
  paragraph,
} from '@/emails/_components/email-shell'

/**
 * Sent when a checkout completes but the buyer's email is already attached to
 * another firm's account as staff (case 3 of ix-doublebill).
 *
 * They are the only person who can resolve this — we cannot move their address
 * off their employer's account for them — so unlike the other collision cases
 * this one gets a customer-facing email rather than only an operator alert.
 *
 * The other firm is deliberately never named. Telling this buyer which
 * organisation holds their address would leak one customer's staff roster to
 * another, and they already know who employs them.
 */
interface CheckoutEmailInUseProps {
  /** The address they checked out with. Shown back so they know which one to change. */
  email: string
  /**
   * Whether the subscription was actually cancelled. Drives whether this email
   * claims billing has stopped — never claim it on a failed cancel, because it
   * has not.
   */
  cancelled: boolean
}

// Rob's real business address (cutover item C4, ix-supportdest). Matches the
// sign-in page's support mailto and the inbox app/api/support/contact/route.ts
// already delivers to. The in-app support form is not an option here: it
// requires a session, and the whole problem is that this buyer has no account to
// sign in to.
//
// This is sent to someone we just charged and then refused. No code issues a
// Stripe refund here: that remains a human decision, so the email must never
// imply a refund is already under way.
const SUPPORT_EMAIL = 'info@iurixaccreditation.com'

export function CheckoutEmailInUseEmail({ email, cancelled }: CheckoutEmailInUseProps) {
  return (
    <EmailShell preview="We couldn't finish setting up your IURIX account">
      <Text style={heading} className={EMAIL_CLASS.heading}>
        We couldn&apos;t finish setting up your account
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        Your payment went through, but we weren&apos;t able to create your firm&apos;s account.
        The address you used — <strong>{email}</strong> — is already registered to an existing
        IURIX account as a staff member.
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        Each firm account needs its own email address, so we stopped rather than attaching your
        purchase to someone else&apos;s account.
      </Text>

      <Section style={calloutBox} className={EMAIL_CLASS.callout}>
        {/* Billing first — it is the thing they will worry about, and burying
            it under the explanation reads as evasion. */}
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <span style={bullet}>→</span>{' '}
          {cancelled ? (
            <>
              <strong>You will not be charged again</strong> — we&apos;ve cancelled the
              subscription. Please contact us so we can review the payment with you.
            </>
          ) : (
            <>
              <strong>Your subscription needs attention</strong> — please get in touch so we can
              stop it and review the payment with you
            </>
          )}
        </Text>
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <span style={bullet}>→</span> Nothing was set up, and no training has been assigned
        </Text>
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <span style={bullet}>→</span> Your existing staff access is unchanged
        </Text>
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <span style={bullet}>→</span> Purchasing again with a different email address will work
        </Text>
      </Section>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        Please write to{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={link}>
          {SUPPORT_EMAIL}
        </a>
        {' '}so we can review your payment and help you get set up on a different address.
      </Text>

      <Text style={mutedText} className={EMAIL_CLASS.muted}>
        Quote this email when you get in touch and we&apos;ll be able to find your payment straight
        away.
      </Text>
    </EmailShell>
  )
}
