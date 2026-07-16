import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'

const VALID_REMINDER_DAYS = [3, 7, 14] as const

interface RequestBody {
  reminderDays?: unknown
  name?: unknown
  notifyCertEarned?: unknown
  notifyWeeklySummary?: unknown
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role   = user.app_metadata?.role   as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (role !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Every field is optional — each Settings section PATCHes just its own field(s).
  const update: Database['public']['Tables']['firms']['Update'] = {}

  if (body.reminderDays !== undefined) {
    const reminderDays = Number(body.reminderDays)
    if (!(VALID_REMINDER_DAYS as readonly number[]).includes(reminderDays)) {
      return NextResponse.json(
        { error: `reminderDays must be one of: ${VALID_REMINDER_DAYS.join(', ')}` },
        { status: 422 },
      )
    }
    update.reminder_days = reminderDays
  }

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 422 })
    }
    update.name = name
  }

  if (body.notifyCertEarned !== undefined) {
    if (typeof body.notifyCertEarned !== 'boolean') {
      return NextResponse.json({ error: 'notifyCertEarned must be a boolean' }, { status: 422 })
    }
    update.notify_cert_earned = body.notifyCertEarned
  }

  if (body.notifyWeeklySummary !== undefined) {
    if (typeof body.notifyWeeklySummary !== 'boolean') {
      return NextResponse.json({ error: 'notifyWeeklySummary must be a boolean' }, { status: 422 })
    }
    update.notify_weekly_summary = body.notifyWeeklySummary
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('firms')
    .update(update)
    .eq('id', firmId)

  if (error) {
    console.error('[firm/settings] update failed:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
