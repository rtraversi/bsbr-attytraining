// =============================================================================
// POST /api/billing/cancel-refund — self-serve "cancel + request a refund".
//
// ix-cancelrefund (OPEN-ISSUES.md #20). /pricing promises: "Refunds available
// within 14 days of purchase and only if no certificate has yet been issued."
// Until this route existed, `refunds.create` appeared zero times in this
// codebase — the promise only held if Rob did it by hand in the Stripe
// dashboard, having heard about the request some other way.
//
// 🔴 THIS ROUTE NEVER TOUCHES MONEY OR THE SUBSCRIPTION. Design agreed with
// Rob 2026-09-11: it checks eligibility (lib/cancel-refund-eligibility.ts),
// and if eligible, alerts the operator to review and act by hand — the same
// alertOperator pattern already used for provisioning collisions, duplicate
// purchases, and non-US billing (lib/operator-alert.ts). It does not call
// stripe.refunds.create and it does not call subscriptions.cancel(); both
// stay a human decision, same as the per-seat refund engine in
// lib/refund-eligibility.ts.
//
// No new column tracks "a cancellation was requested" — eligibility is
// recomputed fresh from firms.created_at and certificates every time this is
// called, same inputs app/api/billing/summary/route.ts uses to decide whether
// to show the button at all. A firm can therefore, in principle, trigger this
// more than once before the operator acts on it; the cost of that is a
// duplicate email, not a duplicate refund, and building a request-tracking
// column for that felt like scope this task didn't ask for. Revisit if it
// turns out to matter in practice.
// =============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { decideCancelEligibility, REFUND_WINDOW_DAYS } from '@/lib/cancel-refund-eligibility'
import { alertOperator } from '@/lib/operator-alert'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined

  if (role !== 'admin' || !firmId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: firm } = await admin
    .from('firms')
    .select('id, name, created_at, stripe_subscription_id')
    .eq('id', firmId)
    .single()

  if (!firm?.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'This firm has no active subscription to cancel.' },
      { status: 409 }
    )
  }

  const { count: certCount } = await admin
    .from('certificates')
    .select('id', { count: 'exact', head: true })
    .eq('firm_id', firmId)

  const { eligible, reasons } = decideCancelEligibility({
    purchasedAt: firm.created_at,
    certificateIssued: (certCount ?? 0) > 0,
  })

  if (!eligible) {
    return NextResponse.json({ eligible: false, reasons }, { status: 409 })
  }

  await alertOperator('🔴 Self-serve cancel + refund request', [
    `<strong>Firm:</strong> ${firm.name || '(no name)'} (${firm.id})`,
    `<strong>Requested by:</strong> ${user.email ?? '(unknown)'}`,
    `<strong>Purchased:</strong> ${firm.created_at} (within the ${REFUND_WINDOW_DAYS}-day window)`,
    `<strong>Subscription:</strong> ${firm.stripe_subscription_id}`,
    `<strong>Action needed:</strong> review in Stripe, issue the refund, and cancel the subscription. Neither happened automatically — this route only checked eligibility.`,
  ])

  return NextResponse.json({ eligible: true, requested: true })
}
