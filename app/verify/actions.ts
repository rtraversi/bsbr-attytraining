'use server'

import { headers } from 'next/headers'
import {
  verifyByNumberAndSurname,
  checkRateLimit,
  type VerificationResult,
} from '@/lib/verification'

/**
 * Much tighter than the QR path's 30/minute.
 *
 * The token path is protected by 128 bits of entropy and the limiter is only
 * defence in depth. Here the search space is the certificate number's random
 * tail: 10,000 values per calendar date. At 15 attempts per 10 minutes,
 * sweeping a single day's numbers takes over 100 hours — and still fails,
 * because every attempt also has to carry the right surname.
 */
const RATE_LIMIT = 15
const RATE_WINDOW_SECONDS = 10 * 60

export type VerifyFormState =
  | { kind: 'idle' }
  | { kind: 'found'; result: VerificationResult }
  | { kind: 'not_found' }
  | { kind: 'rate_limited' }
  | { kind: 'invalid' }

export async function verifyCertificateAction(
  _prev: VerifyFormState,
  formData: FormData
): Promise<VerifyFormState> {
  const certificateNumber = String(formData.get('certificateNumber') ?? '').trim()
  const surname = String(formData.get('surname') ?? '').trim()

  // Empty fields are a form error, not a failed verification. Distinguishing
  // them is safe: it reveals nothing about which certificates exist.
  if (!certificateNumber || !surname) return { kind: 'invalid' }

  const headerList = await headers()
  const ip =
    headerList.get('cf-connecting-ip') ?? headerList.get('x-forwarded-for') ?? 'unknown'

  if (!(await checkRateLimit(ip, RATE_LIMIT, RATE_WINDOW_SECONDS))) {
    return { kind: 'rate_limited' }
  }

  const result = await verifyByNumberAndSurname(certificateNumber, surname)

  // One outcome for every kind of miss — unknown number, known number with the
  // wrong surname, known number with no recorded name. The caller cannot tell
  // them apart, so this never confirms that a certificate number is real.
  return result ? { kind: 'found', result } : { kind: 'not_found' }
}
