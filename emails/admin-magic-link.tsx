import { Button, Section, Text } from '@react-email/components'
import * as React from 'react'
import {
  button,
  buttonContainer,
  EMAIL_CLASS,
  EmailShell,
  heading,
  mutedText,
  paragraph,
} from '@/emails/_components/email-shell'

interface AdminMagicLinkEmailProps {
  firmName: string
  actionLink: string
}

export function AdminMagicLinkEmail({ firmName, actionLink }: AdminMagicLinkEmailProps) {
  return (
    <EmailShell preview="Your firm dashboard is ready — access it here">
      <Text style={heading} className={EMAIL_CLASS.heading}>
        Your account is ready, {firmName}
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        Your firm has been enrolled in IURIX. You can now access your dashboard to invite staff,
        track their progress, and download compliance certificates.
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        Click the button below to sign in — this link is valid for <strong>24 hours</strong> and
        works only once.
      </Text>

      <Section style={buttonContainer}>
        <Button href={actionLink} style={button}>
          Access My Dashboard
        </Button>
      </Section>

      <Text style={mutedText} className={EMAIL_CLASS.muted}>
        If you didn&apos;t purchase IURIX, you can safely ignore this email.
      </Text>
    </EmailShell>
  )
}
