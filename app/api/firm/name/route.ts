// =============================================================================
// POST /api/firm/name — set the firm's name.
//
// The write behind the middleware gate's name step. Separate from
// /api/onboarding/complete because that route is the POST-CHECKOUT path: it
// requires a Stripe session_id, sets a password, and refuses a firm whose admin
// row is already 'active'. None of that applies to the case this exists for —
// an already-signed-in admin whose firms.name is blank, who has no session_id
// and needs no password.
//
// Admin-only, and firm-scoped from the caller's OWN app_metadata rather than
// anything in the body. There is no firmId parameter deliberately: accepting
// one would let any signed-in user rename any firm.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { FIRM_NAME_BLANK_MESSAGE, normalizeFirmName } from '@/lib/firm-name'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  // Employees are never sent to the name step (see middleware) and cannot fix
  // it if they were — this is the admin's field.
  if (role !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let firmName: string | null
  try {
    const body = (await req.json()) as { firm_name?: unknown }
    // Server-side, not merely in the UI. A whitespace-only name passes `not
    // null`, passes a truthiness check on the raw string, then reads back as
    // blank to the very gate that sent the firm here — an infinite loop the
    // firm cannot escape.
    firmName = normalizeFirmName(body.firm_name)
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!firmName) {
    return NextResponse.json({ error: FIRM_NAME_BLANK_MESSAGE }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('firms').update({ name: firmName }).eq('id', firmId)

  if (error) {
    console.error('[firm/name] write failed:', error)
    return NextResponse.json({ error: 'Could not save that name. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, firmName })
}
