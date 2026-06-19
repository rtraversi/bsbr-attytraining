import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const callerRole = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (callerRole !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let memberId: string
  try {
    const body = (await req.json()) as { memberId?: unknown }
    memberId = typeof body.memberId === 'string' ? body.memberId.trim() : ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 })

  const admin = createAdminClient()

  // Verify the member row belongs to this firm
  const { data: member } = await admin
    .from('firm_members')
    .select('id, user_id, firm_id')
    .eq('id', memberId)
    .eq('firm_id', firmId)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found in this firm' }, { status: 404 })
  }

  // Soft-delete: mark the row as deleted (preserves cert IDs, dates, training_events)
  const { error: updateError } = await admin
    .from('firm_members')
    .update({ status: 'deleted' })
    .eq('id', memberId)

  if (updateError) {
    console.error('[firm/member/delete] status update failed:', updateError)
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
  }

  // Redact PII from Supabase Auth — replace real email with non-identifying placeholder
  const { error: authError } = await admin.auth.admin.updateUserById(member.user_id, {
    email: `deleted-${member.user_id}@redacted.invalid`,
    user_metadata: {},
    app_metadata: {},
  })

  if (authError) {
    console.error('[firm/member/delete] auth redaction failed:', authError)
    // Row is already marked deleted — don't fail the whole request
  }

  return NextResponse.json({ success: true })
}
