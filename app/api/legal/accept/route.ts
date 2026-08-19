import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CURRENT_TERMS_VERSION, isCurrentTermsVersion } from '@/lib/legal/terms'

// ix-termsaccept — staff half.
//
// Firm admins accept at checkout (app/api/checkout). Invited staff never touch
// checkout, so their moment of acceptance is password-set: the first time they
// act as a user rather than as an invitee.
//
// Called by update-form.tsx BEFORE the password is changed, deliberately. If
// recording consent fails, nothing else has happened yet and the person can
// retry from a clean state. Doing it afterwards would leave an active account
// with no record of what they agreed to, which is the exact hole this closes.
export async function POST(req: NextRequest) {
  let termsAccepted: boolean
  let termsVersion: unknown

  try {
    const body = (await req.json()) as { termsAccepted?: unknown; termsVersion?: unknown }
    termsAccepted = body.termsAccepted === true
    termsVersion = body.termsVersion
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!termsAccepted || !isCurrentTermsVersion(termsVersion)) {
    return NextResponse.json(
      {
        error:
          'Please accept the Terms of Service and Privacy Policy to continue. If you ' +
          'already ticked the box, reload the page — our terms may have been updated.',
        code: 'terms_not_accepted',
      },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const firmId = user.app_metadata?.firm_id as string | undefined
  if (!firmId) {
    return NextResponse.json({ error: 'No firm associated with account' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Both columns together: firm_members_terms_pair_ck (migration 0027) rejects
  // a timestamp without a version.
  const { data: updated, error } = await admin
    .from('firm_members')
    .update({
      terms_accepted_at: new Date().toISOString(),
      terms_version: CURRENT_TERMS_VERSION,
    })
    .eq('user_id', user.id)
    .eq('firm_id', firmId)
    .select('id')

  if (error) {
    console.error('[legal/accept] firm_members update failed:', error)
    return NextResponse.json({ error: 'Could not record your acceptance' }, { status: 500 })
  }

  // No row means this account is not a member of the firm its token claims.
  // Report it rather than returning ok on a write that changed nothing — a
  // silent success here would be a consent record that does not exist.
  if (!updated || updated.length === 0) {
    console.error('[legal/accept] no firm_members row for user', user.id, 'firm', firmId)
    return NextResponse.json({ error: 'Could not record your acceptance' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, version: CURRENT_TERMS_VERSION })
}
