import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface EmployeeInviteEmailProps {
  firmName: string
  actionLink: string
}

export function EmployeeInviteEmail({ firmName, actionLink }: EmployeeInviteEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{firmName} has invited you to complete AI compliance training</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>AI Staff Compliance</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>You&apos;ve been invited to complete AI compliance training</Heading>

            <Text style={paragraph}>
              <strong>{firmName}</strong> has enrolled you in AI Staff Compliance Training — a
              required certification program covering proper AI usage under ABA Model Rule 5.3.
            </Text>

            <Text style={paragraph}>Here&apos;s what to expect:</Text>

            <Section style={listContainer}>
              <Text style={listItem}>
                <span style={bullet}>→</span> A short video course (~20–30 minutes)
              </Text>
              <Text style={listItem}>
                <span style={bullet}>→</span> A brief quiz to confirm your understanding
              </Text>
              <Text style={listItem}>
                <span style={bullet}>→</span> A downloadable PDF certificate upon passing
              </Text>
            </Section>

            <Text style={paragraph}>
              Click below to set up your account and begin. This link is valid for{' '}
              <strong>24 hours</strong> and works only once.
            </Text>

            <Section style={buttonContainer}>
              <Button href={actionLink} style={button}>
                Accept Invitation &amp; Begin Training
              </Button>
            </Section>

            <Text style={smallText}>
              If you believe you received this email in error, you can safely ignore it. No account
              will be created until you click the link above.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              AI Staff Compliance Training · Built Smart by Rob
              <br />
              Questions? Contact{' '}
              <a href="mailto:info@aistaffcompliance.com" style={link}>
                info@aistaffcompliance.com
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = {
  backgroundColor: '#F5F4F0',
  fontFamily: 'Georgia, "Times New Roman", serif',
  margin: '0',
  padding: '40px 0',
}

const container: React.CSSProperties = {
  backgroundColor: '#FAFAF8',
  borderRadius: '8px',
  margin: '0 auto',
  maxWidth: '560px',
  overflow: 'hidden',
}

const header: React.CSSProperties = {
  backgroundColor: '#1A1A1A',
  padding: '24px 40px',
}

const logo: React.CSSProperties = {
  color: '#FAFAF8',
  fontSize: '16px',
  fontWeight: '600',
  letterSpacing: '0.05em',
  margin: '0',
  textTransform: 'uppercase',
}

const content: React.CSSProperties = {
  padding: '40px 40px 32px',
}

const h1: React.CSSProperties = {
  color: '#1A1A1A',
  fontSize: '24px',
  fontWeight: '700',
  lineHeight: '1.3',
  margin: '0 0 24px',
}

const paragraph: React.CSSProperties = {
  color: '#3D3D3D',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const listContainer: React.CSSProperties = {
  backgroundColor: '#F0EDE6',
  borderLeft: '3px solid #C8783A',
  borderRadius: '4px',
  margin: '0 0 24px',
  padding: '16px 20px',
}

const listItem: React.CSSProperties = {
  color: '#3D3D3D',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0 0 8px',
}

const bullet: React.CSSProperties = {
  color: '#C8783A',
  fontWeight: '700',
  marginRight: '8px',
}

const buttonContainer: React.CSSProperties = {
  margin: '32px 0',
  textAlign: 'center',
}

const button: React.CSSProperties = {
  backgroundColor: '#C8783A',
  borderRadius: '6px',
  color: '#FAFAF8',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  letterSpacing: '0.02em',
  padding: '14px 32px',
  textDecoration: 'none',
}

const smallText: React.CSSProperties = {
  color: '#888',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0 0 24px',
}

const hr: React.CSSProperties = {
  borderColor: '#E8E6E0',
  margin: '0 0 24px',
}

const footer: React.CSSProperties = {
  color: '#999',
  fontSize: '12px',
  lineHeight: '1.6',
  margin: '0',
}

const link: React.CSSProperties = {
  color: '#C8783A',
  textDecoration: 'underline',
}
