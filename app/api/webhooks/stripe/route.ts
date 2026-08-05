import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { SEAT_OCCUPYING_STATUSES } from '@/lib/seats'
import { CheckoutEmailInUseEmail } from '@/emails/checkout-email-in-use'
import { CheckoutNonUsEmail } from '@/emails/checkout-non-us'

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

function deriveTier(seats: number): 'basic' | 'standard' | 'pro' {
  if (seats >= 25) return 'pro'
  if (seats >= 10) return 'standard'
  return 'basic'
}

// In API 2026-05-27.dahlia, current_period_end moved to SubscriptionItem
function getPeriodEnd(sub: Stripe.Subscription): string | null {
  const ts = sub.items.data[0]?.current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}

// Invoice.subscription is gone in dahlia — it's now invoice.parent.subscription_details.subscription
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  if (invoice.parent?.type !== 'subscription_details') return null
  const sub = invoice.parent.subscription_details?.subscription
  return typeof sub === 'string' ? sub : (sub?.id ?? null)
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Idempotency — unique constraint on event_id rejects duplicates
  const { error: dupeError } = await supabase
    .from('processed_stripe_events')
    .insert({ event_id: event.id })

  if (dupeError) {
    return NextResponse.json({ received: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.id)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
    }
  } catch (err) {
    console.error(`[stripe-webhook] ${event.type} handler threw:`, err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ─── Provisioning identity + failure ledger ──────────────────────────────────

type AdminClient = ReturnType<typeof createAdminClient>

// The generated types render provisioning_failures.reason as a bare `string`:
// supabase gen types only emits unions for real Postgres enum types, never for
// CHECK constraints. So a typo here would compile cleanly and only blow up at
// runtime inside a webhook handler — the worst possible place to find out.
// Declaring the union locally makes TypeScript and the DB CHECK agree.
type ProvisioningFailureReason = 'duplicate' | 'email_in_use' | 'unresolved' | 'non_us_billing'

/**
 * LAYER 2 of the US-only rule — the backstop.
 *
 * Layer 1 (/api/checkout) refuses to create a session for a non-US buyer, so
 * nothing is charged. That check is self-declared and therefore defeatable, and
 * this is what catches anyone who does. It runs on the address STRIPE collected,
 * which the buyer cannot forge — checkout sets billing_address_collection:
 * 'required' precisely so this field is always populated.
 *
 * Reaching here means someone WAS charged, so this is not simply a refusal: it
 * follows the same path as case 3 — ledger row, cancel the orphan, tell the
 * customer, alert the operator. That is Max's "charged and received nothing"
 * case, which he has ruled gets a full refund with no window.
 */
const ALLOWED_BILLING_COUNTRY = 'US'

/**
 * Who is this buyer? Resolved before anything is provisioned, cancelled or
 * refused. Resolution order is owner before member (Max's ruling, 2026-08-03),
 * and among owned firms active beats non-active.
 */
type BuyerIdentity =
  /** Owns a firm that is currently active — this payment is a genuine duplicate. */
  | { kind: 'duplicate'; userId: string; firmId: string; firmSubscriptionId: string | null }
  /** Owns a firm that lapsed or was cancelled — reattach their history. */
  | { kind: 'returning'; userId: string; firmId: string; firmStatus: string }
  /** Owns nothing, but is staff at somebody else's active firm. */
  | { kind: 'email_in_use'; userId: string }
  /** Has a login but owns nothing and belongs to nothing active — give them a firm. */
  | { kind: 'existing_user_no_firm'; userId: string }
  /** Reported as already registered, but no user row matches. Should be unreachable. */
  | { kind: 'unresolved' }

/**
 * True when createUser failed because the address is already taken, as opposed
 * to a transient fault. GoTrue answers with `email_exists`; some versions send
 * `user_already_exists` for the same condition. The message check is a floor for
 * responses that arrive without a code at all.
 *
 * This distinction is the whole point: treating every createUser failure as a
 * re-purchase is what let a network blip drop a paying customer into a dead end.
 */
function isEmailTakenError(err: { code?: string; message?: string }): boolean {
  if (err.code === 'email_exists' || err.code === 'user_already_exists') return true
  return /already (been )?registered|already exists/i.test(err.message ?? '')
}

/**
 * Record the outcome before alerting, so a mail failure never loses the record.
 * The row is what makes recovery possible at all: the processed_stripe_events
 * insert has already burned this event, so replaying it from the Stripe
 * dashboard is a no-op.
 *
 * Keyed by session id, so a duplicate delivery collides rather than filing a
 * second row for the same payment.
 */
async function recordProvisioningFailure(
  supabase: AdminClient,
  session: Stripe.Checkout.Session,
  email: string,
  reason: ProvisioningFailureReason
) {
  const { error } = await supabase.from('provisioning_failures').insert({
    stripe_session_id: session.id,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: (session.subscription as string) ?? null,
    email,
    reason,
  })

  // Logged, never thrown: throwing here would return 500 and strand the
  // customer with no alert either. The console line is the last resort.
  if (error) {
    console.error(
      `[stripe-webhook] FAILED to record provisioning_failures row for ${session.id} (${reason}):`,
      error
    )
  }
}

/** Best-effort operator alert. A mail failure is logged and swallowed. */
async function alertOperator(subject: string, lines: string[]) {
  // The fallback once pointed at info@aistaffcompliance.com, a RETIRED domain,
  // so whenever OPERATOR_ALERT_EMAIL was unset this alert was mailed into a void
  // — and it HAS been unset since the domain move, which made the whole safety
  // net of the 07-09 collision fix inert. It is now Rob's real business address
  // (cutover item C4, ix-supportdest), the same inbox the in-app support form
  // delivers to (app/api/support/contact/route.ts). A misconfigured env must
  // still not silently mail a dead domain. Set the real secret as well — the
  // fallback is a floor, not the configuration.
  //
  // May hold SEVERAL addresses, comma-separated. sendEmail splits them (see
  // parseRecipients in lib/resend.ts), so an alert that a customer paid and got
  // nothing can reach more than one person — a single address is a single point
  // of failure for exactly the message that must not be missed.
  const operatorEmail = process.env.OPERATOR_ALERT_EMAIL ?? 'info@iurixaccreditation.com'

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:32px 24px">
<ul style="font-size:14px">
${lines.map((l) => `  <li>${l}</li>`).join('\n')}
</ul>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">IURIX</p>
</body></html>`

  try {
    await sendEmail({ to: operatorEmail, subject, html })
  } catch (mailErr) {
    console.error('[stripe-webhook] operator alert email failed:', mailErr)
  }
}

/**
 * Ask who the buyer is, rather than inferring it from whether account creation
 * happened to fail. Only called once createUser has reported the address taken.
 */
async function resolveBuyer(supabase: AdminClient, email: string): Promise<BuyerIdentity> {
  const { data: userId, error: lookupError } = await supabase.rpc('find_user_id_by_email', {
    p_email: email,
  })

  // A lookup fault is transient, not an identity answer — surface it rather
  // than guessing at someone's billing.
  if (lookupError) throw lookupError

  // The generated signature says `Returns: string`, but a SQL function that
  // matches no rows resolves to null. Trust the runtime, not the type.
  if (!userId) return { kind: 'unresolved' }

  // Owner before member. Among owned firms, active beats non-active — a buyer
  // who owns both an active and a dead firm is duplicating, not returning.
  const { data: ownedFirms, error: firmsError } = await supabase
    .from('firms')
    .select('id, status, stripe_subscription_id')
    .eq('owner_id', userId)

  if (firmsError) throw firmsError

  const activeOwned = ownedFirms?.find((f) => f.status === 'active')
  if (activeOwned) {
    return {
      kind: 'duplicate',
      userId,
      firmId: activeOwned.id,
      firmSubscriptionId: activeOwned.stripe_subscription_id,
    }
  }

  // firms.status is CHECK-constrained to ('active','payment_failed','cancelled')
  // (0001:45-46), so anything not active is revivable by definition.
  const revivableOwned = ownedFirms?.[0]
  if (revivableOwned) {
    return {
      kind: 'returning',
      userId,
      firmId: revivableOwned.id,
      firmStatus: revivableOwned.status,
    }
  }

  // Owns nothing. Are they staff somewhere? app_metadata.firm_id is the right
  // signal rather than a firm_members lookup: reassign and delete both clear it
  // (member/delete/route.ts:64, and the 07-30 revoke-on-reassign work), so a
  // departed employee correctly reads as belonging to nothing and gets their
  // own firm instead of being refused.
  const { data: userRecord, error: userError } = await supabase.auth.admin.getUserById(userId)
  if (userError) throw userError

  const memberFirmId = userRecord.user?.app_metadata?.firm_id as string | undefined

  if (memberFirmId) {
    const { data: memberFirm, error: memberFirmError } = await supabase
      .from('firms')
      .select('status')
      .eq('id', memberFirmId)
      .maybeSingle()

    if (memberFirmError) throw memberFirmError

    // Only an *active* employer blocks the purchase. Staff at a lapsed firm are
    // free to buy their own.
    if (memberFirm?.status === 'active') return { kind: 'email_in_use', userId }
  }

  return { kind: 'existing_user_no_firm', userId }
}

// ─── checkout.session.completed — provision new firm ─────────────────────────

/**
 * Everything that must happen before the first write: read the session, price
 * the subscription, and establish who the buyer is.
 *
 * Extracted so the entire pre-write region sits behind a single try/catch in
 * the caller. Every throw in here — a session with no email, a Stripe retrieve
 * fault, a non-collision createUser error, or any of resolveBuyer's four lookup
 * failures — happens with nothing written, so all of them can safely release
 * the idempotency row rather than only the one that used to.
 */
type CheckoutPlan = {
  email: string
  sub: Stripe.Subscription
  seats: number
  periodEnd: string | null
} & (
  | { outcome: 'provision'; userId: string }
  | { outcome: 'resolved'; buyer: BuyerIdentity; collisionMessage: string }
)

async function prepareCheckout(
  supabase: AdminClient,
  session: Stripe.Checkout.Session
): Promise<CheckoutPlan> {
  const email = session.customer_details?.email
  if (!email) throw new Error('No customer email on session')

  const sub = await getStripe().subscriptions.retrieve(session.subscription as string, {
    expand: ['items.data'],
  })
  const seats = sub.items.data[0]?.quantity ?? 1
  const periodEnd = getPeriodEnd(sub)

  // Create the auth user. email_confirm: true because they already paid via Stripe.
  // No password set yet — onboarding sends a magic link so they can sign in and set one.
  const { data: userData, error: createUserError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  })

  if (!createUserError) {
    return { email, sub, seats, periodEnd, outcome: 'provision', userId: userData.user.id }
  }

  // A createUser failure is not evidence of a re-purchase. Anything other than
  // "this address is taken" is a transient fault, and swallowing it is how a
  // network blip during provisioning silently dropped a paying customer.
  if (!isEmailTakenError(createUserError)) throw createUserError

  return {
    email,
    sub,
    seats,
    periodEnd,
    outcome: 'resolved',
    buyer: await resolveBuyer(supabase, email),
    collisionMessage: createUserError.message,
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  const supabase = createAdminClient()

  let plan: CheckoutPlan
  try {
    plan = await prepareCheckout(supabase, session)
  } catch (err) {
    // Release the idempotency row. Nothing in prepareCheckout writes, so there
    // is nothing a retry could double-provision.
    //
    // Without this the throw is theatre: the processed_stripe_events row is
    // inserted before dispatch (route.ts:57), so Stripe's retry hits the
    // duplicate guard at route.ts:62 and returns 200 without ever re-running
    // this handler. The insert itself stays exactly where it is; this is a
    // compensating delete over the region where we know no write occurred.
    //
    // Keyed by the Stripe EVENT id (evt_…), which is what route.ts:59 wrote.
    // session.id is the checkout session (cs_…) and would match no row, which
    // would leave the retry silently dead — the very failure this prevents.
    await supabase.from('processed_stripe_events').delete().eq('event_id', eventId)
    throw err
  }

  const { email, sub, seats, periodEnd } = plan

  // Country is checked BEFORE any provisioning branch, including the happy path.
  // A non-US buyer who is otherwise a perfectly ordinary new customer is exactly
  // the one this has to stop, and putting it inside the switch below would miss
  // them entirely.
  const billingCountry = session.customer_details?.address?.country ?? null
  if (billingCountry !== ALLOWED_BILLING_COUNTRY) {
    await refuseNonUsBilling(supabase, session, email, billingCountry)
    return
  }

  if (plan.outcome === 'provision') {
    await provisionFirm(supabase, plan.userId, session, sub, seats, periodEnd)
    return
  }

  const { buyer, collisionMessage } = plan

  switch (buyer.kind) {
    // Case 4 — an existing login that owns nothing and belongs to nothing
    // active. They are a legitimate new customer who simply already had an
    // account, so provision normally against the user they already have.
    case 'existing_user_no_firm':
      await provisionFirm(supabase, buyer.userId, session, sub, seats, periodEnd)
      return

    // Case 1 — a genuine duplicate. Stop the new subscription billing and leave
    // the firm they already have completely alone. No refund: cancelling in
    // Stripe does not return funds, and whether to refund is Rob's call, made
    // by hand.
    case 'duplicate':
      await cancelDuplicateSubscription(supabase, buyer, session, email)
      return

    // Case 2 — the win-back. Cancellation only ever flipped firms.status, so
    // this firm's staff, certificates, seat records and audit log are all still
    // in the database. Reattaching them is the feature, not damage control.
    case 'returning':
      await reactivateFirm(supabase, buyer, session, sub, seats, periodEnd, email)
      return

    // Case 3 — the buyer is staff at somebody else's active firm. Provision
    // nothing and cancel nothing; their employer's account is not ours to
    // touch, and the buyer is the only one who can resolve it.
    case 'email_in_use':
      await refuseEmailInUse(supabase, session, email)
      return

    case 'unresolved':
      await recordProvisioningFailure(supabase, session, email, 'unresolved')
      await alertOperator('🔴 Stripe — provisioning collision could not be resolved', [
        `<strong>Customer email:</strong> ${email}`,
        `<strong>Checkout session:</strong> ${session.id}`,
        `<strong>Subscription:</strong> ${session.subscription as string}`,
        `<strong>Error:</strong> ${collisionMessage}`,
        `<strong>Action:</strong> auth reported this address as registered but no user row matches it. Identity store and lookup disagree.`,
      ])
      return
  }
}

/**
 * The original provisioning path, extracted verbatim so it can serve both a
 * brand new signup and case 4 (an existing login buying their first firm). The
 * only change is that the user id arrives as an argument instead of coming from
 * a createUser call two lines earlier.
 */
async function provisionFirm(
  supabase: AdminClient,
  userId: string,
  session: Stripe.Checkout.Session,
  sub: Stripe.Subscription,
  seats: number,
  periodEnd: string | null
) {
  const { data: firm, error: firmError } = await supabase
    .from('firms')
    .insert({
      name: 'My Firm',            // Updated during onboarding
      owner_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: sub.id,
      tier: deriveTier(seats),
      max_seats: seats,
      status: 'active',
      current_period_end: periodEnd,
    })
    .select('id')
    .single()

  if (firmError || !firm) throw firmError ?? new Error('Failed to create firm row')

  const firmId = firm.id

  // Stamp firm_id + role into app_metadata — this is what the RLS helpers read
  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { firm_id: firmId, role: 'admin' },
  })

  await supabase.from('seats').insert({ firm_id: firmId, max_seats: seats, used_seats: 0 })

  await supabase.from('firm_members').insert({
    firm_id: firmId,
    user_id: userId,
    role: 'admin',
    status: 'invited',   // → 'active' once they complete onboarding
    // The admin has not chosen whether to train yet. Defaulting to true would
    // consume a paid seat the firm never agreed to; onboarding flips this to
    // true only if they opt in.
    occupies_seat: false,
  })
}

/**
 * Cancel the subscription this checkout just created, so a payment that
 * provisioned nothing does not keep billing every year.
 *
 * 🔴 The subscription cancelled here is ALWAYS session.subscription — the brand
 * new one that arrived on this checkout. NEVER firm.stripe_subscription_id.
 * They are two different subscriptions and getting them backwards destroys the
 * access of a firm that is paying and up to date. No caller passes a firm's own
 * subscription id and none ever should; the id is read from the session inside
 * this function precisely so a caller cannot get it wrong.
 *
 * ⚠ This is the ONLY place in the codebase where subscriptions.cancel() is the
 * right call. app/api/billing/auto-renew/route.ts:29 carries a warning against
 * it and that warning still stands everywhere else: there, cancelling
 * immediately would destroy paid-for access. Here the subscription being ended
 * is seconds old, has bought nothing, and is attached to no firm — there is no
 * access to destroy, and leaving it alive would bill them again next year for
 * something they never received.
 *
 * Never issues a refund. Cancelling stops future billing; it does not return
 * the payment just captured. Refunds stay Rob's manual decision.
 *
 * Never rethrows: a failed cancel must not take down the handler and trigger a
 * Stripe retry, which would re-enter an event whose ledger row already exists.
 * The caller reports the failure to a human instead.
 */
async function cancelOrphanedSubscription(
  session: Stripe.Checkout.Session
): Promise<{ cancelled: boolean; error: string | null }> {
  const subscriptionId = session.subscription as string

  try {
    await getStripe().subscriptions.cancel(subscriptionId)
    return { cancelled: true, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[stripe-webhook] failed to cancel orphaned subscription ${subscriptionId}:`,
      err
    )
    return { cancelled: false, error: message }
  }
}

/**
 * Case 1 — a genuine duplicate purchase by someone who already owns an active
 * firm. Their existing firm and its subscription are not touched.
 */
async function cancelDuplicateSubscription(
  supabase: AdminClient,
  buyer: Extract<BuyerIdentity, { kind: 'duplicate' }>,
  session: Stripe.Checkout.Session,
  email: string
) {
  const duplicateSubscriptionId = session.subscription as string

  // The ledger row goes in first, before the cancel and before the alert. If
  // the Stripe call throws, the record of a captured payment that provisioned
  // nothing still exists — the event is already burned in
  // processed_stripe_events, so this row is the only recovery path there is.
  await recordProvisioningFailure(supabase, session, email, 'duplicate')

  const { cancelled, error: cancelError } = await cancelOrphanedSubscription(session)

  await alertOperator('⚠️ Stripe — duplicate purchase by an active firm owner', [
    `<strong>Customer email:</strong> ${email}`,
    `<strong>Existing firm:</strong> ${buyer.firmId} (active, untouched)`,
    `<strong>Firm's subscription — STILL ACTIVE, do not cancel:</strong> ${buyer.firmSubscriptionId ?? 'none on record'}`,
    `<strong>Duplicate subscription — ${cancelled ? 'CANCELLED' : 'STILL BILLING'}:</strong> ${duplicateSubscriptionId}`,
    `<strong>Checkout session:</strong> ${session.id}`,
    cancelled
      ? `<strong>Action:</strong> the duplicate has been cancelled and will not bill again. No refund was issued — decide whether to refund the payment just taken.`
      : `<strong>🔴 Action required:</strong> the cancel call FAILED (${cancelError}). The duplicate subscription is still billing and must be cancelled by hand in Stripe.`,
  ])
}

/**
 * Case 3 — the buyer's address is already registered as staff at another firm
 * that is active.
 *
 * Nothing is provisioned; their employer's account is not ours to modify. The
 * new subscription IS cancelled (amended 2026-08-03, Max): the original spec
 * left it billing, which charged a customer annually for something they never
 * received. Case 1 is the same outcome for the customer and cancelled
 * automatically, and the asymmetry had no principle behind it.
 *
 * This case is well-determined — the address has an auth account, owns no firm,
 * and is staff at an active one — so there is no ambiguity to be cautious
 * about. `unresolved` deliberately stays uncancelled: cancel when we understand
 * what happened, never while confused.
 *
 * The buyer is the only person who can resolve the underlying problem, so they
 * get an email as well as the operator alert.
 */
/**
 * A buyer whose Stripe-collected billing address is outside the US.
 *
 * Deliberately the SAME shape as refuseEmailInUse rather than a parallel path:
 * ledger row, cancel the orphaned subscription, tell the customer, alert the
 * operator. Reusing it means /api/onboarding/status already reports this
 * correctly and the customer sees a real explanation instead of polling into a
 * timeout.
 *
 * `country` is carried into the alert because a null value means something
 * different from a wrong value: null says Stripe collected no address at all,
 * which would point at billing_address_collection having been changed away from
 * 'required' in checkout, not at an international buyer.
 */
async function refuseNonUsBilling(
  supabase: AdminClient,
  session: Stripe.Checkout.Session,
  email: string,
  country: string | null
) {
  await recordProvisioningFailure(supabase, session, email, 'non_us_billing')

  const { cancelled, error: cancelError } = await cancelOrphanedSubscription(session)

  try {
    const html = await render(CheckoutNonUsEmail({ email, cancelled }))
    await sendEmail({
      to: email,
      subject: "We couldn't complete your IURIX purchase",
      html,
    })
  } catch (err) {
    console.error('[stripe-webhook] non_us_billing customer email failed:', err)
  }

  await alertOperator('⚠️ Stripe — purchase from a non-US billing address', [
    `<strong>Customer email:</strong> ${email}`,
    `<strong>Billing country:</strong> ${country ?? 'NONE COLLECTED — check billing_address_collection in /api/checkout'}`,
    `<strong>Checkout session:</strong> ${session.id}`,
    `<strong>Subscription — ${cancelled ? 'CANCELLED' : 'STILL BILLING'}:</strong> ${session.subscription as string}`,
    `<strong>What happened:</strong> nothing was provisioned. US-only is a policy constraint (Katy), not a technical one.`,
    // Same standing rule as case 3: no refund API is called anywhere in this
    // codebase, so a promise made in writing is kept by a human or not at all.
    cancelled
      ? `<strong>🔴 Action required — REFUND:</strong> the subscription is cancelled and the customer has been told <em>in writing</em> that their payment is being refunded. Issue it in Stripe. Nothing automated will.`
      : `<strong>🔴 Action required:</strong> the cancel call FAILED (${cancelError}). The subscription is still billing — cancel by hand, then refund. The customer has been told their payment is being returned.`,
    `<strong>Worth noting:</strong> layer 1 in /api/checkout should have stopped this before any charge. A row here means it was bypassed.`,
  ])
}

async function refuseEmailInUse(
  supabase: AdminClient,
  session: Stripe.Checkout.Session,
  email: string
) {
  await recordProvisioningFailure(supabase, session, email, 'email_in_use')

  const { cancelled, error: cancelError } = await cancelOrphanedSubscription(session)

  try {
    // refundPromised mirrors what the email actually claims. If the cancel
    // failed we do not tell them billing has stopped, because it has not.
    const html = await render(CheckoutEmailInUseEmail({ email, cancelled }))
    await sendEmail({
      to: email,
      subject: "We couldn't finish setting up your IURIX account",
      html,
    })
  } catch (err) {
    // Best-effort, same as every other send in this file. The ledger row is
    // already written and the operator alert still goes out below.
    console.error('[stripe-webhook] email_in_use customer email failed:', err)
  }

  await alertOperator('⚠️ Stripe — buyer is staff at another active firm', [
    `<strong>Customer email:</strong> ${email}`,
    `<strong>Checkout session:</strong> ${session.id}`,
    `<strong>Subscription — ${cancelled ? 'CANCELLED' : 'STILL BILLING'}:</strong> ${session.subscription as string}`,
    `<strong>What happened:</strong> nothing was provisioned. Their employer's firm is untouched.`,
    // 🔴 The customer email states a refund is on its way. Nothing in this
    // codebase issues one — no refund API is called anywhere, by design. That
    // promise is kept by a human or not at all, which is why it is stated here
    // as a required action rather than left implied.
    cancelled
      ? `<strong>🔴 Action required — REFUND:</strong> the subscription is cancelled, and the customer has been told <em>in writing</em> that their payment is being refunded. Issue the refund in Stripe. Nothing automated will do it.`
      : `<strong>🔴 Action required:</strong> the cancel call FAILED (${cancelError}). The subscription is still billing and must be cancelled by hand, then refunded — the customer has been told their payment is being returned.`,
    `<strong>Then:</strong> help them re-purchase on a different address.`,
  ])
}

/**
 * Case 2 — reattach a returning client to the firm they already had.
 *
 * handleSubscriptionDeleted only ever ran update({ status: 'cancelled' }), so
 * nothing was destroyed when they left: their staff, certificates, seat records
 * and training_events are all keyed off firm_id and are still there. This
 * function points the existing firm at the new subscription rather than
 * building a second one beside it, which is why no data migration of any kind
 * is involved.
 */
async function reactivateFirm(
  supabase: AdminClient,
  buyer: Extract<BuyerIdentity, { kind: 'returning' }>,
  session: Stripe.Checkout.Session,
  sub: Stripe.Subscription,
  seats: number,
  periodEnd: string | null,
  email: string
) {
  const { firmId, userId, firmStatus } = buyer

  // stripe_customer_id is the load-bearing field here, not just one of six.
  // app/api/onboarding/status/route.ts:48 finds the firm by it — leave it on the
  // old customer and the returning client polls, times out, and lands on the
  // exact "setup is taking a moment, please refresh" dead end this whole change
  // exists to remove.
  const { error: firmError } = await supabase
    .from('firms')
    .update({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: sub.id,
      status: 'active',
      tier: deriveTier(seats),
      max_seats: seats,
      current_period_end: periodEnd,
      // name is deliberately untouched — it is theirs, and keeping it is the
      // point of reattaching rather than provisioning fresh.
    })
    .eq('id', firmId)

  if (firmError) throw firmError

  // Re-stamp app_metadata: every gate reads firm_id from it, and it may be empty
  // (member/delete/route.ts:64 wipes it to {}) or pointing somewhere else
  // entirely if they were staff elsewhere in the meantime.
  const { error: metaError } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { firm_id: firmId, role: 'admin' },
  })

  if (metaError) throw metaError

  // The owner needs a live firm_members row. There is a unique (firm_id,
  // user_id) constraint (0001), so a blind insert would fail for anyone whose
  // row still exists in a soft-deleted state — restore in place instead.
  const { data: ownerMember, error: memberReadError } = await supabase
    .from('firm_members')
    .select('id, status, occupies_seat')
    .eq('firm_id', firmId)
    .eq('user_id', userId)
    .maybeSingle()

  if (memberReadError) throw memberReadError

  if (!ownerMember) {
    await supabase.from('firm_members').insert({
      firm_id: firmId,
      user_id: userId,
      role: 'admin',
      status: 'invited',
      // Same reasoning as first-time provisioning: a returning admin has not
      // chosen to train yet, so they take no seat until they opt in.
      occupies_seat: false,
    })
  } else if (!(SEAT_OCCUPYING_STATUSES as readonly string[]).includes(ownerMember.status)) {
    // Deleted or reassigned — bring the row back to life. occupies_seat stays
    // false so reactivation never silently consumes a seat.
    await supabase
      .from('firm_members')
      .update({ role: 'admin', status: 'invited', occupies_seat: false })
      .eq('id', ownerMember.id)
  }
  // An already-live owner row is left exactly as it is. If they had opted into
  // training before cancelling, they keep that seat — reactivation is not the
  // moment to silently revoke it.

  // max_seats only. used_seats belongs to the sync_used_seats trigger (0015);
  // writing it by hand is the bug that migration removed.
  const { error: seatsError } = await supabase
    .from('seats')
    .update({ max_seats: seats })
    .eq('firm_id', firmId)

  if (seatsError) throw seatsError

  // A returning client can buy fewer seats than they left with. Remove nobody:
  // lib/seats already blocks new enrollments for an oversubscribed firm, and
  // silently deleting someone's staff to make the arithmetic work would destroy
  // certificates that are compliance records. Just make sure a human knows.
  const { count: occupiedCount } = await supabase
    .from('firm_members')
    .select('id', { count: 'exact', head: true })
    .eq('firm_id', firmId)
    .eq('occupies_seat', true)
    .in('status', SEAT_OCCUPYING_STATUSES as unknown as string[])

  const oversubscribed = (occupiedCount ?? 0) > seats

  await alertOperator('✅ Stripe — returning client reactivated', [
    `<strong>Customer email:</strong> ${email}`,
    `<strong>Firm:</strong> ${firmId} (was ${firmStatus}, now active)`,
    `<strong>New customer:</strong> ${session.customer as string}`,
    `<strong>New subscription:</strong> ${sub.id}`,
    `<strong>Seats purchased:</strong> ${seats}`,
    ...(oversubscribed
      ? [
          `<strong>⚠️ Oversubscribed:</strong> ${occupiedCount} existing members already hold seats, ` +
            `more than the ${seats} just purchased. Nobody was removed and no certificates were touched. ` +
            `New enrollments are blocked until the counts line up — either they add seats or release members.`,
        ]
      : []),
  ])
}

// ─── customer.subscription.updated — seat/status change ──────────────────────

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const supabase = createAdminClient()

  const seats = sub.items.data[0]?.quantity ?? 1
  const periodEnd = getPeriodEnd(sub)
  const firmStatus =
    sub.status === 'active' ? 'active'
    : sub.status === 'past_due' ? 'payment_failed'
    : 'cancelled'

  const { data: firm } = await supabase
    .from('firms')
    .update({
      tier: deriveTier(seats),
      max_seats: seats,
      status: firmStatus,
      current_period_end: periodEnd,
    })
    .eq('stripe_subscription_id', sub.id)
    .select('id')
    .single()

  if (firm) {
    await supabase.from('seats').update({ max_seats: seats }).eq('firm_id', firm.id)
  }
}

// ─── customer.subscription.deleted ───────────────────────────────────────────

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const supabase = createAdminClient()

  await supabase
    .from('firms')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', sub.id)
}

// ─── invoice.payment_failed ───────────────────────────────────────────────────

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) return
  const supabase = createAdminClient()

  await supabase
    .from('firms')
    .update({ status: 'payment_failed' })
    .eq('stripe_subscription_id', subscriptionId)
}

// ─── invoice.payment_succeeded — mark active, handle renewal re-enrollment ────

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Only act on renewal and re-subscription events
  if (
    invoice.billing_reason !== 'subscription_cycle' &&
    invoice.billing_reason !== 'subscription_create'
  ) return

  const supabase = createAdminClient()
  const subscriptionId = getInvoiceSubscriptionId(invoice)

  // New period end from the invoice line item (Unix timestamp → ISO)
  const newPeriodEndTs = invoice.lines?.data?.[0]?.period?.end
  const newPeriodEnd = newPeriodEndTs ? new Date(newPeriodEndTs * 1000).toISOString() : null

  // Resolve the firm — subscription_create on a lapsed re-subscription comes with a NEW
  // subscription ID, so fall back to customer ID lookup when the subscription isn't found.
  let firm: { id: string; name: string; owner_id: string; current_period_end: string | null } | null = null
  let lookedUpByCustomer = false

  if (subscriptionId) {
    const { data } = await supabase
      .from('firms')
      .select('id, name, owner_id, current_period_end')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()
    firm = data
  }

  if (!firm && invoice.billing_reason === 'subscription_create' && invoice.customer) {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : (invoice.customer as { id: string }).id
    const { data } = await supabase
      .from('firms')
      .select('id, name, owner_id, current_period_end')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    firm = data
    lookedUpByCustomer = true
  }

  // No firm found = initial checkout not yet provisioned; handled by checkout.session.completed
  if (!firm) return

  // Always mark active + update period end (+ new subscription ID on lapsed re-sub)
  await supabase.from('firms').update({
    status: 'active',
    ...(newPeriodEnd && { current_period_end: newPeriodEnd }),
    ...(lookedUpByCustomer && subscriptionId && { stripe_subscription_id: subscriptionId }),
  }).eq('id', firm.id)

  // Determine how overdue the subscription was at payment time
  const now = new Date()
  const prevPeriodEnd = firm.current_period_end ? new Date(firm.current_period_end) : null
  const daysOverdue = prevPeriodEnd
    ? Math.floor((now.getTime() - prevPeriodEnd.getTime()) / 86_400_000)
    : 0

  // Initial purchase: subscription_create fired after checkout.session.completed provisioned the
  // firm with a future current_period_end — daysOverdue <= 0, skip re-enrollment (already handled)
  if (invoice.billing_reason === 'subscription_create' && daysOverdue <= 0) return

  const isLapsed = daysOverdue > 30  // grace = 1–30 days, lapsed = >30 days

  const { data: course } = await supabase.from('courses').select('id').limit(1).single()
  if (!course) return

  const { data: members } = await supabase
    .from('firm_members')
    .select('id, user_id')
    .eq('firm_id', firm.id)
    .not('status', 'in', '(deleted,reassigned)')

  if (!members || members.length === 0) return

  // For lapsed firms, reactivate deactivated members before re-enrolling
  if (isLapsed) {
    await supabase
      .from('firm_members')
      .update({ status: 'active' })
      .eq('firm_id', firm.id)
      .eq('status', 'deactivated')
  }

  for (const member of members) {
    // Skip if they already have an open enrollment for this cycle (handles grace + duplicate events)
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', member.user_id)
      .eq('course_id', course.id)
      .eq('firm_id', firm.id)
      .in('status', ['not_started', 'in_progress'])
      .maybeSingle()

    if (existing) continue

    const { error: enrollErr } = await supabase
      .from('enrollments')
      .insert({ user_id: member.user_id, course_id: course.id, firm_id: firm.id, status: 'not_started' })

    if (enrollErr) {
      console.error(`[renewal] enrollment insert failed for ${member.user_id}:`, enrollErr)
      continue
    }

    await supabase.from('training_events').insert({
      firm_id: firm.id,
      firm_member_id: member.id,
      event_type: 'renewal_enrolled',
      metadata: { course_id: course.id, renewal_type: isLapsed ? 'lapsed' : 'grace' },
    })
  }

  // Send notification emails after responding — fire and forget
  after(async () => {
    for (const member of members) {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(member.user_id)
        const email = authUser?.user?.email
        if (!email || email.endsWith('@redacted.invalid')) continue

        const name = (authUser?.user?.user_metadata?.full_name as string | undefined) ?? email
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

        await sendEmail({
          to: email,
          subject: `${firm.name} has renewed — complete your AI compliance training`,
          html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:14px">Hi ${name},</p>
<p style="font-size:14px">${firm.name} has renewed its annual AI compliance training certification. You have been re-enrolled and need to complete your training to maintain your compliance record under ABA Model Rule 5.3.</p>
<p><a href="${appUrl}/dashboard/training" style="display:inline-block;background:#14b8a6;color:#0f172a;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">Complete training</a></p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">IURIX</p>
</body></html>`,
        })
      } catch (err) {
        console.error(`[renewal] notification email failed for ${member.user_id}:`, err)
      }
    }
  })
}
