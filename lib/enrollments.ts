// =============================================================================
// Enrollment get-or-create — one definition (ix-maybesingle).
//
// THE BUG THIS EXISTS TO STOP
//
// Migration 0007 dropped the unique constraint on (user_id, course_id) so that a
// renewal inserts a FRESH enrollment row per term. Multiple rows per learner are
// therefore NORMAL, not corruption.
//
// Two call sites — app/api/firm/enroll-self and app/api/onboarding/complete —
// asked "does an enrollment exist?" with a bare
// `.eq(user_id).eq(course_id).maybeSingle()`, no firm_id, no ordering, and the
// error discarded. `.maybeSingle()` ERRORS on multiple matches instead of
// returning one of them, so on ANY renewed account the read came back
// `{ data: null, error: PGRST116 }`, the caller read that as "no enrollment
// exists", and inserted another. The guard written to prevent duplicates was
// manufacturing them. Those are the duplicates 95c040e had to defend the
// dashboard against.
//
// Three copies of this query existed. This is now the only one.
// =============================================================================

import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export interface EnrollmentRef {
  id: string
  status: string
}

export interface EnrollmentScope {
  userId: string
  courseId: string
  firmId: string
}

/**
 * The learner's CURRENT enrollment for this course at this firm, or null.
 *
 * `firm_id` scopes the read to one tenant. `enrolled_at` DESC + `limit(1)`
 * resolves the several rows a renewed account legitimately has down to the
 * current term, which is what makes `.maybeSingle()` safe here.
 *
 * ⚠️ The ordering column is `enrolled_at`. It is NOT `created_at` — that
 * mistake is on record twice on this project.
 *
 * The error is RETURNED, never swallowed. A failed read says nothing about
 * whether a row exists, and callers must not treat it as "none".
 */
export async function findCurrentEnrollment(
  admin: AdminClient,
  scope: EnrollmentScope
): Promise<{ enrollment: EnrollmentRef | null; error: { message: string } | null }> {
  const { data, error } = await admin
    .from('enrollments')
    .select('id, status')
    .eq('user_id', scope.userId)
    .eq('course_id', scope.courseId)
    .eq('firm_id', scope.firmId)
    .order('enrolled_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { enrollment: null, error }
  return { enrollment: data ?? null, error: null }
}

export type EnsureEnrollmentOutcome =
  /** A current-term enrollment already existed; nothing was written. */
  | { outcome: 'existing'; enrollment: EnrollmentRef }
  /** No enrollment existed for this term, so one was created. */
  | { outcome: 'created'; enrollment: EnrollmentRef }
  /** The read failed. NOTHING was written — see the note below. */
  | { outcome: 'error'; error: { message: string } }

/**
 * Find the current enrollment, creating one only if there genuinely is none.
 *
 * On a read failure this returns `error` and writes nothing. That is the whole
 * point: inserting on a failed read is precisely how the duplicates were made.
 * Callers decide whether a failure is fatal — for the two seat-granting routes
 * it is not, because the seat is already claimed and
 * lib/training/assessment.ts creates the row lazily at first quiz attempt.
 */
export async function ensureEnrollment(
  admin: AdminClient,
  scope: EnrollmentScope,
  status: string
): Promise<EnsureEnrollmentOutcome> {
  const { enrollment, error } = await findCurrentEnrollment(admin, scope)

  if (error) return { outcome: 'error', error }
  if (enrollment) return { outcome: 'existing', enrollment }

  const { data, error: insertError } = await admin
    .from('enrollments')
    .insert({
      user_id: scope.userId,
      course_id: scope.courseId,
      firm_id: scope.firmId,
      status,
    })
    .select('id, status')
    .single()

  if (insertError || !data) {
    return { outcome: 'error', error: insertError ?? { message: 'enrollment insert returned null' } }
  }

  return { outcome: 'created', enrollment: data }
}
