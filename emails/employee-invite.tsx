import { Button, Section, Text } from '@react-email/components'
import * as React from 'react'
import {
  bullet,
  button,
  buttonContainer,
  calloutBox,
  calloutItem,
  EMAIL_CLASS,
  EmailShell,
  heading,
  mutedText,
  paragraph,
} from '@/emails/_components/email-shell'

interface EmployeeInviteEmailProps {
  firmName: string
  actionLink: string
}

export function EmployeeInviteEmail({ firmName, actionLink }: EmployeeInviteEmailProps) {
  return (
    <EmailShell preview={`${firmName} has invited you to complete AI compliance training`}>
      <Text style={heading} className={EMAIL_CLASS.heading}>
        You&apos;ve been invited to complete AI compliance training
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        <strong>{firmName}</strong> has enrolled you in IURIX — the training that certifies you on
        your firm&apos;s written AI use policy: what you may use AI for, what you may not, and how
        client information is handled.
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        Here&apos;s what to expect:
      </Text>

      <Section style={calloutBox} className={EMAIL_CLASS.callout}>
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <span style={bullet}>→</span> A short interactive course (~20–30 minutes)
        </Text>
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <span style={bullet}>→</span> A brief quiz to confirm your understanding
        </Text>
        <Text style={calloutItem} className={EMAIL_CLASS.text}>
          <span style={bullet}>→</span> A downloadable PDF certificate upon passing
        </Text>
      </Section>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        Click below to set up your account and begin. This link is valid for{' '}
        <strong>24 hours</strong> and works only once.
      </Text>

      <Section style={buttonContainer}>
        <Button href={actionLink} style={button}>
          Accept Invitation &amp; Begin Training
        </Button>
      </Section>

      <Text style={mutedText} className={EMAIL_CLASS.muted}>
        If you believe you received this email in error, you can safely ignore it. No account will
        be created until you click the link above.
      </Text>
    </EmailShell>
  )
}
