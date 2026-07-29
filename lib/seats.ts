// Seat entitlement — the single rule that decides whether a firm member may
// reach the training.
//
// This is deliberately the SAME predicate the sync_used_seats trigger uses to
// count seats (migration 0015): a row occupies a seat when
//   occupies_seat AND status IN ('invited','active')
// Access and billing therefore derive from one rule rather than two that can
// drift. If this predicate changes, 0015's trigger has to change with it.
//
// Note what is deliberately NOT here: role. An admin who opted into training is
// legitimately entitled; an admin who declined is not. Employees are entitled by
// default (occupies_seat defaults to true). The question is about the seat, not
// the role.

import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Statuses that hold a seat. Mirrors 0015_fix_seat_double_count.sql. */
export const SEAT_OCCUPYING_STATUSES = ['invited', 'active'] as const

/**
 * The columns every entitlement check needs. Call sites that already fetch the
 * member row should append this fragment to their own select rather than making
 * a second round-trip.
 */
export const SEAT_ACCESS_COLUMNS = 'role, status, occupies_seat' as const

export type SeatAccessRow = {
  role: string
  status: string
  occupies_seat: boolean
}

/** True when this member holds a seat and may reach the training. */
export function hasTrainingAccess(member: SeatAccessRow | null | undefined): boolean {
  if (!member) return false
  return (
    member.occupies_seat === true &&
    (SEAT_OCCUPYING_STATUSES as readonly string[]).includes(member.status)
  )
}

/**
 * True when the member is an admin who declined training at onboarding — the one
 * case where a failed access check should offer self-enrollment rather than a
 * dead end. Deliberately narrow: a suspended or deleted admin gets the plain
 * "no access" state, not an enroll button.
 */
export function canSelfEnroll(member: SeatAccessRow | null | undefined): boolean {
  if (!member) return false
  return (
    member.role === 'admin' &&
    member.occupies_seat === false &&
    (SEAT_OCCUPYING_STATUSES as readonly string[]).includes(member.status)
  )
}

/**
 * Fetch just the entitlement columns. For call sites that don't already read the
 * member row (e.g. api/quiz/attempt).
 */
export async function fetchSeatAccess(
  admin: AdminClient,
  userId: string,
  firmId: string
): Promise<SeatAccessRow | null> {
  const { data } = await admin
    .from('firm_members')
    .select(SEAT_ACCESS_COLUMNS)
    .eq('user_id', userId)
    .eq('firm_id', firmId)
    .maybeSingle()

  return (data as SeatAccessRow | null) ?? null
}
