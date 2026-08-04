import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { EmployeeInviteEmail } from '@/emails/employee-invite'

/**
 * Reaching this CONTENT lesson makes a member's seat non-transferable.
 *
 * Reassignment is a seat transfer, so without a lock a firm could rotate staff
 * through a single seat indefinitely. Nobody would get certified that way, but
 * the per-seat economics — the thing being billed — would be defeated.
 *
 * The threshold is CONTENT lessons reached, NOT knowledge checks (Max,
 * 2026-07-30). Content position is what "meaningfully through the course"
 * means; a learner can be most of the way through without having taken a
 * single check, and checks are the easier signal to avoid tripping.
 *
 * ⚠️ THIS IS NOT THE REFUND THRESHOLD, and the two must not be merged.
 * lib/refund-eligibility.ts has its own, REFUND_BLOCK_CLEARED_CHECKS, also 4.
 * The number coinciding is a coincidence; the question is different:
 *
 *   reassignment  "has this seat been used enough that transferring it would
 *                  defeat per-seat billing?"        → content POSITION reached
 *   refunds       "has this person consumed the product they are asking for
 *                  their money back on?"            → checks actually CLEARED,
 *                                                     plus verified completion
 *
 * A learner can trip one and not the other in both directions — someone can
 * read most of the course without clearing a check, and a test-out user can
 * clear the final review having barely moved through the content. Collapsing
 * them into one constant would silently change the published refund policy.
 */
const REASSIGN_BLOCK_LESSON = 4

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const callerRole = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (callerRole !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let memberId: string, newName: string, newEmail: string
  try {
    const body = (await req.json()) as { memberId?: unknown; newName?: unknown; newEmail?: unknown }
    memberId = typeof body.memberId === 'string' ? body.memberId.trim() : ''
    newName = typeof body.newName === 'string' ? body.newName.trim() : ''
    newEmail = typeof body.newEmail === 'string' ? body.newEmail.trim().toLowerCase() : ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!memberId || !newEmail) {
    return NextResponse.json({ error: 'memberId and newEmail are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify the existing member belongs to this firm
  const { data: member } = await admin
    .from('firm_members')
    .select('id, user_id, firm_id')
    .eq('id', memberId)
    .eq('firm_id', firmId)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found in this firm' }, { status: 404 })
  }

  // Progress lock — refuse before anything is mutated (see REASSIGN_BLOCK_LESSON).
  //
  // Signal: the 'lesson_location_changed' events /api/training/content-progress
  // writes, deduped at each lesson boundary. Already-existing tracking; nothing
  // new to record. Highest lesson number REACHED rather than distinct lessons
  // visited — it matches what the activity feed already shows the admin
  // ("Reached Lesson 5"), so a refusal lines up with what they can see, and
  // Rise blocks skipping ahead, which makes the high-water mark truthful.
  //
  // Rows are deduped per boundary, so this is a handful of rows per member.
  const { data: locationEvents, error: progressError } = await admin
    .from('training_events')
    .select('metadata')
    .eq('firm_member_id', memberId)
    .eq('event_type', 'lesson_location_changed')

  if (progressError) {
    // Fail CLOSED. Proceeding on a failed lookup would turn any transient error
    // into a way around the lock.
    console.error('[firm/member/reassign] progress lookup failed:', progressError)
    return NextResponse.json(
      { error: 'Could not verify this person’s training progress. Please try again.' },
      { status: 500 }
    )
  }

  const highestLesson = (locationEvents ?? []).reduce((max, row) => {
    const n = Number((row.metadata as Record<string, unknown> | null)?.lessonNumber)
    return Number.isInteger(n) && n > max ? n : max
  }, 0)

  if (highestLesson >= REASSIGN_BLOCK_LESSON) {
    // Not a dead end — support escalates to a human decision. Deliberately no
    // override mechanism in the product.
    return NextResponse.json(
      {
        error:
          `This person has already reached Lesson ${highestLesson} of the training, so their ` +
          `seat can no longer be reassigned. If they have left the firm, contact support from ` +
          `the Support page and we will review the seat with you.`,
      },
      { status: 409 }
    )
  }

  // 1. Soft-delete existing member — preserves all cert/quiz/audit history
  const { error: updateError } = await admin
    .from('firm_members')
    .update({ status: 'reassigned' })
    .eq('id', memberId)

  if (updateError) {
    console.error('[firm/member/reassign] status update failed:', updateError)
    return NextResponse.json({ error: 'Failed to update existing member' }, { status: 500 })
  }

  // 2. Create new auth user
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: newEmail,
    email_confirm: true,
  })

  if (createError) {
    // Roll back the soft-delete so the old row stays visible
    await admin.from('firm_members').update({ status: 'active' }).eq('id', memberId)
    return NextResponse.json(
      { error: 'An account already exists with this email.' },
      { status: 409 }
    )
  }

  const newUserId = newUser.user.id

  // 3. Stamp name into user_metadata and firm/role into app_metadata
  await admin.auth.admin.updateUserById(newUserId, {
    user_metadata: { full_name: newName },
    app_metadata: { firm_id: firmId, role: 'employee' },
  })

  // 4. Insert new firm_members row — same seat, new person
  const { error: memberError } = await admin.from('firm_members').insert({
    firm_id: firmId,
    user_id: newUserId,
    role: 'employee',
    status: 'invited',
  })

  if (memberError) {
    // Roll back both new user and the old row's status
    await admin.auth.admin.deleteUser(newUserId)
    await admin.from('firm_members').update({ status: 'active' }).eq('id', memberId)
    console.error('[firm/member/reassign] firm_members insert failed:', memberError)
    return NextResponse.json({ error: 'Failed to create team member.' }, { status: 500 })
  }

  // 5. Revoke the departing person's access. Without this the seat transfers but
  // the login doesn't: their app_metadata.firm_id survives, and every gate in the
  // app reads firm_id from there — one paid seat, two people still able to sign
  // in. Runs only once the swap is committed, so the rollback paths above never
  // have to put access back.
  //
  // Only app_metadata is cleared. The delete route additionally rewrites the
  // email to deleted-{uuid}@redacted.invalid, but that is irreversible and a
  // reassignment is a seat transfer, not a deletion request (Max, 2026-07-29).
  // Every record — firm_members, enrollments, quiz_attempts, certificates,
  // training_events — is left exactly as it was; this revokes the login only.
  const { error: revokeError } = await admin.auth.admin.updateUserById(member.user_id, {
    app_metadata: {},
  })

  if (revokeError) {
    // The swap already happened — don't fail the request. The consequence is a
    // departing user who can still sign in, so it is worth logging loudly.
    console.error('[firm/member/reassign] access revocation failed:', revokeError)
  }

  // 6. Generate magic link and send invite — no seat table changes (this is a swap)
  const { data: firm } = await admin.from('firms').select('name').eq('id', firmId).single()
  const firmName = firm?.name ?? 'Your firm'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: newEmail,
    options: { redirectTo: `${appUrl}/auth/callback?next=/update-password` },
  })
  if (linkError) console.error('[firm/member/reassign] generateLink error:', linkError)

  const hashedToken = linkData?.properties?.hashed_token
  const actionLink = hashedToken
    ? `${appUrl}/auth/confirm?token_hash=${hashedToken}&type=magiclink&next=/update-password`
    : linkData?.properties?.action_link

  try {
    const html = await render(EmployeeInviteEmail({ firmName, actionLink: actionLink ?? '' }))
    await sendEmail({
      to: newEmail,
      subject: `${firmName} has invited you to complete AI compliance training`,
      html,
    })
  } catch (err) {
    console.error('[firm/member/reassign] sendEmail error:', err)
  }

  return NextResponse.json({ success: true })
}
