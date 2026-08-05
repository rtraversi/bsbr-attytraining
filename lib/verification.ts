import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Certificate verification — the public, unauthenticated read path.
 *
 * Everything in this file is reachable by anyone on the internet with no
 * session. Two rules govern it and neither is negotiable:
 *
 *   1. Only the fields below ever leave this module. NOT the email, NOT the IP
 *      or user-agent, NOT the individual quiz answers, and NOT the numeric
 *      score — Max's call: what is being verified is that someone passed and
 *      when, not how well they did.
 *
 *   2. Nothing here reads auth.users. The holder and firm names are snapshots
 *      on the certificates row (0020), so this path cannot reach an email
 *      address even by mistake.
 */

/** How verification presents. Deliberately a closed set — no "unknown" state. */
export type VerificationStatus = 'valid' | 'expired' | 'revoked'

export interface VerificationResult {
  status: VerificationStatus
  /** Null when no name was recorded at issue time. Never an email address. */
  holderName: string | null
  firmName: string | null
  certificateNumber: string
  issuedAt: string
  expiresAt: string
  /** Only populated when status is 'revoked'. */
  revokedReason: string | null
}

/**
 * The exact column list the public path is allowed to read.
 *
 * Written as a constant, and as a whitelist rather than a `select('*')` minus
 * exclusions, so that adding a sensitive column to `certificates` later cannot
 * silently widen what this endpoint publishes.
 */
const PUBLIC_COLUMNS =
  'certificate_number, issued_at, expires_at, revoked_at, revoked_reason, holder_name, firm_name'

type PublicRow = {
  certificate_number: string
  issued_at: string
  expires_at: string
  revoked_at: string | null
  revoked_reason: string | null
  holder_name: string | null
  firm_name: string | null
}

/** Revocation outranks expiry: a revoked certificate is revoked, not merely lapsed. */
function toResult(row: PublicRow): VerificationResult {
  const status: VerificationStatus = row.revoked_at
    ? 'revoked'
    : new Date(row.expires_at) <= new Date()
      ? 'expired'
      : 'valid'

  return {
    status,
    holderName: row.holder_name,
    firmName: row.firm_name,
    certificateNumber: row.certificate_number,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    revokedReason: status === 'revoked' ? row.revoked_reason : null,
  }
}

/**
 * Look up by the 128-bit token from the QR code.
 *
 * The token is the ONLY single-factor lookup key in this module. It can be,
 * because it is unguessable; the printed certificate number cannot, because its
 * random tail is four digits (see 0020).
 */
export async function verifyByToken(token: string): Promise<VerificationResult | null> {
  // Cheap shape check before touching the database — the token is fixed-width
  // hex, so anything else is a probe, not a typo.
  if (!/^[0-9a-f]{32}$/.test(token)) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('certificates')
    .select(PUBLIC_COLUMNS)
    .eq('verification_token', token)
    .maybeSingle<PublicRow>()

  if (error || !data) return null
  return toResult(data)
}

/**
 * Look up by printed certificate number PLUS the holder's surname.
 *
 * The surname is a required second factor, not a convenience. A bare
 * number lookup would be an existence oracle over a 10,000-per-date search
 * space, which both harvests holder names and re-leaks the issuance volume that
 * 0014 changed the number format to hide.
 *
 * Surname matching is deliberately loose — case-insensitive, and satisfied by
 * ANY whitespace-separated part of the recorded name. Someone reading a paper
 * certificate should not have to guess whether the firm recorded a middle name
 * or which part we consider the surname. It is a possession check on the
 * document, not an identity proof.
 */
export async function verifyByNumberAndSurname(
  certificateNumber: string,
  surname: string
): Promise<VerificationResult | null> {
  const number = certificateNumber.trim().toUpperCase()
  const needle = surname.trim().toLowerCase()
  if (!number || !needle) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('certificates')
    .select(PUBLIC_COLUMNS)
    .eq('certificate_number', number)
    .maybeSingle<PublicRow>()

  if (error || !data) return null

  // A certificate with no recorded name cannot clear a surname check. It is
  // still verifiable by QR; this path just has no second factor to test.
  if (!data.holder_name) return null

  const parts = data.holder_name.toLowerCase().split(/\s+/).filter(Boolean)
  if (!parts.includes(needle)) return null

  return toResult(data)
}

/**
 * Fixed-window per-IP limiter, backed by 0020's check_verification_rate_limit.
 *
 * Fails OPEN. If the rate-limit table is unreachable, verification still works.
 * That is the deliberate trade: this endpoint is how an attorney demonstrates
 * Rule 5.3 compliance to a regulator, and a database hiccup must not make a
 * valid certificate look unverifiable. The data behind it is names and dates
 * that the holder is showing the verifier anyway.
 */
export async function checkRateLimit(
  ip: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('check_verification_rate_limit', {
    p_ip: ip,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    console.error('[verification] rate limit check failed, allowing:', error.message)
    return true
  }

  return data !== false
}
