import type { VerificationResult, VerificationStatus } from '@/lib/verification'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Status drives colour, label and the sentence underneath. Kept as one table so
// a new status cannot be added with its styling half-wired.
const PRESENTATION: Record<
  VerificationStatus,
  { label: string; blurb: string; dot: string; ring: string; text: string }
> = {
  valid: {
    label: 'Valid',
    blurb: 'This certificate is genuine and currently in force.',
    dot: 'bg-emerald-400',
    ring: 'border-emerald-400/30 bg-emerald-400/5',
    text: 'text-emerald-300',
  },
  expired: {
    label: 'Expired',
    blurb:
      'This certificate was genuine when issued, but its one-year term has ended. The holder needs to recertify.',
    dot: 'bg-amber-400',
    ring: 'border-amber-400/30 bg-amber-400/5',
    text: 'text-amber-300',
  },
  revoked: {
    label: 'Revoked',
    blurb: 'This certificate has been withdrawn and should not be relied on.',
    dot: 'bg-red-400',
    ring: 'border-red-400/30 bg-red-400/5',
    text: 'text-red-300',
  },
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.18em] text-white/35">{label}</dt>
      <dd className="mt-1.5 text-[15px] text-white/85">{value}</dd>
    </div>
  )
}

/**
 * The verification result as a verifier sees it.
 *
 * Shows only what confirms the document in someone's hand: who, which firm,
 * which number, and the two dates. No score — pass/fail and the date are what
 * is being verified, not the percentage. No email, no IP, no answers.
 */
export function ResultCard({ result }: { result: VerificationResult }) {
  const p = PRESENTATION[result.status]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <div
        className={`inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 ${p.ring}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${p.dot}`} />
        <span className={`text-xs font-semibold uppercase tracking-[0.14em] ${p.text}`}>
          {p.label}
        </span>
      </div>

      <p className="mt-5 text-[15px] leading-[1.7] text-white/60">{p.blurb}</p>

      {result.status === 'revoked' && result.revokedReason ? (
        <p className="mt-3 text-[15px] leading-[1.7] text-white/45">
          Reason given: {result.revokedReason}
        </p>
      ) : null}

      <hr className="my-7 border-white/10" />

      <dl className="grid gap-6 sm:grid-cols-2">
        <Field label="Issued to" value={result.holderName ?? 'Name not recorded'} />
        <Field label="Firm" value={result.firmName ?? 'Firm not recorded'} />
        <Field label="Certificate number" value={result.certificateNumber} />
        <Field label="Issued" value={formatDate(result.issuedAt)} />
        <Field label="Valid until" value={formatDate(result.expiresAt)} />
      </dl>
    </div>
  )
}

/**
 * Shown for a token or number+surname that does not resolve.
 *
 * The copy is identical whichever way the lookup failed — wrong number, wrong
 * surname, or no such certificate. Distinguishing them would turn this page
 * into an oracle that confirms which certificate numbers are real.
 */
export function NotFoundCard({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          Not verified
        </span>
      </div>

      <p className="mt-5 text-[15px] leading-[1.7] text-white/60">
        {children ??
          'We could not match those details to a certificate. Check the certificate number and surname and try again, or scan the QR code printed on the document.'}
      </p>
    </div>
  )
}
