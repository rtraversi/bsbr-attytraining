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
}

// TEMPORARY — pending Rob's business address (cutover item C4, tracked as
// ix-supportdest). Matches the sign-in page's support mailto and the inbox
// app/api/support/contact/route.ts:8 already delivers to. The in-app support
// form is not an option here: it requires a session, and the whole problem is
// that this buyer has no account to sign in to.
const SUPPORT_EMAIL = 'solarsaiko@gmail.com'

export function CheckoutEmailInUseEmail({ email }: CheckoutEmailInUseProps) {
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
        Please reply to this message or write to{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} style={link}>
          {SUPPORT_EMAIL}
        </a>{' '}
        before buying again, and we&apos;ll sort out your payment and get you set up on the right
        address.
      </Text>

      <Text style={mutedText} className={EMAIL_CLASS.muted}>
        Quote this email when you get in touch and we&apos;ll be able to find your payment straight
        away.
      </Text>
    </EmailShell>
  )
}
