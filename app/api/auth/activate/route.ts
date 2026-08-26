import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { markVerifiedByActivation } from '@/lib/email-verification'

// Called by update-form.tsx immediately after supabase.auth.updateUser({ password }) succeeds.
// Flips firm_members.status from 'invited' → 'active' for the current user.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const firmId = user.app_metadata?.firm_id as string | undefined
  if (!firmId) {
    return NextResponse.json({ error: 'No firm associated with account' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('firm_members')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('firm_id', firmId)
    .eq('status', 'invited')

  if (error) {
    console.error('[auth/activate] firm_members update failed:', error)
    return NextResponse.json({ error: 'Failed to activate account' }, { status: 500 })
  }

  // Accepting an invite proves the address works: the only route to this screen
  // is a link that was emailed to it. See markVerifiedByActivation for the one
  // caveat (a forwarded invite) and why it is accepted.
  //
  // Non-fatal by construction — it is an .update() whose failure we do not read.
  // Nothing is gated on deliverability, so a miss here costs a notice that stays
  // up, not access that goes away.
  await markVerifiedByActivation(admin, user.id, firmId)

  return NextResponse.json({ ok: true })
}
