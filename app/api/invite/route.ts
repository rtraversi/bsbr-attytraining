import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { EmployeeInviteEmail } from '@/emails/employee-invite'

export async function POST(req: NextRequest) {
  // Verify caller is an authenticated admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (role !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse email
  let email: string
  try {
    const body = (await req.json()) as { email?: unknown }
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Seat availability check
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

  const { data: firm } = await admin.from('firms').select('name').eq('id', firmId).single()
  const firmName = firm?.name ?? 'Your firm'

  // Create auth user — fails if email already registered anywhere
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  })

  if (createError) {
    return NextResponse.json(
      { error: 'An account already exists with this email.' },
      { status: 409 }
    )
  }

  const employeeId = newUser.user.id

  // Stamp firm_id + role into app_metadata (read-only from the client — no privilege escalation)
  await admin.auth.admin.updateUserById(employeeId, {
    app_metadata: { firm_id: firmId, role: 'employee' },
  })

  // Insert firm_members row
  const { error: memberError } = await admin.from('firm_members').insert({
    firm_id: firmId,
    user_id: employeeId,
    role: 'employee',
    status: 'invited',
  })

  if (memberError) {
    // Roll back the auth user so we don't leave orphaned accounts
    await admin.auth.admin.deleteUser(employeeId)
    console.error('[invite] firm_members insert failed:', memberError)
    return NextResponse.json({ error: 'Failed to create team member.' }, { status: 500 })
  }

  // used_seats is maintained by the sync_used_seats trigger — the row insert
  // above already counted this seat. Incrementing here too would double it.

  // Generate invite magic link — goes through /auth/callback for PKCE code exchange
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/auth/callback?next=/update-password` },
  })

  if (linkError) {
    console.error('[invite] generateLink error:', linkError)
  }

  const hashedToken = linkData?.properties?.hashed_token
  const actionLink = hashedToken
    ? `${appUrl}/auth/confirm?token_hash=${hashedToken}&type=magiclink&next=/update-password`
    : linkData?.properties?.action_link

  // The member and the seat are real by this point, so a send failure is not a
  // failed request — but it is not a plain success either. Report both halves
  // and persist the failure so it survives the toast: without that, the only
  // record of a broken email channel was a console.error nobody reads.
  let emailSent = true
  try {
    const html = await render(EmployeeInviteEmail({ firmName, actionLink: actionLink ?? '' }))
    await sendEmail({
      to: email,
      subject: `${firmName} has invited you to complete AI compliance training`,
      html,
    })
  } catch (err) {
    console.error('[invite] sendEmail error:', err)
    emailSent = false
    const { error: flagError } = await admin
      .from('firm_members')
      .update({ invite_email_failed: true })
      .eq('user_id', employeeId)
      .eq('firm_id', firmId)
    if (flagError) console.error('[invite] invite_email_failed flag failed:', flagError)
  }

  // Deliberately 200, not 4xx/5xx — an error status invites a retry that would
  // just fail on "an account already exists with this email". /api/invite/resend
  // is the recovery path.
  return NextResponse.json({ success: true, emailSent })
}
