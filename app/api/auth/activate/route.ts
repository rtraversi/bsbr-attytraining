import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  return NextResponse.json({ ok: true })
}
