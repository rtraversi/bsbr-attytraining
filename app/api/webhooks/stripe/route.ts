import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'

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
type ProvisioningFailureReason = 'duplicate' | 'email_in_use' | 'unresolved'

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
  // TEMPORARY — pending Rob's business address (cutover item C4, tracked as
  // ix-supportdest). The fallback pointed at info@aistaffcompliance.com, a
  // RETIRED domain, so whenever OPERATOR_ALERT_EMAIL was unset this alert was
  // mailed into a void — and it HAS been unset since the domain move (absent
  // from wrangler.jsonc vars, all 9 Worker secrets, and the local env files).
  // That made the whole safety net of the 07-09 collision fix inert. A
  // misconfigured env must not silently mail a dead domain, so the fallback is
  // now the same live inbox the in-app support form already delivers to
  // (app/api/support/contact/route.ts:8). Set the real secret as well — the
  // fallback is a floor, not the configuration.
  const operatorEmail = process.env.OPERATOR_ALERT_EMAIL ?? 'solarsaiko@gmail.com'

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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  const supabase = createAdminClient()

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

  if (createUserError) {
    // A createUser failure is not evidence of a re-purchase. Anything other than
    // "this address is taken" is a transient fault, and swallowing it is how a
    // network blip during provisioning silently dropped a paying customer.
    if (!isEmailTakenError(createUserError)) {
      // Nothing has been written yet — the first DB write is the firms insert
      // below — so releasing the idempotency row is safe here and ONLY here.
      //
      // Without this the throw is theatre: the processed_stripe_events row is
      // inserted before dispatch (route.ts:57), so Stripe's retry would hit the
      // duplicate guard and return 200 without ever re-running this handler.
      // The insert itself stays exactly where it is; this is a compensating
      // delete on the one path where we know no provisioning occurred.
      //
      // Keyed by the Stripe EVENT id (evt_…), which is what route.ts:59 wrote.
      // session.id is the checkout session (cs_…) and would match no row, which
      // would leave the retry silently dead — the very failure this prevents.
      await supabase.from('processed_stripe_events').delete().eq('event_id', eventId)
      throw createUserError
    }

    const buyer = await resolveBuyer(supabase, email)

    switch (buyer.kind) {
      // Case 4 — an existing login that owns nothing and belongs to nothing
      // active. They are a legitimate new customer who simply already had an
      // account, so provision normally against the user they already have.
      case 'existing_user_no_firm':
        await provisionFirm(supabase, buyer.userId, session, sub, seats, periodEnd)
        return

      // Cases 1, 2 and 3 record the outcome and summon a human. The refusal
      // mechanics (cancelling the duplicate subscription) and the reactivation
      // path land in the next two commits; until then the conservative outcome
      // is correct — nothing is provisioned, nothing is destroyed, and the
      // operator gets an accurate account of what happened.
      case 'duplicate':
        await recordProvisioningFailure(supabase, session, email, 'duplicate')
        await alertOperator('⚠️ Stripe — duplicate purchase by an active firm owner', [
          `<strong>Customer email:</strong> ${email}`,
          `<strong>Existing firm:</strong> ${buyer.firmId} (active)`,
          `<strong>Firm's subscription (LEAVE ALONE):</strong> ${buyer.firmSubscriptionId ?? 'none on record'}`,
          `<strong>New duplicate subscription:</strong> ${session.subscription as string}`,
          `<strong>Checkout session:</strong> ${session.id}`,
          `<strong>Action:</strong> the duplicate subscription is still billing — cancel it in Stripe.`,
        ])
        return

      case 'returning':
        await recordProvisioningFailure(supabase, session, email, 'unresolved')
        await alertOperator('⚠️ Stripe — returning client needs manual reactivation', [
          `<strong>Customer email:</strong> ${email}`,
          `<strong>Dormant firm:</strong> ${buyer.firmId} (${buyer.firmStatus})`,
          `<strong>New subscription:</strong> ${session.subscription as string}`,
          `<strong>Checkout session:</strong> ${session.id}`,
          `<strong>Action:</strong> reactivate the firm and point it at the new customer and subscription.`,
        ])
        return

      case 'email_in_use':
        await recordProvisioningFailure(supabase, session, email, 'email_in_use')
        await alertOperator('⚠️ Stripe — buyer is staff at another active firm', [
          `<strong>Customer email:</strong> ${email}`,
          `<strong>Checkout session:</strong> ${session.id}`,
          `<strong>Subscription:</strong> ${session.subscription as string}`,
          `<strong>Action:</strong> nothing was provisioned and nothing was cancelled. They must buy with a different address.`,
        ])
        return

      case 'unresolved':
        await recordProvisioningFailure(supabase, session, email, 'unresolved')
        await alertOperator('🔴 Stripe — provisioning collision could not be resolved', [
          `<strong>Customer email:</strong> ${email}`,
          `<strong>Checkout session:</strong> ${session.id}`,
          `<strong>Subscription:</strong> ${session.subscription as string}`,
          `<strong>Error:</strong> ${createUserError.message}`,
          `<strong>Action:</strong> auth reported this address as registered but no user row matches it. Identity store and lookup disagree.`,
        ])
        return
    }
  }

  await provisionFirm(supabase, userData.user.id, session, sub, seats, periodEnd)
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
