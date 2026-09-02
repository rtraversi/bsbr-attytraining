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

/**
 * Sent when an attorney approves a firm's assembled AI policy.
 *
 * ⚠️ ═══════════════════════════════════════════════════════════════════════
 * 🔴 THE COPY IN THIS FILE IS A PLACEHOLDER. IT MUST NOT BE SENT TO A CUSTOMER.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every string marked TODO(copy) below is scaffolding written to make the
 * template render and the send path testable. Customer-facing wording for this
 * product is Max's, not invented here — the same rule that governs
 * lib/policy/blocks, and for the same reason: this email is the moment a firm
 * is told their policy exists, and it carries an attorney's approval with it.
 *
 * `POLICY_EMAIL_COPY_APPROVED` in lib/policy/delivery-email.ts is the guard. It
 * is false, and the send path refuses while it is. Flip it in the same commit
 * that replaces the strings, never before.
 *
 * ⚠️ The flag and the subject line live in that .ts file rather than beside the
 * copy here, and it is not tidiness. This file is JSX, and Node's type
 * stripping cannot parse JSX — so scripts/deliver-policy.mjs cannot import it
 * at all. The guard has to be readable by the send path WITHOUT loading this
 * module, or the operator script would have to load the template just to
 * discover it must not send it.
 *
 * ── Why it ships dark rather than not shipping ──────────────────────────────
 * Resend still returns 403 (domain not verified), so nothing can be sent today
 * regardless. Building the template and the call now means the flow is complete
 * and testable, and it starts working when Resend is fixed and the copy lands —
 * with no code change beyond those two.
 */

interface PolicyDeliveredEmailProps {
  firmName: string
  policyUrl: string
}

export function PolicyDeliveredEmail({ firmName, policyUrl }: PolicyDeliveredEmailProps) {
  return (
    // TODO(copy) — preview text, the line shown in the inbox list before opening.
    <EmailShell preview="[TODO(copy): preview line]">
      <Text style={heading} className={EMAIL_CLASS.heading}>
        {/* TODO(copy) — subject-matching headline. */}
        [TODO(copy): headline]
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        {/* TODO(copy) — the body. What has happened, what it is, what it is not.
            The firm name is interpolated so the placeholder still exercises the
            prop; the sentence around it is not real copy. */}
        [TODO(copy): body paragraph for <strong>{firmName}</strong>]
      </Text>

      <Section style={buttonContainer}>
        <Button href={policyUrl} style={button}>
          {/* TODO(copy) — call to action label. */}
          [TODO(copy): button label]
        </Button>
      </Section>

      <Text style={mutedText} className={EMAIL_CLASS.muted}>
        {/* TODO(copy) — closing note. Worth covering that the firm can change
            its answers and have the policy rewritten, since that is the part
            nobody expects. */}
        [TODO(copy): closing note]
      </Text>
    </EmailShell>
  )
}
