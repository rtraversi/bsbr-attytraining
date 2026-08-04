import type { Metadata } from 'next'
import { VerifyShell } from './_components/shell'
import { VerifyForm } from './_components/verify-form'

/** Same reasoning as /verify/[token] — this page renders real people's names. */
export const metadata: Metadata = {
  title: 'Verify a certificate — IURIX',
  robots: { index: false, follow: false, nocache: true },
}

export default function VerifyPage() {
  return (
    <VerifyShell
      title="Verify a certificate"
      intro="Scanning the QR code on a IURIX certificate is the quickest route. If you are working from a printed copy, enter its number and the holder's surname below."
    >
      <VerifyForm />
    </VerifyShell>
  )
}
