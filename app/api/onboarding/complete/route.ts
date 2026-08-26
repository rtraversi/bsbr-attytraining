// =============================================================================
// POST /api/onboarding/complete — the buyer sets an email and a password.
//
// ── 🔴 NO MAGIC LINK, AND NO EMAIL IS SENT ON THIS PATH ─────────────────────
//
// This route used to generate a magic link and mail it. Two reasons it is gone,
// and the second one outlives the first:
//
//   1. It does not work. Resend has returned 403 for every send for a week
//      (ix-dnszoho), so the entire post-payment path is impassable today.
//   2. It is fragile even when mail works. A firm that has just been charged and
//      whose link lands in spam is stranded outside an account they have paid
//      for, with no route back in.
//
// The buyer sets a password here and is signed in from this same request. The
// whole path is now testable with email broken, which is the point.
//
// ── The security shape ──────────────────────────────────────────────────────
//
// 🔴 THE EMAIL FIELD CONFIRMS. IT DOES NOT CHOOSE.
//
// It is matched strictly against the Stripe session's own email and any
// mismatch is refused. This is not politeness about typos: the duplicate /
// email_in_use / provisioning_failures machinery from migrations 0018 and 0022
// ALL keys on the paying email. An editable address here bypasses every one of
// those guards at once — a buyer refused as email_in_use could simply type a
// different address and take the account anyway. Do not relax this into a
// "close enough" comparison.
//
// The Stripe session_id is the proof of purchase and is validated by retrieving
// the session. Onboarding is one-time and this consumes the session_id for that
// purpose: a firm whose admin row is already 'active' is refused.
//
// ── Email and password ONLY ─────────────────────────────────────────────────
//
// The firm name is question one of the intake and stays there — Katy,
// 2026-08-25 11:04: "I dont want the name part to move, I want the whole intake
// there." The firm row keeps its 'My Firm' placeholder until the intake
// promotes the real one, which nobody ever sees because the dashboard is gated
// on the intake being submitted.
// =============================================================================

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

const MIN_PASSWORD = 8

export async function POST(req: NextRequest) {
  let sessionId: string
  let email: string
  let password: string

  try {
    const body = (await req.json()) as { session_id?: unknown; email?: unknown; password?: unknown }
    sessionId = typeof body.session_id === 'string' ? body.session_id : ''
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!sessionId || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (password.length < MIN_PASSWORD) {
    return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD} characters.` }, { status: 400 })
  }

  let customerId: string
  let paidEmail: string

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'That payment is not complete.' }, { status: 402 })
    }
    customerId = session.customer as string
    paidEmail = (session.customer_details?.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
  }

  // 🔴 The confirm-not-choose check. See the header before changing this.
  if (!paidEmail || paidEmail !== email) {
    return NextResponse.json(
      { error: 'That is not the email address this purchase was made with.' },
      { status: 403 },
    )
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

  // One-time. The Stripe webhook creates the admin's firm_members row as
  // 'invited' and this route is the only thing that flips it to 'active', so
  // that column is an exact record of whether onboarding has already run.
  //
  // GoTrue exposes no "does this user have a password" flag, and inventing one
  // by attempting a sign-in would be worse — it would leak whether a password
  // exists to anyone holding a session_id.
  const { data: adminMember } = await supabase
    .from('firm_members')
    .select('id, status')
    .eq('firm_id', firm.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (adminMember?.status === 'active') {
    return NextResponse.json(
      { error: 'This account is already set up. Sign in with your email and password.' },
      { status: 409 },
    )
  }

  const { error: passwordError } = await supabase.auth.admin.updateUserById(firm.owner_id, {
    password,
    email_confirm: true,
  })

  if (passwordError) {
    console.error('[onboarding/complete] set password failed:', passwordError)
    return NextResponse.json({ error: 'Could not set that password. Please try another.' }, { status: 500 })
  }

  await supabase
    .from('firm_members')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('firm_id', firm.id)
    .eq('role', 'admin')

  // The stub course, get-or-create.
  //
  // This used to sit behind the "I am also taking this training" checkbox, which
  // has moved to the intake roster (the admin's own attorney answer decides
  // whether they occupy a seat). It is unconditional now because nothing else in
  // the codebase CREATES the course — app/api/firm/enroll-self and
  // lib/training/assessment both only read it — so making it conditional again
  // would leave a fresh environment with no course at all.
  const { data: course } = await supabase.from('courses').select('id').limit(1).maybeSingle()
  if (!course) {
    await supabase.from('courses').insert({
      title: 'IURIX — Annual Certification',
      description: "Training that holds your staff to your firm's written AI use policy.",
      cloudflare_stream_video_id: 'stub-not-yet-uploaded',
      pass_threshold: 80,
      is_published: true,
    })
  }

  // Sign them in from this request, so the browser leaves with a session and
  // lands on /intake logged in. This is what replaces the emailed link.
  const ssr = await createClient()
  const { error: signInError } = await ssr.auth.signInWithPassword({ email, password })

  if (signInError) {
    // The password IS set — they can sign in at /login. Reporting this as a
    // failure would be a lie that sends them round the loop again.
    console.error('[onboarding/complete] sign-in after set-password failed:', signInError)
    return NextResponse.json({ success: true, signedIn: false, next: '/login' })
  }

  return NextResponse.json({ success: true, signedIn: true, next: '/intake' })
}
