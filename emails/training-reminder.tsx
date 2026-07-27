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

interface TrainingReminderEmailProps {
  firmName: string
  actionLink: string
}

export function TrainingReminderEmail({ firmName, actionLink }: TrainingReminderEmailProps) {
  return (
    <EmailShell preview={`Complete your AI compliance training for ${firmName}`}>
      <Text style={heading} className={EMAIL_CLASS.heading}>
        You have outstanding compliance training
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        <strong>{firmName}</strong> has asked us to remind you that your IURIX training is still
        outstanding. Completing it earns you a compliance certificate under ABA Model Rule 5.3.
      </Text>

      <Section style={buttonContainer}>
        <Button href={actionLink} style={button}>
          Complete Your Training
        </Button>
      </Section>

      <Text style={mutedText} className={EMAIL_CLASS.muted}>
        If you believe you received this in error, you can safely ignore it.
      </Text>
    </EmailShell>
  )
}
