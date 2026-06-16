import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  let customerId: string
  let email: string
  let seats: number

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription.items.data'],
    })

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ provisioned: false })
    }

    customerId = session.customer as string
    email = session.customer_details?.email ?? ''

    const sub = session.subscription as Stripe.Subscription | null
    seats = sub?.items?.data[0]?.quantity ?? 1
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: firm } = await supabase
    .from('firms')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!firm) {
    return NextResponse.json({ provisioned: false })
  }

  return NextResponse.json({ provisioned: true, email, seats, firmName: firm.name })
}
