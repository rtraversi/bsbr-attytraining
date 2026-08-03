import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

/**
 * Shared chrome (Head + dark-mode <style>, centered wordmark header, black
 * footer) for every transactional email. Templates render their body content as
 * `children`; keep per-element className hooks (see EMAIL_CLASS) on themed
 * elements so the dark-mode media query below can override the inline styles.
 *
 * The header is a text-only IURIX wordmark — there is no IURIX logo image yet,
 * and shipping the old Athena mark would put the retired brand in every email.
 * When the real artwork lands, reinstate an <Img> lockup here (it will need an
 * absolute URL; email clients cannot resolve relative paths).
 */
const FONT_STACK = "'Stack Sans Headline', Arial, Helvetica, sans-serif"

/**
 * Brand colours for email, as literal hex.
 *
 * ⚠ These deliberately do NOT use the `--brand-primary` / `--brand-emphasis`
 * custom properties defined in app/globals.css, and must not be changed to.
 * Email clients are not browsers: Gmail strips `<style>` blocks containing
 * custom properties and does not resolve `var()` in inline styles, and Outlook's
 * Word rendering engine has no support at all. A tokenised colour would render
 * as no colour — an unstyled black button on a white card — in the clients most
 * of our recipients actually use.
 *
 * So the app has one source of truth and email has a second, on purpose. Keep
 * the two in step by hand: a palette change is app/globals.css plus this block.
 * Values here are identical to the tokens as of 2026-08-03.
 */
export const EMAIL_BRAND = {
  /** Matches --brand-primary. Buttons and accent rules. */
  primary: '#32C7FF',
  /** Matches --brand-emphasis. Links. */
  emphasis: '#0094FF',
} as const

/** className hooks the dark-mode media query targets (inline styles can't be). */
export const EMAIL_CLASS = {
  body: 'atc-body',
  card: 'atc-card',
  heading: 'atc-heading',
  text: 'atc-text',
  muted: 'atc-muted',
  callout: 'atc-callout',
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
          {/* Centered text wordmark (no logo image yet — see file header note) */}
          <Section style={header}>
            <Text className={EMAIL_CLASS.wordmark} style={wordmark}>
              IURIX
            </Text>
          </Section>

          <Section style={content}>{children}</Section>

          {/* Footer — always black, in both light and dark modes */}
          <Section style={footer}>
            <Text style={footerWordmark}>IURIX</Text>
            <Text style={footerDisclaimer}>
              This certificate documents completion of training. It is not legal advice and does not
              constitute accreditation by the ABA or any state bar.
            </Text>
            <Text style={footerLinksRow}>
              <Link href="https://iurixaccreditation.com/privacy" style={footerLink}>
                Privacy Policy
              </Link>
              <span style={footerDot}> · </span>
              <Link href="https://iurixaccreditation.com/terms" style={footerLink}>
                Terms of Service
              </Link>
              <span style={footerDot}> · </span>
              <Link href="https://iurixaccreditation.com/dpa" style={footerLink}>
                Data Processing Addendum
              </Link>
            </Text>
            <Hr style={footerHr} />
            <Text style={footerCopyright}>© 2026 IURIX. All rights reserved.</Text>
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
  borderLeft: `3px solid ${EMAIL_BRAND.primary}`,
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
  color: EMAIL_BRAND.emphasis,
  fontWeight: 700,
  marginRight: '8px',
}

export const buttonContainer: React.CSSProperties = {
  margin: '32px 0',
  textAlign: 'center',
}

export const button: React.CSSProperties = {
  backgroundColor: EMAIL_BRAND.primary,
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
  color: EMAIL_BRAND.emphasis,
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

// All-caps wordmark: positive tracking, where the old lowercase "athena."
// lockup used negative. Caps need the extra letter-spacing to breathe.
const wordmark: React.CSSProperties = {
  color: '#0A0A0A',
  fontFamily: FONT_STACK,
  fontSize: '22px',
  fontWeight: 300,
  letterSpacing: '0.12em',
  lineHeight: '1',
  margin: '0',
  textAlign: 'center',
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
  letterSpacing: '0.12em',
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
