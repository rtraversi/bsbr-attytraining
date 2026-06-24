import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  const firmId = user.app_metadata?.firm_id as string | undefined
  if (!firmId) return NextResponse.redirect(new URL('/dashboard', req.url))

  const admin = createAdminClient()
  const { data: firm } = await admin
    .from('firms')
    .select('stripe_customer_id')
    .eq('id', firmId)
    .single()

  if (!firm?.stripe_customer_id) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: firm.stripe_customer_id,
    return_url: `${appUrl}/dashboard`,
  })

  return NextResponse.redirect(portalSession.url)
}
