import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_REMINDER_DAYS = [3, 7, 14] as const

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role   = user.app_metadata?.role   as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (role !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let reminderDays: number
  try {
    const body = (await req.json()) as { reminderDays?: unknown }
    reminderDays = Number(body.reminderDays)
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!(VALID_REMINDER_DAYS as readonly number[]).includes(reminderDays)) {
    return NextResponse.json(
      { error: `reminderDays must be one of: ${VALID_REMINDER_DAYS.join(', ')}` },
      { status: 422 },
    )
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('firms')
    .update({ reminder_days: reminderDays })
    .eq('id', firmId)

  if (error) {
    console.error('[firm/settings] update failed:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
