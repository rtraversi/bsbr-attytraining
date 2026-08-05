import { Button, Section, Text } from '@react-email/components'
import * as React from 'react'
import {
  button,
  buttonContainer,
  EMAIL_BRAND,
  EMAIL_CLASS,
  EmailShell,
  heading,
  mutedText,
  paragraph,
} from '@/emails/_components/email-shell'

interface CertDeliveryEmailProps {
  employeeName: string
  firmName: string
  certUrl: string
  validUntil: string
}

export function CertDeliveryEmail({
  employeeName,
  firmName,
  certUrl,
  validUntil,
}: CertDeliveryEmailProps) {
  return (
    <EmailShell preview="Your IURIX certificate is ready to download">
      <Section style={badgeRow}>
        <Text style={badge}>✓ Training Complete</Text>
      </Section>

      <Text style={heading} className={EMAIL_CLASS.heading}>
        Your compliance certificate is ready
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        Congratulations, {employeeName}. You&apos;ve completed IURIX training on behalf of{' '}
        <strong>{firmName}</strong> and passed the certification quiz.
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        Your certificate is valid through <strong>{validUntil}</strong>. Download and save it — your
        firm administrator also has access to it from the firm dashboard.
      </Text>

      <Section style={buttonContainer}>
        <Button href={certUrl} style={button}>
          Download Certificate (PDF)
        </Button>
      </Section>

      <Text style={mutedText} className={EMAIL_CLASS.muted}>
        This download link expires in 7 days. If you need a new copy after that, contact your firm
        administrator or reply to this email.
      </Text>
    </EmailShell>
  )
}

const badgeRow: React.CSSProperties = {
  marginBottom: '16px',
  textAlign: 'center',
}

const badge: React.CSSProperties = {
  backgroundColor: '#EAF8FF',
  borderRadius: '999px',
  color: EMAIL_BRAND.emphasis,
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  margin: '0',
  padding: '5px 14px',
  textTransform: 'uppercase',
}
