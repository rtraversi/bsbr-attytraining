import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SEAT_ACCESS_COLUMNS, canSelfEnroll, hasTrainingAccess, type SeatAccessRow } from '@/lib/seats'
import { ensureEnrollment } from '@/lib/enrollments'

/**
 * An admin who declined training at onboarding claiming a seat for themselves.
 *
 * This is the only path that grants a seat to someone already inside the firm,
 * so it is the mirror of the enrollSelf branch in api/onboarding/complete —
 * flip occupies_seat, then make sure an enrollment row exists. It must land the
 * firm in exactly the state ticking the box at onboarding would have.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (role !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: memberRow } = await admin
    .from('firm_members')
    .select(`id, ${SEAT_ACCESS_COLUMNS}`)
    .eq('user_id', user.id)
    .eq('firm_id', firmId)
    .maybeSingle()

  const member = memberRow as (SeatAccessRow & { id: string }) | null

  if (!member) {
    return NextResponse.json({ error: 'Member not found in this firm' }, { status: 404 })
  }

  // Already holding a seat — nothing to do. Answering 200 keeps a double-click
  // or a stale tab from reading as a failure.
  if (hasTrainingAccess(member)) {
    return NextResponse.json({ success: true, alreadyEnrolled: true })
  }

  // Suspended/deleted/reassigned rows fall through to here and are refused —
  // self-enrollment is for an admin who opted out, not a route back in.
  if (!canSelfEnroll(member)) {
    return NextResponse.json({ error: 'This account cannot be enrolled.' }, { status: 403 })
  }

  // Capacity — same refusal the invite route gives rather than overfilling the
  // firm. The +1 itself is the sync_used_seats trigger's job; no arithmetic here.
  const { data: seat } = await admin
    .from('seats')
    .select('used_seats, max_seats')
    .eq('firm_id', firmId)
    .single()

  if (!seat || seat.used_seats >= seat.max_seats) {
    return NextResponse.json(
      { error: 'No seats available. Purchase additional seats to invite more team members.' },
      { status: 409 }
    )
  }

  const { error: updateError } = await admin
    .from('firm_members')
    .update({ occupies_seat: true })
    .eq('id', member.id)

  if (updateError) {
    console.error('[firm/enroll-self] occupies_seat update failed:', updateError)
    return NextResponse.json({ error: 'Failed to enroll.' }, { status: 500 })
  }

  // Enrollment row — mirrors onboarding/complete. Its absence is what makes a
  // member read as "Not started" on the admin dashboard, so create it here too.
  const { data: course } = await admin.from('courses').select('id').limit(1).maybeSingle()

  if (course) {
    // ix-maybesingle: this used to be a bare `.eq(user_id).eq(course_id)
    // .maybeSingle()` with the error discarded, which returned null on every
    // renewed account and inserted a duplicate. See lib/enrollments.ts.
    const result = await ensureEnrollment(
      admin,
      { userId: user.id, courseId: course.id, firmId },
      'not_started'
    )

    // The seat is already claimed and access already works — an enrollment
    // failure is not worth failing the request over. lib/training/assessment.ts
    // creates the row lazily if it is still missing.
    if (result.outcome === 'error') {
      console.error('[firm/enroll-self] enrollment get-or-create failed:', result.error)
    }
  }

  return NextResponse.json({ success: true })
}
