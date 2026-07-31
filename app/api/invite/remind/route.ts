import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTrainingReminder } from '@/lib/invite/send-training-reminder'

/** One manual nudge per employee per 48h. See the check below for why. */
const NUDGE_WINDOW_MS = 48 * 60 * 60 * 1000

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

  // Verify target user belongs to this firm. `id` (the firm_members PK) is
  // selected as well as user_id because training_events.firm_member_id is a
  // NOT NULL FK onto it — the audit row below cannot be written without it.
  const { data: member } = await admin
    .from('firm_members')
    .select('id, user_id')
    .eq('firm_id', firmId)
    .eq('user_id', userId)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Employee not found in this firm' }, { status: 404 })
  }

  // Rate limit: one nudge per employee per 48h.
  //
  // Checked BEFORE sending, so a blocked attempt costs the employee nothing —
  // no email, no audit row. The window is per firm_member, not per admin: two
  // partners chasing the same person is exactly the double-send this prevents.
  const windowStart = new Date(Date.now() - NUDGE_WINDOW_MS).toISOString()
  const { data: recentNudges } = await admin
    .from('training_events')
    .select('event_timestamp')
    .eq('firm_member_id', member.id)
    .eq('event_type', 'nudge_sent')
    .gte('event_timestamp', windowStart)
    .order('event_timestamp', { ascending: false })
    .limit(1)

  const lastNudge = recentNudges?.[0]?.event_timestamp
  if (lastNudge) {
    const nextAllowed = new Date(new Date(lastNudge).getTime() + NUDGE_WINDOW_MS)
    return NextResponse.json(
      {
        error: `You nudged this person in the last 48 hours. You can nudge them again after ${nextAllowed.toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}.`,
        nextAllowedAt: nextAllowed.toISOString(),
      },
      { status: 429 }
    )
  }

  const { data: authData } = await admin.auth.admin.getUserById(userId)
  const email = authData?.user?.email
  if (!email) {
    return NextResponse.json({ error: 'Could not retrieve employee email' }, { status: 500 })
  }

  const result = await sendTrainingReminder(admin, firmId, email)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  // Audit row — written only after a confirmed send, so the Rule 5.3 export
  // never claims a reminder that failed to go out.
  //
  // This lives in the route rather than in sendTrainingReminder because the
  // helper has a second caller, /api/invite/resend, which is NOT a nudge: it is
  // the recovery path for an invite email that bounced (it clears the
  // invite_email_failed badge from 0016). Logging that as a nudge would record
  // "the attorney chased this person" when in fact our own email failed, and
  // would let the 48h limit above block a delivery-failure retry. Keeping the
  // write here excludes it by construction, with no flag to pass or forget.
  //
  // triggered_by is the point of the row: "someone was reminded" is weak
  // evidence, "this partner reminded them on this date" is the supervision act.
  const { error: eventError } = await admin.from('training_events').insert({
    firm_id: firmId,
    firm_member_id: member.id,
    event_type: 'nudge_sent',
    metadata: { triggered_by: user.id },
  })

  // The email is already gone; failing the request now would tell the admin the
  // nudge did not happen and invite a duplicate send. Log loudly instead — a
  // missing audit row is a reporting gap, not a user-facing failure.
  if (eventError) {
    console.error('[invite/remind] failed to write nudge_sent event:', eventError)
  }

  return NextResponse.json({ success: true })
}
