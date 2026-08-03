import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { AutoRenewCancelledEmail } from '@/emails/auto-renew-cancelled'

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

function getPeriodEnd(sub: Stripe.Subscription): string | null {
  const ts = sub.items.data[0]?.current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}

/**
 * Turns auto-renewal on and off.
 *
 * ⚠ This uses `subscriptions.update({ cancel_at_period_end })` and MUST NOT be
 * changed to `subscriptions.cancel()`. The names are close; the outcomes are
 * not. `.cancel()` ends the subscription immediately and destroys access the
 * firm has already paid for — staff lose the training they are mid-way through
 * and the firm loses the remainder of a year it has been invoiced for.
 * `cancel_at_period_end` schedules the end at the boundary the firm has paid
 * through, leaves `status === 'active'` until then, and is reversible with one
 * call. That reversibility is the point: it is also the win-back path.
 */
export async function POST(req: NextRequest) {
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

  let enabled: boolean
  try {
    const body = (await req.json()) as { enabled?: unknown }
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }
    enabled = body.enabled
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: firm } = await admin
    .from('firms')
    .select('name, stripe_subscription_id')
    .eq('id', firmId)
    .single()

  if (!firm?.stripe_subscription_id) {
    return NextResponse.json(
      { error: 'This firm has no active subscription to change.' },
      { status: 409 }
    )
  }

  try {
    const sub = await getStripe().subscriptions.update(firm.stripe_subscription_id, {
      // Inverted on purpose: the API field describes CANCELLATION, the UI
      // switch describes RENEWAL. enabled=true means "keep renewing", which is
      // cancel_at_period_end=false.
      cancel_at_period_end: !enabled,
    })

    const periodEnd = getPeriodEnd(sub)

    // Deliberately does NOT write firms.status. Setting cancel_at_period_end
    // leaves the Stripe status 'active', and the firm genuinely is active until
    // the period ends — they paid for it. The flip to 'cancelled' belongs to
    // customer.subscription.deleted, which Stripe fires at the boundary and
    // handleSubscriptionUpdated/Deleted already handle correctly. Writing it
    // here would revoke access early, which is the same bug as calling
    // .cancel() just spelled differently.

    // Confirmation email on CANCEL only. Resuming is not destructive and a
    // receipt for it would be noise.
    //
    // A failed send must not fail the request: the change is already committed
    // at Stripe, so returning an error would tell the admin their cancellation
    // did not happen and invite them to repeat an action that already
    // succeeded. Logged instead. No operator alert — Rob stays out of normal
    // customer flows by design, and a cancellation is a normal flow.
    if (!enabled && user.email) {
      try {
        const html = await render(
          AutoRenewCancelledEmail({
            firmName: firm.name ?? 'Your firm',
            accessEndsAt: periodEnd,
          })
        )
        await sendEmail({
          to: user.email,
          subject: 'Auto-renewal is off — what happens next',
          html,
        })
      } catch (err) {
        console.error('[billing/auto-renew] confirmation email failed:', err)
      }
    }

    return NextResponse.json({
      autoRenew: !sub.cancel_at_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      /** The date access ends when auto-renewal is off; the renewal date when on. */
      currentPeriodEnd: periodEnd,
      status: sub.status,
    })
  } catch (err) {
    console.error('[billing/auto-renew] Stripe update failed:', err)
    return NextResponse.json({ error: 'Could not update auto-renewal' }, { status: 502 })
  }
}
