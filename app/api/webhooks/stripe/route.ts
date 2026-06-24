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
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
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

// ─── checkout.session.completed — provision new firm ─────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
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
    // Email already registered — re-purchase edge case, not handled in v1
    console.warn(`[stripe-webhook] createUser skipped for ${email}: ${createUserError.message}`)
    return
  }

  const userId = userData.user.id

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
<p style="font-size:12px;color:#6b7280">AI Staff Compliance Training — Built Smart by Rob</p>
</body></html>`,
        })
      } catch (err) {
        console.error(`[renewal] notification email failed for ${member.user_id}:`, err)
      }
    }
  })
}
