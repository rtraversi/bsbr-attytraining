import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

/**
 * Shared chrome (Head + dark-mode <style>, centered logo lockup header, black
 * footer) for every transactional email. Templates render their body content as
 * `children`; keep per-element className hooks (see EMAIL_CLASS) on themed
 * elements so the dark-mode media query below can override the inline styles.
 *
 * Absolute production URL — email clients cannot resolve relative paths.
 */
const LOGO_URL =
  'https://bsbr-attytraining.aistaffcompliance.workers.dev/athena-logo-email.png'

// Real logo aspect ratio is 104:70 — scale proportionally, never square.
const LOGO_WIDTH = 32
const LOGO_HEIGHT = 21

const FONT_STACK = "'Stack Sans Headline', Arial, Helvetica, sans-serif"

/** className hooks the dark-mode media query targets (inline styles can't be). */
export const EMAIL_CLASS = {
  body: 'atc-body',
  card: 'atc-card',
  heading: 'atc-heading',
  text: 'atc-text',
  muted: 'atc-muted',
  callout: 'atc-callout',
  logo: 'atc-logo',
  wordmark: 'atc-wordmark',
} as const

const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .${EMAIL_CLASS.body} { background-color: #050607 !important; }
    .${EMAIL_CLASS.card} {
      background-color: #0D0F12 !important;
      border-color: #1F2429 !important;
    }
    .${EMAIL_CLASS.heading} { color: #F5F7FA !important; }
    .${EMAIL_CLASS.text} { color: #C4CBD2 !important; }
    .${EMAIL_CLASS.muted} { color: #7A8189 !important; }
    .${EMAIL_CLASS.callout} { background-color: #131A20 !important; }
    .${EMAIL_CLASS.wordmark} { color: #F5F7FA !important; }
    .${EMAIL_CLASS.logo} { filter: brightness(0) invert(1) !important; }
  }
`

interface EmailShellProps {
  preview: string
  children: React.ReactNode
}

export function EmailShell({ preview, children }: EmailShellProps) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: darkModeCss }} />
      </Head>
      <Preview>{preview}</Preview>
      <Body className={EMAIL_CLASS.body} style={body}>
        <Container className={EMAIL_CLASS.card} style={container}>
          {/* Centered logo lockup: image + wordmark as one tight unit */}
          <Section style={header}>
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              align="center"
              style={lockupTable}
            >
              <tbody>
                <tr>
                  <td style={lockupLogoCell}>
                    <Img
                      className={EMAIL_CLASS.logo}
                      src={LOGO_URL}
                      width={LOGO_WIDTH}
                      height={LOGO_HEIGHT}
                      alt="Athena"
                      style={logoImg}
                    />
                  </td>
                  <td style={lockupTextCell}>
                    <span className={EMAIL_CLASS.wordmark} style={wordmark}>
                      athena.
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={content}>{children}</Section>

          {/* Footer — always black, in both light and dark modes */}
          <Section style={footer}>
            <Text style={footerWordmark}>athena.</Text>
            <Text style={footerDisclaimer}>
              This certificate documents completion of training. It is not legal advice and does not
              constitute accreditation by the ABA or any state bar.
            </Text>
            <Text style={footerLinksRow}>
              <Link href="https://bsbr-attytraining.aistaffcompliance.workers.dev/privacy" style={footerLink}>
                Privacy Policy
              </Link>
              <span style={footerDot}> · </span>
              <Link href="https://bsbr-attytraining.aistaffcompliance.workers.dev/terms" style={footerLink}>
                Terms of Service
              </Link>
              <span style={footerDot}> · </span>
              <Link href="https://bsbr-attytraining.aistaffcompliance.workers.dev/dpa" style={footerLink}>
                Data Processing Addendum
              </Link>
            </Text>
            <Hr style={footerHr} />
            <Text style={footerCopyright}>© 2026 Athena. All rights reserved.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

/* ---------- shared content styles (exported for templates) ---------- */

export const heading: React.CSSProperties = {
  color: '#0A0A0A',
  fontFamily: FONT_STACK,
  fontSize: '24px',
  fontWeight: 600,
  lineHeight: '1.3',
  margin: '0 0 24px',
  textAlign: 'center',
}

export const paragraph: React.CSSProperties = {
  color: '#3D3D3D',
  fontFamily: FONT_STACK,
  fontSize: '16px',
  fontWeight: 300,
  lineHeight: '1.6',
  margin: '0 0 16px',
}

export const mutedText: React.CSSProperties = {
  color: '#8A8A8A',
  fontFamily: FONT_STACK,
  fontSize: '13px',
  fontWeight: 300,
  lineHeight: '1.5',
  margin: '0 0 8px',
}

export const calloutBox: React.CSSProperties = {
  backgroundColor: '#EAF8FF',
  borderLeft: '3px solid #32C7FF',
  borderRadius: '4px',
  margin: '0 0 24px',
  padding: '16px 20px',
}

export const calloutItem: React.CSSProperties = {
  color: '#3D3D3D',
  fontFamily: FONT_STACK,
  fontSize: '15px',
  fontWeight: 300,
  lineHeight: '1.5',
  margin: '0 0 8px',
}

export const bullet: React.CSSProperties = {
  color: '#0094FF',
  fontWeight: 700,
  marginRight: '8px',
}

export const buttonContainer: React.CSSProperties = {
  margin: '32px 0',
  textAlign: 'center',
}

export const button: React.CSSProperties = {
  backgroundColor: '#32C7FF',
  borderRadius: '12px',
  color: '#FFFFFF',
  display: 'inline-block',
  fontFamily: FONT_STACK,
  fontSize: '15px',
  fontWeight: 700,
  letterSpacing: '0.01em',
  padding: '14px 32px',
  textDecoration: 'none',
}

export const link: React.CSSProperties = {
  color: '#0094FF',
  textDecoration: 'underline',
}

/* ---------- shell chrome styles ---------- */

const body: React.CSSProperties = {
  backgroundColor: '#F5F7FA',
  fontFamily: FONT_STACK,
  margin: '0',
  padding: '40px 0',
}

const container: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5EEF5',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '560px',
  overflow: 'hidden',
}

const header: React.CSSProperties = {
  padding: '28px 40px 4px',
}

const lockupTable: React.CSSProperties = {
  margin: '0 auto',
}

const lockupLogoCell: React.CSSProperties = {
  paddingRight: '7px',
  verticalAlign: 'middle',
}

const lockupTextCell: React.CSSProperties = {
  verticalAlign: 'middle',
}

const logoImg: React.CSSProperties = {
  display: 'block',
  border: '0',
}

const wordmark: React.CSSProperties = {
  color: '#0A0A0A',
  fontFamily: FONT_STACK,
  fontSize: '22px',
  fontWeight: 300,
  letterSpacing: '-0.01em',
  lineHeight: '1',
}

const content: React.CSSProperties = {
  padding: '20px 40px 36px',
}

const footer: React.CSSProperties = {
  backgroundColor: '#000000',
  padding: '32px 40px',
}

const footerWordmark: React.CSSProperties = {
  color: '#FFFFFF',
  fontFamily: FONT_STACK,
  fontSize: '18px',
  fontWeight: 300,
  letterSpacing: '-0.01em',
  margin: '0 0 12px',
}

const footerDisclaimer: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.4)',
  fontFamily: FONT_STACK,
  fontSize: '11px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const footerLinksRow: React.CSSProperties = {
  fontFamily: FONT_STACK,
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0 0 16px',
}

const footerLink: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.6)',
  textDecoration: 'none',
}

const footerDot: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.35)',
}

const footerHr: React.CSSProperties = {
  borderColor: 'rgba(255, 255, 255, 0.12)',
  margin: '0 0 16px',
}

const footerCopyright: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.5)',
  fontFamily: FONT_STACK,
  fontSize: '11px',
  margin: '0',
}
