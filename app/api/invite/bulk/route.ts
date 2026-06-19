import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { EmployeeInviteEmail } from '@/emails/employee-invite'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (role !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let rows: { name: string; email: string }[]
  try {
    const body = (await req.json()) as { rows?: unknown }
    if (!Array.isArray(body.rows)) throw new Error()
    rows = body.rows as { name: string; email: string }[]
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ invited: 0, skipped: 0, invalid: 0 })
  }

  const admin = createAdminClient()

  // Build set of emails already in this firm
  const { data: existingMembers } = await admin
    .from('firm_members')
    .select('user_id')
    .eq('firm_id', firmId)

  const existingEmails = new Set<string>()
  if (existingMembers && existingMembers.length > 0) {
    const authFetches = await Promise.all(
      existingMembers.map(m => admin.auth.admin.getUserById(m.user_id))
    )
    for (const { data } of authFetches) {
      if (data?.user?.email) existingEmails.add(data.user.email.toLowerCase())
    }
  }

  const { data: seat } = await admin
    .from('seats')
    .select('used_seats, max_seats')
    .eq('firm_id', firmId)
    .single()

  const { data: firm } = await admin.from('firms').select('name').eq('id', firmId).single()
  const firmName = firm?.name ?? 'Your firm'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const initialUsedSeats = seat?.used_seats ?? 0
  const maxSeats = seat?.max_seats ?? 0
  let seatsAvailable = maxSeats - initialUsedSeats

  let invited = 0
  let skipped = 0
  let invalid = 0

  for (const row of rows) {
    const email = typeof row.email === 'string' ? row.email.trim().toLowerCase() : ''

    if (!EMAIL_RE.test(email)) { invalid++; continue }
    if (existingEmails.has(email)) { skipped++; continue }
    if (seatsAvailable <= 0) { skipped++; continue }

    // Create auth user — fails if email is already registered globally
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (createError) { skipped++; continue }

    const employeeId = newUser.user.id

    await admin.auth.admin.updateUserById(employeeId, {
      app_metadata: { firm_id: firmId, role: 'employee' },
    })

    const { error: memberError } = await admin.from('firm_members').insert({
      firm_id: firmId,
      user_id: employeeId,
      role: 'employee',
      status: 'invited',
    })
    if (memberError) {
      await admin.auth.admin.deleteUser(employeeId)
      console.error('[invite/bulk] firm_members insert failed:', memberError)
      skipped++
      continue
    }

    seatsAvailable--
    invited++

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${appUrl}/auth/callback?next=/update-password` },
    })
    if (linkError) console.error('[invite/bulk] generateLink error:', linkError)

    const hashedToken = linkData?.properties?.hashed_token
    const actionLink = hashedToken
      ? `${appUrl}/auth/confirm?token_hash=${hashedToken}&type=magiclink&next=/update-password`
      : linkData?.properties?.action_link

    try {
      const html = await render(EmployeeInviteEmail({ firmName, actionLink: actionLink ?? '' }))
      await sendEmail({
        to: email,
        subject: `${firmName} has invited you to complete AI compliance training`,
        html,
      })
    } catch (err) {
      console.error('[invite/bulk] sendEmail error:', err)
    }
  }

  // Single seat count update at the end
  if (invited > 0) {
    await admin
      .from('seats')
      .update({ used_seats: initialUsedSeats + invited })
      .eq('firm_id', firmId)
  }

  return NextResponse.json({ invited, skipped, invalid })
}
