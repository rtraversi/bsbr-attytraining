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
 * Sent when a checkout completes with a billing address outside the US.
 *
 * This should be rare. /api/checkout refuses to create a session for a non-US
 * buyer, so anyone reaching this email got past that layer — which means they
 * were charged, and the tone has to reflect that we took money for something we
 * then declined to sell.
 *
 * The reason is stated plainly rather than dressed up. "Not available in your
 * country" reads as a licensing dodge; the real reason is that we keep all
 * training and certification data in the United States, and that is a
 * legitimate, checkable answer someone can act on.
 *
 * No suggestion to "try again" — unlike the email-in-use case there is nothing
 * they can change. Offering a retry that will fail identically is worse than
 * saying no once, clearly.
 */
interface CheckoutNonUsProps {
  /** The address they checked out with, so they can quote it to support. */
  email: string
  /**
   * Whether the subscription was actually cancelled. Never claim billing has
   * stopped on a failed cancel — same rule as every other refusal email here.
   */
  cancelled: boolean
}

// Rob's business address (cutover item C4, ix-supportdest). The in-app support
// form is not an option here: it requires a session, and this buyer has no
// account to sign in to.
const SUPPORT_EMAIL = 'info@iurixaccreditation.com'

export function CheckoutNonUsEmail({ email, cancelled }: CheckoutNonUsProps) {
  return (
    <EmailShell preview="We couldn't complete your IURIX purchase">
      <Text style={heading} className={EMAIL_CLASS.heading}>
        We couldn&apos;t complete your purchase
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        Your payment went through, but we weren&apos;t able to set up your account. The billing
        address on this purchase — for <strong>{email}</strong> — is outside the United States.
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        IURIX is currently available to US-based law firms only. We keep all training and
        certification data within the United States, and we are not set up to handle
        international data transfers, so we stopped rather than take on an obligation we
        cannot meet properly.
      </Text>

      <Section style={calloutBox} className={EMAIL_CLASS.callout}>
        {/* Billing first — it is what they will worry about, and burying it
            under the explanation reads as evasion. */}
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <span style={bullet}>→</span>{' '}
          {cancelled ? (
            <>
              <strong>You will not be charged again</strong> — we&apos;ve cancelled the
              subscription, and your payment is being refunded
            </>
          ) : (
            <>
              <strong>We&apos;re sorting out your payment</strong> — please get in touch so we can
              stop the subscription and refund you
            </>
          )}
        </Text>
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <span style={bullet}>→</span> Nothing was set up, and no training has been assigned
        </Text>
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <span style={bullet}>→</span> No account was created, so there is nothing to cancel your
          end
        </Text>
      </Section>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        {cancelled
          ? 'Refunds usually take a few business days to appear, depending on your bank. '
          : ''}
        If your firm is US-based and this address is wrong, or you&apos;d like us to let you know
        if that changes, write to{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={link}>
          {SUPPORT_EMAIL}
        </a>
        .
      </Text>

      <Text style={mutedText} className={EMAIL_CLASS.muted}>
        Quote this email when you get in touch and we&apos;ll be able to find your payment straight
        away.
      </Text>
    </EmailShell>
  )
}
