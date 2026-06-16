import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

export async function POST(req: NextRequest) {
  let sessionId: string
  let firmName: string

  try {
    const body = (await req.json()) as { session_id?: unknown; firm_name?: unknown }
    sessionId = typeof body.session_id === 'string' ? body.session_id : ''
    firmName = typeof body.firm_name === 'string' ? body.firm_name.trim() : ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!sessionId || !firmName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  let customerId: string
  let email: string

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    customerId = session.customer as string
    email = session.customer_details?.email ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: firm } = await supabase
    .from('firms')
    .select('id, owner_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!firm) {
    return NextResponse.json({ error: 'Firm not found — has the payment webhook fired yet?' }, { status: 404 })
  }

  await supabase.from('firms').update({ name: firmName }).eq('id', firm.id)

  await supabase
    .from('firm_members')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('firm_id', firm.id)
    .eq('role', 'admin')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/auth/callback?next=/dashboard` },
  })

  if (linkError) {
    console.error('[onboarding/complete] generateLink error:', linkError)
    return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 })
  }

  const actionLink = linkData?.properties?.action_link

  // TODO: send actionLink via Resend (wired in email task)
  if (process.env.NODE_ENV === 'development') {
    console.log('[dev] Magic link for', email, '→', actionLink)
  }

  return NextResponse.json({
    success: true,
    // Expose in dev so we can test without email delivery
    devLink: process.env.NODE_ENV === 'development' ? actionLink : undefined,
  })
}
