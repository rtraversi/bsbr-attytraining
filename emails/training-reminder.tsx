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
    <EmailShell
      preview={`${firmName} can’t be certified until everyone completes their training`}
    >
      {/* Framing is deliberate (Max, 2026-07-30). The previous headline used
          "outstanding" to mean unfinished, which reads as praise — the opposite
          of the intent — and framed this as a personal to-do. There is a second
          copy of this wording in the cert-worker's inactivityHtml (the cron
          reminder); the two must stay in sync. Accreditation is all-or-none (Katy's
          legal read): a firm is not accredited unless every member certifies. So
          this states the consequence for the firm rather than nagging the
          individual, and nothing here should imply that one person finishing is
          sufficient. */}
      <Text style={heading} className={EMAIL_CLASS.heading}>
        Your firm can’t be certified until everyone completes their training
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        <strong>{firmName}</strong> can’t be accredited until every member of the firm has completed
        the training on the firm’s AI use policy — and yours is still to do.
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
