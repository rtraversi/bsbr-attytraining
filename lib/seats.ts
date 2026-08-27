// Certificate eligibility.
//
// Training is open to every firm member. A seat is now billing only, while a
// certificate remains limited to active/invited, paid staff who are not
// attorneys. Keep this rule in one place so the dashboard denominator and the
// assessment API cannot drift apart.

import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Statuses that hold a seat. Mirrors 0015_fix_seat_double_count.sql. */
export const SEAT_OCCUPYING_STATUSES = ['invited', 'active'] as const

/**
 * The columns every entitlement check needs. Call sites that already fetch the
 * member row should append this fragment to their own select rather than making
 * a second round-trip.
 */
export const CERTIFIABLE_MEMBER_COLUMNS = 'status, occupies_seat, is_attorney' as const

export type CertifiableMemberRow = {
  status: string
  occupies_seat: boolean
  is_attorney: boolean
}

/** True when this member may receive a certificate. */
export function isCertifiableMember(member: CertifiableMemberRow | null | undefined): boolean {
  if (!member) return false
  return (
    member.occupies_seat === true &&
    member.is_attorney === false &&
    (SEAT_OCCUPYING_STATUSES as readonly string[]).includes(member.status)
  )
}

/**
 * Fetch just the certificate-eligibility columns for API routes that do not
 * already have the member row.
 */
export async function fetchCertifiableMember(
  admin: AdminClient,
  userId: string,
  firmId: string
): Promise<CertifiableMemberRow | null> {
  const { data } = await admin
    .from('firm_members')
    .select(CERTIFIABLE_MEMBER_COLUMNS)
    .eq('user_id', userId)
    .eq('firm_id', firmId)
    .maybeSingle()

  return (data as CertifiableMemberRow | null) ?? null
}
