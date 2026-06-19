import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { TrainingReminderEmail } from '@/emails/training-reminder'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const callerRole = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (callerRole !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let userId: string
  try {
    const body = (await req.json()) as { userId?: unknown }
    userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const admin = createAdminClient()

  // Verify target user belongs to this firm
  const { data: member } = await admin
    .from('firm_members')
    .select('user_id')
    .eq('firm_id', firmId)
    .eq('user_id', userId)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Employee not found in this firm' }, { status: 404 })
  }

  const { data: authData } = await admin.auth.admin.getUserById(userId)
  const email = authData?.user?.email
  if (!email) {
    return NextResponse.json({ error: 'Could not retrieve employee email' }, { status: 500 })
  }

  const { data: firm } = await admin.from('firms').select('name').eq('id', firmId).single()
  const firmName = firm?.name ?? 'Your firm'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/auth/callback?next=/dashboard/training` },
  })

  if (linkError) {
    console.error('[invite/remind] generateLink error:', linkError)
    return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 })
  }

  const hashedToken = linkData?.properties?.hashed_token
  const actionLink = hashedToken
    ? `${appUrl}/auth/confirm?token_hash=${hashedToken}&type=magiclink&next=/dashboard/training`
    : linkData?.properties?.action_link

  try {
    const html = await render(TrainingReminderEmail({ firmName, actionLink: actionLink ?? '' }))
    await sendEmail({
      to: email,
      subject: 'Reminder: Complete your AI compliance training',
      html,
    })
  } catch (err) {
    console.error('[invite/remind] sendEmail error:', err)
    return NextResponse.json({ error: 'Failed to send reminder email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
