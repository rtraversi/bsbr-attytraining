import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureEnrollment } from '@/lib/enrollments'
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
    // The admin opted into training, so they now occupy a seat. The
    // sync_used_seats trigger fires exactly one +1 on the false -> true
    // transition; re-running onboarding is a no-op because true -> true is
    // occupying -> occupying. If enrollSelf is false this stays false and the
    // firm is not billed a seat for an admin who never trains.
    await supabase
      .from('firm_members')
      .update({ occupies_seat: true })
      .eq('firm_id', firm.id)
      .eq('role', 'admin')

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
          title: 'IURIX — Annual Certification',
          description: "Training that holds your staff to your firm's written AI use policy.",
          cloudflare_stream_video_id: 'stub-not-yet-uploaded',
          pass_threshold: 80,
          is_published: true,
        })
        .select('id')
        .single()
      course = newCourse
    }

    if (course) {
      // Idempotent — skips only when an enrollment exists for the CURRENT term.
      //
      // ix-maybesingle: this was a bare `.eq(user_id).eq(course_id)
      // .maybeSingle()` with the error discarded, so on a renewed account it
      // read null and inserted a duplicate — exactly what it was written to
      // prevent. See lib/enrollments.ts.
      const result = await ensureEnrollment(
        supabase,
        { userId: firm.owner_id, courseId: course.id, firmId: firm.id },
        'not_started'
      )

      if (result.outcome === 'error') {
        console.error('[onboarding/complete] enrollment get-or-create failed:', result.error)
      }
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${appUrl}/auth/callback?next=/update-password` },
  })

  if (linkError) {
    console.error('[onboarding/complete] generateLink error:', linkError)
    return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 })
  }

  const hashedToken = linkData?.properties?.hashed_token
  const actionLink = hashedToken
    ? `${appUrl}/auth/confirm?token_hash=${hashedToken}&type=magiclink&next=/update-password`
    : linkData?.properties?.action_link

  try {
    const html = await render(AdminMagicLinkEmail({ firmName, actionLink: actionLink ?? '' }))
    await sendEmail({
      to: email,
      subject: 'Your IURIX account is ready',
      html,
    })
  } catch (err) {
    console.error('[onboarding/complete] sendEmail error:', err)
  }

  return NextResponse.json({ success: true })
}
