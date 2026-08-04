import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { verifyByToken, checkRateLimit } from '@/lib/verification'
import { VerifyShell } from '../_components/shell'
import { ResultCard, NotFoundCard } from '../_components/result-card'

/**
 * noindex is load-bearing, not hygiene.
 *
 * Without it, every QR code that anyone scans and shares — in an email, on a
 * forum, in a filing — becomes a crawlable page carrying a real person's name
 * and employer, and certificate holders become searchable by name. Google
 * de-indexing is slow and incomplete, so this is close to impossible to undo
 * after the fact.
 */
export const metadata: Metadata = {
  title: 'Verify a certificate — IURIX',
  robots: { index: false, follow: false, nocache: true },
}

// The QR path is machine-driven: one scan, one load. A human re-checking a
// document might load a handful. 30 per minute leaves that untouched while
// making an automated sweep pointless.
const RATE_LIMIT = 30
const RATE_WINDOW_SECONDS = 60

export default async function VerifyTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const headerList = await headers()
  const ip =
    headerList.get('cf-connecting-ip') ?? headerList.get('x-forwarded-for') ?? 'unknown'

  const allowed = await checkRateLimit(ip, RATE_LIMIT, RATE_WINDOW_SECONDS)

  const result = allowed ? await verifyByToken(token) : null

  return (
    <VerifyShell
      title="Certificate verification"
      intro="Confirms that a IURIX certificate was genuinely issued, to whom, and whether it is still in force."
    >
      {!allowed ? (
        <NotFoundCard>
          Too many verification attempts from this network. Wait a minute and try again.
        </NotFoundCard>
      ) : result ? (
        <ResultCard result={result} />
      ) : (
        <NotFoundCard>
          This verification link does not match any certificate. Check that the whole link was
          copied, or scan the QR code printed on the document directly.
        </NotFoundCard>
      )}

      <p className="mt-8 text-sm text-white/35">
        Holding a printed certificate instead?{' '}
        <Link
          href="/verify"
          className="text-[var(--brand-primary)] underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-[var(--brand-primary)]"
        >
          Verify by certificate number
        </Link>
        .
      </p>
    </VerifyShell>
  )
}
