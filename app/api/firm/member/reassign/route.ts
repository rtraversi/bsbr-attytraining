import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { EmployeeInviteEmail } from '@/emails/employee-invite'

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
