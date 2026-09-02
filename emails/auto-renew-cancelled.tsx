import { Section, Text } from '@react-email/components'
import * as React from 'react'
import {
  calloutBox,
  calloutItem,
  EMAIL_CLASS,
  EmailShell,
  heading,
  mutedText,
  paragraph,
} from '@/emails/_components/email-shell'

interface AutoRenewCancelledEmailProps {
  firmName: string
  /** ISO date the paid period ends, or null if Stripe did not report one. */
  accessEndsAt: string | null
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Sent when an admin turns auto-renewal OFF. Not sent on resume — resuming is
 * not a destructive act and a receipt for it would be noise.
 *
 * No operator alert accompanies this. Rob stays out of normal customer flows by
 * design; a cancellation is a normal flow, not an incident.
 *
 * Tone matches the other templates: state the consequence plainly, do not beg.
 * There is deliberately no "are you sure?" or win-back offer here — the decision
 * was already confirmed in-product, and re-litigating it in an email the
 * customer did not ask for reads as a dark pattern.
 */
export function AutoRenewCancelledEmail({
  firmName,
  accessEndsAt,
}: AutoRenewCancelledEmailProps) {
  const endDate = fmtDate(accessEndsAt)

  return (
    <EmailShell preview={`Auto-renewal is off for ${firmName}`}>
      <Text style={heading} className={EMAIL_CLASS.heading}>
        Auto-renewal is off
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        Auto-renewal has been turned off for <strong>{firmName}</strong>. You will not be
        charged again.
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        {endDate ? (
          <>
            Your subscription stays fully active until <strong>{endDate}</strong>. Nothing
            changes before then.
          </>
        ) : (
          <>Your subscription stays fully active until the end of your current billing period.</>
        )}
      </Text>

      <Section style={calloutBox} className={EMAIL_CLASS.callout}>
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <strong>Certificates your staff have already earned are permanent.</strong> They
          remain valid and downloadable after this date. They are compliance records, and ending
          a subscription does not revoke them.
        </Text>
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <strong>
            After {endDate ?? 'that date'}, your staff cannot take or retake the training.
          </strong>{' '}
          That means nobody can re-certify once their current certificate expires.
        </Text>
      </Section>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        If this was not what you intended, you can turn auto-renewal back on from Billing
        in your dashboard at any time before{endDate ? ` ${endDate}` : ' your period ends'}.
      </Text>

      <Text style={mutedText} className={EMAIL_CLASS.muted}>
        This is a confirmation of a change made from your IURIX dashboard.
      </Text>
    </EmailShell>
  )
}
