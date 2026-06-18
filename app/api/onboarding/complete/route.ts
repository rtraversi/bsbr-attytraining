import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { AdminMagicLinkEmail } from '@/emails/admin-magic-link'

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

export async function POST(req: NextRequest) {
  let sessionId: string
  let firmName: string

  let enrollSelf: boolean
  try {
    const body = (await req.json()) as { session_id?: unknown; firm_name?: unknown; enroll_self?: unknown }
    sessionId = typeof body.session_id === 'string' ? body.session_id : ''
    firmName = typeof body.firm_name === 'string' ? body.firm_name.trim() : ''
    enrollSelf = body.enroll_self === true
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!sessionId || !firmName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  let customerId: string
  let email: string

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
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

  if (enrollSelf) {
    // Get or create the stub course
    let { data: course } = await supabase
      .from('courses')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (!course) {
      const { data: newCourse } = await supabase
        .from('courses')
        .insert({
          title: 'AI Staff Compliance Training — Annual Certification',
          description: 'Certify your staff on proper AI use under ABA Model Rule 5.3.',
          cloudflare_stream_video_id: 'stub-not-yet-uploaded',
          pass_threshold: 80,
          is_published: true,
        })
        .select('id')
        .single()
      course = newCourse
    }

    if (course) {
      // Idempotent — skip if enrollment already exists
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', firm.owner_id)
        .eq('course_id', course.id)
        .maybeSingle()

      if (!existing) {
        await supabase.from('enrollments').insert({
          user_id: firm.owner_id,
          course_id: course.id,
          firm_id: firm.id,
          status: 'not_started',
        })

        // Consume one seat
        const { data: seat } = await supabase
          .from('seats')
          .select('used_seats')
          .eq('firm_id', firm.id)
          .single()

        if (seat) {
          await supabase
            .from('seats')
            .update({ used_seats: seat.used_seats + 1 })
            .eq('firm_id', firm.id)
        }
      }
    }
  }

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

  const hashedToken = linkData?.properties?.hashed_token
  const actionLink = hashedToken
    ? `${appUrl}/auth/confirm?token_hash=${hashedToken}&type=magiclink&next=/dashboard`
    : linkData?.properties?.action_link

  if (process.env.NODE_ENV === 'development') {
    console.log('[dev] Magic link for', email, '→', actionLink)
  } else {
    try {
      const html = await render(AdminMagicLinkEmail({ firmName, actionLink: actionLink ?? '' }))
      await sendEmail({
        to: email,
        subject: 'Your AI Staff Compliance account is ready',
        html,
      })
    } catch (err) {
      console.error('[onboarding/complete] sendEmail error:', err)
    }
  }

  return NextResponse.json({
    success: true,
    // Expose in dev so we can test without email delivery
    devLink: process.env.NODE_ENV === 'development' ? actionLink : undefined,
  })
}
