import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveFirmRefundEligibility } from '@/lib/refund-eligibility'

/**
 * Per-seat refund eligibility for the caller's own firm.
 *
 * READ ONLY. This endpoint answers "which of these seats would qualify", and
 * nothing more — it does not request, approve or issue a refund, and there is
 * no refund API call anywhere in this codebase by design. Refunds are a human
 * decision (.planning/POLICY-DECISIONS.md).
 *
 * Firm-scoped rather than operator-scoped: eligibility is per seat within a
 * firm, so the firm's own admin is a legitimate audience for it — this is the
 * answer to "we bought 40 seats and only 10 people trained". The firm_id comes
 * from the caller's app_metadata, never from the request, so an admin can only
 * ever ask about their own firm.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const callerRole = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (callerRole !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()

  try {
    const seats = await resolveFirmRefundEligibility(admin, firmId)

    return NextResponse.json({
      seats,
      eligibleCount: seats.filter((s) => s.eligible).length,
      totalCount: seats.length,
    })
  } catch (err) {
    console.error('[firm/refund-eligibility] failed:', err)
    return NextResponse.json({ error: 'Could not compute refund eligibility' }, { status: 500 })
  }
}
