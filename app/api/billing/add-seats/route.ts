// =============================================================================
// POST /api/billing/add-seats — mid-year seat additions.
//
// ix-midyearseats (OPEN-ISSUES.md #18). Until this route existed, "Add seats
// in Billing" was a dead link to /api/portal — the Stripe Customer Portal has
// no seat-add control, and inviting past the purchased count was a hard 409
// (app/api/invite/route.ts:53-58) with nowhere to go.
//
// Design agreed with Rob 2026-09-21:
//   - One-time charge, full year, at the firm's CURRENT per-seat rate — the
//     rate their existing headcount already puts them in, from lib/pricing.ts.
//     Deliberately NOT re-rated even if the addition would cross into a
//     cheaper band; that's temporary and self-corrects at renewal.
//   - NEVER bumps the live subscription's `quantity`. That would make Stripe
//     auto-bill the new count starting on the subscription's own cadence,
//     which is not what "one-time, this year only" means. This is a separate,
//     one-off Invoice against the same Customer instead.
//   - Recorded in seat_ledger (0033) so the eventual renewal process knows
//     this batch already paid through a date, and at what rate, for the
//     true-up credit (lib/seat-ledger.ts).
// =============================================================================

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateForSeatCount } from '@/lib/pricing'
import { computeMidYearChargeCents } from '@/lib/seat-ledger'

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
  try {
    const body = (await req.json()) as { seats?: unknown }
    seatsToAdd = typeof body.seats === 'number' ? Math.floor(body.seats) : NaN
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

  // The rate the firm is ALREADY paying, from their current headcount — not
  // the headcount after this addition. See the header: crossing a band is a
  // renewal-time event, not a mid-year one.
  const currentRatePerSeat = rateForSeatCount(firm.max_seats)
  const currentRatePerSeatCents = currentRatePerSeat * 100
  const chargeCents = computeMidYearChargeCents(seatsToAdd, currentRatePerSeatCents)

  const stripe = getStripe()
  const now = new Date()
  const coversUntil = new Date(now.getTime())
  coversUntil.setUTCDate(coversUntil.getUTCDate() + 365)

  let invoiceId: string
  try {
    await stripe.invoiceItems.create({
      customer: firm.stripe_customer_id,
      amount: chargeCents,
      currency: 'usd',
      // Same code set on the subscription Product (Stripe dashboard,
      // 2026-08-27) — this line item has no Price object of its own to carry
      // it, so it has to be stated explicitly for Stripe Tax to rate it the
      // same way.
      tax_code: 'txcd_20060058',
      description:
        `${seatsToAdd} additional ${seatsToAdd === 1 ? 'seat' : 'seats'} at ` +
        `$${currentRatePerSeat}/seat/yr (your current rate), added ${now.toISOString().slice(0, 10)}`,
    })

    const invoice = await stripe.invoices.create({
      customer: firm.stripe_customer_id,
      collection_method: 'charge_automatically',
      automatic_tax: { enabled: true },
      description: 'IURIX: mid-year seat addition',
    })
    invoiceId = invoice.id!

    await stripe.invoices.finalizeInvoice(invoiceId)
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

  // Only after the charge is confirmed paid — a seat that was never paid for
  // must not become invite-able because a DB write happened to run anyway.
  const newMaxSeats = firm.max_seats + seatsToAdd

  const { error: firmUpdateError } = await admin
    .from('firms')
    .update({ max_seats: newMaxSeats })
    .eq('id', firmId)

  const { error: seatsUpdateError } = await admin
    .from('seats')
    .update({ max_seats: newMaxSeats })
    .eq('firm_id', firmId)

  const { error: ledgerError } = await admin.from('seat_ledger').insert({
    firm_id: firmId,
    seat_count: seatsToAdd,
    rate_paid_cents: currentRatePerSeatCents,
    added_at: now.toISOString(),
    covers_until: coversUntil.toISOString(),
  })

  // The charge already succeeded at Stripe at this point — these are DB
  // writes that must not silently fail invisibly. Logged loudly rather than
  // returned as a user-facing error: the seats WERE paid for, telling the
  // admin otherwise would be false, and 0034+ can add a reconciliation sweep
  // if this ever actually fires.
  if (firmUpdateError || seatsUpdateError || ledgerError) {
    console.error(
      '[billing/add-seats] PAID but DB write failed — reconcile by hand:',
      { firmId, invoiceId, seatsToAdd, firmUpdateError, seatsUpdateError, ledgerError }
    )
  }

  return NextResponse.json({
    seatsAdded: seatsToAdd,
    newMaxSeats,
    chargedCents: chargeCents,
    ratePerSeat: currentRatePerSeat,
  })
}
