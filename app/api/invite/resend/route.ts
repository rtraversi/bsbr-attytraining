import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTrainingReminder } from '@/lib/invite/send-training-reminder'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const callerRole = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (callerRole !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let email: string
  try {
    const body = (await req.json()) as { email?: unknown }
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const admin = createAdminClient()

  // Resolve the email to a member of THIS firm. firm_members has no email column,
  // so fetch the firm's members and look up each auth user (O(N); firm sizes are
  // small — same pattern as app/dashboard/page.tsx). Skip removed/reassigned seats.
  const { data: members } = await admin
    .from('firm_members')
    .select('id, user_id')
    .eq('firm_id', firmId)
    .neq('status', 'deleted')
    .neq('status', 'reassigned')

  let matchedEmail: string | null = null
  let matchedMemberId: string | null = null
  for (const m of members ?? []) {
    const { data: authData } = await admin.auth.admin.getUserById(m.user_id)
    const memberEmail = authData?.user?.email
    if (memberEmail && memberEmail.toLowerCase() === email) {
      matchedEmail = memberEmail // use the stored casing for the link, not user input
      matchedMemberId = m.id
      break
    }
  }

  // Deliberately the same error whether the email doesn't exist at all or exists
  // in a different firm — don't leak cross-firm membership to the caller.
  if (!matchedEmail) {
    return NextResponse.json(
      { error: 'No team member found with that email in your firm' },
      { status: 404 }
    )
  }

  const result = await sendTrainingReminder(admin, firmId, matchedEmail)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  // This is the recovery path for a failed invite email, so a success here is
  // what clears the "invite not delivered" badge (0016). Unconditional — the
  // flag is already false for members who never had a problem.
  if (matchedMemberId) {
    const { error: clearError } = await admin
      .from('firm_members')
      .update({ invite_email_failed: false })
      .eq('id', matchedMemberId)
    if (clearError) console.error('[invite/resend] clearing invite_email_failed failed:', clearError)
  }

  return NextResponse.json({ success: true })
}
