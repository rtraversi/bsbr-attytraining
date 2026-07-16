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

interface CertEarnedAdminEmailProps {
  employeeName: string
  firmName: string
  dashboardUrl: string
}

/**
 * Admin-side companion to CertDeliveryEmail — there was no admin copy of this
 * event before. Links to the dashboard rather than a signed cert URL: the
 * admin already has standing access to every cert from Manage Team, so a
 * second signed link isn't needed here.
 */
export function CertEarnedAdminEmail({
  employeeName,
  firmName,
  dashboardUrl,
}: CertEarnedAdminEmailProps) {
  return (
    <EmailShell preview={`${employeeName} just earned their AI Staff Compliance Certificate`}>
      <Section style={badgeRow}>
        <Text style={badge}>✓ Team Member Certified</Text>
      </Section>

      <Text style={heading} className={EMAIL_CLASS.heading}>
        {employeeName} is certified
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        A member of your team at <strong>{firmName}</strong> just completed AI Staff Compliance
        Training and passed the certification quiz.
      </Text>

      <Section style={buttonContainer}>
        <Button href={dashboardUrl} style={button}>
          View in Dashboard
        </Button>
      </Section>

      <Text style={mutedText} className={EMAIL_CLASS.muted}>
        You can turn this notification off anytime from Settings → Notifications.
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
  color: '#0094FF',
  display: 'inline-block',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  margin: '0',
  padding: '5px 14px',
  textTransform: 'uppercase',
}
