import { Button, Text } from '@react-email/components'
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

interface EmailVerificationProps {
  firmName: string
  recipientName: string | null
  actionLink: string
}

/**
 * Proves an address is REACHABLE. It is not a login, it grants no session, and
 * nothing is blocked on it — see migration 0029 for why that matters.
 *
 * The copy leans on that deliberately: someone who receives this has not asked
 * for it and did not sign up for anything, so it has to say in one line why it
 * arrived and what happens if they ignore it.
 */
export function EmailVerificationEmail({
  firmName,
  recipientName,
  actionLink,
}: EmailVerificationProps) {
  return (
    <EmailShell preview={`Confirm this address for ${firmName}`}>
      <Text style={heading} className={EMAIL_CLASS.heading}>
        Confirm this email address
      </Text>

      <Text style={paragraph} className={EMAIL_CLASS.text}>
        {recipientName ? `${recipientName} — ` : ''}
        <strong>{firmName}</strong> listed this address for you on IURIX. Confirming it is how we
        know your training invitation and your certificate will actually reach you.
      </Text>

      <div style={buttonContainer}>
        <Button style={button} href={actionLink}>
          Confirm this address
        </Button>
      </div>

      <Text style={mutedText} className={EMAIL_CLASS.muted}>
        One click and you are done — there is nothing to fill in and no account to create here. If
        you were not expecting this, you can ignore it; the link stops working once it is used.
      </Text>
    </EmailShell>
  )
}
