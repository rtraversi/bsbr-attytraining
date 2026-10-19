// =============================================================================
// POST /api/billing/add-seats — mid-year seat additions.
//
// ix-midyearseats (OPEN-ISSUES.md #18). Until this route existed, "Add seats
// in Billing" was a dead link to /api/portal — the Stripe Customer Portal has
// no seat-add control, and inviting past the purchased count was a hard 409
// (app/api/invite/route.ts:53-58) with nowhere to go.
//
// Model set by Rob 2026-10-19 (replaces the 2026-09-21 full-year + true-up
// design; math and worked example in lib/seat-ledger.ts):
//   - Charged today, PRORATED from the day added to the subscription's own
//     renewal date, at the firm's CURRENT per-seat rate (lib/pricing.ts).
//     Deliberately NOT re-rated if the addition crosses into a cheaper band;
//     everyone moves to the new band at renewal.
//   - A separate one-off Invoice carries the charge. Then the subscription's
//     quantity is raised with proration_behavior 'none', so renewal bills
//     every seat together at the new headcount's band. No renewal credits.
//   - Recorded in seat_ledger (0033) as an audit trail.
// =============================================================================

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateForSeatCount } from '@/lib/pricing'
import { computeProratedSeatChargeCents, MIN_CHARGE_CENTS } from '@/lib/seat-ledger'
import { alertOperator } from '@/lib/operator-alert'
import { escapeHtml } from '@/lib/escape-html'

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-05-27.dahlia',
      httpClient: Stripe.createFetchHttpClient(),
    })
  }
  return _stripe
}

const MAX_SEATS_PER_ADD = 500

export async function POST(req: Request) {
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

  let seatsToAdd: number
  let requestId: string | null
  try {
    const body = (await req.json()) as { seats?: unknown; requestId?: unknown }
    seatsToAdd = typeof body.seats === 'number' ? Math.floor(body.seats) : NaN
    requestId =
      typeof body.requestId === 'string' && /^[0-9a-f-]{36}$/i.test(body.requestId)
        ? body.requestId
        : null
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Number.isFinite(seatsToAdd) || seatsToAdd < 1 || seatsToAdd > MAX_SEATS_PER_ADD) {
    return NextResponse.json(
      { error: `Enter a number of seats between 1 and ${MAX_SEATS_PER_ADD}.` },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data: firm } = await admin
    .from('firms')
    .select('id, name, stripe_customer_id, stripe_subscription_id, max_seats')
    .eq('id', firmId)
    .single()

  if (!firm?.stripe_customer_id || !firm.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'This firm has no active subscription to add seats to.' },
      { status: 409 }
    )
  }

  const stripe = getStripe()
  const now = new Date()

  // The subscription, not firms.max_seats, is the source of truth for the
  // seat count and the period: the add is prorated to ITS renewal date, and
  // its quantity is what renewal will bill.
  let sub: Stripe.Subscription
  try {
    sub = await stripe.subscriptions.retrieve(firm.stripe_subscription_id)
  } catch (err) {
    console.error('[billing/add-seats] subscription retrieve failed:', err)
    return NextResponse.json(
      { error: 'Could not load your subscription. Please try again.' },
      { status: 502 }
    )
  }
  const item = sub.items.data[0]
  if (sub.status !== 'active' || !item?.current_period_start || !item.current_period_end) {
    return NextResponse.json(
      { error: 'Seats can only be added while your subscription is active.' },
      { status: 409 }
    )
  }
  const currentQuantity = item.quantity ?? firm.max_seats
  const periodStart = new Date(item.current_period_start * 1000)
  const periodEnd = new Date(item.current_period_end * 1000)

  // The rate the firm is ALREADY paying, from their current headcount — not
  // the headcount after this addition. See the header: crossing a band is a
  // renewal-time event, not a mid-year one.
  const currentRatePerSeat = rateForSeatCount(currentQuantity)
  const currentRatePerSeatCents = currentRatePerSeat * 100
  const chargeCents = computeProratedSeatChargeCents(
    seatsToAdd,
    currentRatePerSeatCents,
    now,
    periodStart,
    periodEnd
  )

  // Stripe idempotency keys, from a per-attempt id the billing page sends. A
  // replayed request (network retry, double submit) gets the SAME draft
  // invoice, line item and subscription update back instead of a second
  // charge or a second quantity bump. A caller that sends none gets a fresh
  // id: no dedupe, but nothing worse than before.
  const idemBase = `add-seats:${firmId}:${requestId ?? crypto.randomUUID()}`

  // Under Stripe's card minimum (the last day or so before renewal): no
  // charge, the seats just join the subscription and pay at renewal.
  let invoiceId: string | null = null
  if (chargeCents >= MIN_CHARGE_CENTS) {
    try {
      // Invoice FIRST, then the line item attached to it by id. The reverse
      // order (a pending item, then invoices.create) charges $0: on this API
      // version invoices.create defaults pending_invoice_items_behavior to
      // `exclude`, so the invoice came out empty, "paid", granted the seats,
      // and left the real charge pending until the subscription's next renewal
      // invoice swept it up. Attaching by id also keeps two concurrent adds
      // from pulling each other's items onto one invoice.
      const invoice = await stripe.invoices.create(
        {
          customer: firm.stripe_customer_id,
          collection_method: 'charge_automatically',
          automatic_tax: { enabled: true },
          pending_invoice_items_behavior: 'exclude',
          description: 'IURIX: mid-year seat addition',
        },
        { idempotencyKey: `${idemBase}:invoice` }
      )
      invoiceId = invoice.id!

      // An idempotent replay returns the invoice as it was when first created
      // (a draft), so ask Stripe for its state now. Past draft means the first
      // request already finalized it: answer without charging or adding seats
      // a second time.
      const current = await stripe.invoices.retrieve(invoiceId)
      if (current.status !== 'draft') {
        return NextResponse.json(
          { error: 'This seat purchase was already submitted. Refresh the page to see your seats.' },
          { status: 409 }
        )
      }

      await stripe.invoiceItems.create(
        {
          customer: firm.stripe_customer_id,
          invoice: invoiceId,
          amount: chargeCents,
          currency: 'usd',
          // Same code set on the subscription Product (Stripe dashboard,
          // 2026-08-27) — this line item has no Price object of its own to
          // carry it, so it has to be stated explicitly for Stripe Tax to rate
          // it the same way.
          tax_code: 'txcd_20060058',
          description:
            `${seatsToAdd} additional ${seatsToAdd === 1 ? 'seat' : 'seats'} at ` +
            `$${currentRatePerSeat}/seat/yr (your current rate), prorated ` +
            `${now.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`,
        },
        { idempotencyKey: `${idemBase}:item` }
      )

      const finalized = await stripe.invoices.finalizeInvoice(invoiceId)
      // Belt and braces for the $0 failure above: never pay, and never grant
      // seats from, an invoice that doesn't carry the charge.
      if (finalized.subtotal < chargeCents) {
        console.error('[billing/add-seats] finalized invoice is short of the charge:', {
          invoiceId,
          subtotal: finalized.subtotal,
          chargeCents,
        })
        await stripe.invoices.voidInvoice(invoiceId).catch(() => {})
        return NextResponse.json(
          { error: 'Could not prepare the charge. Please try again or contact support.' },
          { status: 502 }
        )
      }
      const paid = await stripe.invoices.pay(invoiceId)

      if (paid.status !== 'paid') {
        return NextResponse.json(
          { error: 'Payment did not go through. Please check your payment method and try again.' },
          { status: 402 }
        )
      }
    } catch (err) {
      console.error('[billing/add-seats] Stripe charge failed:', err)
      return NextResponse.json(
        { error: 'Could not charge your payment method. Please check it and try again.' },
        { status: 502 }
      )
    }
  }

  // Only after the charge is confirmed paid. Raising the quantity is what
  // makes renewal bill these seats with everyone else, at the band the new
  // headcount lands in. proration_behavior 'none' because the prorated charge
  // was just collected above at the CURRENT rate; Stripe's own proration
  // would re-rate every seat mid-year whenever this crosses a band.
  let newMaxSeats = currentQuantity + seatsToAdd
  try {
    const updated = await stripe.subscriptions.update(
      sub.id,
      { items: [{ id: item.id, quantity: newMaxSeats }], proration_behavior: 'none' },
      { idempotencyKey: `${idemBase}:quantity` }
    )
    newMaxSeats = updated.items.data[0]?.quantity ?? newMaxSeats
  } catch (err) {
    // Paid (or free) but the subscription still bills the old count. The seats
    // are granted below regardless, since the customer paid for them, but the
    // operator has to raise the quantity by hand before renewal: otherwise
    // renewal under-bills and the webhook resets max_seats to the old count.
    console.error('[billing/add-seats] PAID but subscription quantity update failed:', err)
    await alertOperator('🔴 Add seats: paid, but subscription quantity NOT raised', [
      `<strong>Firm:</strong> ${escapeHtml(firm.name || '(no name)')} (${firm.id})`,
      `<strong>Subscription:</strong> ${sub.id}`,
      `<strong>Raise quantity to:</strong> ${newMaxSeats} (proration: none)`,
      `<strong>Invoice:</strong> ${invoiceId ?? '(no charge, under the card minimum)'}`,
    ])
  }

  const { error: firmUpdateError } = await admin
    .from('firms')
    .update({ max_seats: newMaxSeats })
    .eq('id', firmId)

  const { error: seatsUpdateError } = await admin
    .from('seats')
    .update({ max_seats: newMaxSeats })
    .eq('firm_id', firmId)

  // Audit record only: what was added, when, at what per-seat rate, and the
  // renewal date it was prorated to. Renewal no longer reads it.
  const { error: ledgerError } = await admin.from('seat_ledger').insert({
    firm_id: firmId,
    seat_count: seatsToAdd,
    rate_paid_cents: currentRatePerSeatCents,
    added_at: now.toISOString(),
    covers_until: periodEnd.toISOString(),
  })

  // The charge already succeeded at Stripe at this point — these are DB
  // writes that must not silently fail invisibly. Logged loudly rather than
  // returned as a user-facing error: the seats WERE paid for, telling the
  // admin otherwise would be false. The customer.subscription.updated webhook
  // also sets max_seats from the new quantity, which repairs the first two.
  if (firmUpdateError || seatsUpdateError || ledgerError) {
    console.error(
      '[billing/add-seats] PAID but DB write failed — reconcile by hand:',
      { firmId, invoiceId, seatsToAdd, firmUpdateError, seatsUpdateError, ledgerError }
    )
  }

  return NextResponse.json({
    seatsAdded: seatsToAdd,
    newMaxSeats,
    chargedCents: invoiceId ? chargeCents : 0,
    ratePerSeat: currentRatePerSeat,
  })
}
