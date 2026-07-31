import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // Matches the five existing Stripe callers. CLAUDE.md still names
      // 2025-09-30.acacia; the doc is stale and the code is right — do not
      // "correct" this to match it.
      apiVersion: '2026-05-27.dahlia',
      httpClient: Stripe.createFetchHttpClient(),
    })
  }
  return _stripe
}

// In API 2026-05-27.dahlia current_period_end lives on the SubscriptionItem,
// not the Subscription. Same helper as the Stripe webhook — kept local rather
// than exported from there, because that module is a route handler and importing
// from it would drag the whole webhook into this bundle.
function getPeriodEnd(sub: Stripe.Subscription): string | null {
  const ts = sub.items.data[0]?.current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}

export interface BillingInvoice {
  id: string
  /** ISO date the invoice was created. */
  date: string
  /** Minor units (cents), as Stripe reports it — formatted client-side. */
  amountPaid: number
  currency: string
  status: Stripe.Invoice.Status | null
  hostedInvoiceUrl: string | null
  invoicePdf: string | null
}

export interface BillingSummary {
  /** False when the firm has no Stripe subscription (onboarding stub path). */
  hasSubscription: boolean
  seats: number | null
  currentPeriodEnd: string | null
  /** Raw Stripe status — distinct from firms.status, see below. */
  status: Stripe.Subscription.Status | null
  /**
   * The field firms.status structurally cannot express. That column holds only
   * active / payment_failed / cancelled, and a subscription set to end at the
   * period boundary is still `active` in both places — correctly, since the firm
   * has paid through that date. Without this flag the UI cannot tell "renews"
   * from "runs out on the 3rd", which is the entire point of the billing page.
   */
  cancelAtPeriodEnd: boolean
  invoices: BillingInvoice[]
}

export async function GET() {
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
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', firmId)
    .single()

  // A firm can legitimately exist with no Stripe objects — the onboarding stub
  // path creates the row before checkout completes. That is an empty state, not
  // an error: throwing here would break the billing page for exactly the users
  // least able to understand why.
  if (!firm?.stripe_subscription_id) {
    const empty: BillingSummary = {
      hasSubscription: false,
      seats: null,
      currentPeriodEnd: null,
      status: null,
      cancelAtPeriodEnd: false,
      invoices: [],
    }
    return NextResponse.json(empty)
  }

  const stripe = getStripe()

  try {
    const sub = await stripe.subscriptions.retrieve(firm.stripe_subscription_id)

    // Invoices are looked up by customer, not subscription: a firm that changed
    // plans keeps one customer across subscriptions, and the payment history
    // should not lose rows because of that.
    const invoiceList = firm.stripe_customer_id
      ? await stripe.invoices.list({ customer: firm.stripe_customer_id, limit: 12 })
      : null

    const summary: BillingSummary = {
      hasSubscription: true,
      seats: sub.items.data[0]?.quantity ?? null,
      currentPeriodEnd: getPeriodEnd(sub),
      status: sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      invoices: (invoiceList?.data ?? []).map(inv => ({
        id: inv.id ?? '',
        date: new Date(inv.created * 1000).toISOString(),
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        // Linked, never proxied — Stripe's hosted pages are already
        // authenticated by an unguessable URL, and proxying PDFs would mean
        // streaming billing documents through our Worker for no benefit.
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        invoicePdf: inv.invoice_pdf ?? null,
      })),
    }

    return NextResponse.json(summary)
  } catch (err) {
    console.error('[billing/summary] Stripe lookup failed:', err)
    return NextResponse.json({ error: 'Could not load billing details' }, { status: 502 })
  }
}
