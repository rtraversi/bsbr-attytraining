// =============================================================================
// POST /api/firm/verify-email — send (or re-send) a deliverability link.
//
// 🔴 NEVER FAILS THE REQUEST ON A SEND FAILURE. Resend returns 403 on every send
// today (ix-dnszoho). This route answers 200 with `sent: false` and the reason,
// so the dashboard can say something true rather than showing a red error the
// admin cannot act on. The token is minted either way — which is what makes
// `scripts/dev-auth.mjs verify-link` a real recovery path while mail is down.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { EmailVerificationEmail } from '@/emails/email-verification'
import { mintVerificationToken, VERIFICATION_RESEND_COOLDOWN_MS } from '@/lib/email-verification'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.app_metadata?.role as string | undefined
  const firmId = user.app_metadata?.firm_id as string | undefined
  if (role !== 'admin' || !firmId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let memberId: string
  try {
    const body = (await req.json()) as { memberId?: unknown }
    memberId = typeof body.memberId === 'string' ? body.memberId : ''
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 })

  const admin = createAdminClient()

  // Scoped to the caller's own firm. A member id is a uuid, but this is the
  // check that makes guessing one worthless.
  const { data: member } = await admin
    .from('firm_members')
    .select('id, user_id, email_verification_sent_at, email_verified_at')
    .eq('id', memberId)
    .eq('firm_id', firmId)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (member.email_verified_at) {
    return NextResponse.json({ ok: true, sent: false, reason: 'already_verified' })
  }

  const lastSent = member.email_verification_sent_at
    ? new Date(member.email_verification_sent_at).getTime()
    : 0
  if (Date.now() - lastSent < VERIFICATION_RESEND_COOLDOWN_MS) {
    return NextResponse.json({ ok: true, sent: false, reason: 'rate_limited' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const minted = await mintVerificationToken(admin, member.id, appUrl)
  if ('error' in minted) return NextResponse.json({ error: minted.error }, { status: 500 })

  const [{ data: authUser }, { data: firm }] = await Promise.all([
    admin.auth.admin.getUserById(member.user_id),
    admin.from('firms').select('name').eq('id', firmId).maybeSingle(),
  ])

  const to = authUser?.user?.email
  if (!to) return NextResponse.json({ ok: true, sent: false, reason: 'no_address' })

  try {
    const html = await render(
      EmailVerificationEmail({
        firmName: firm?.name ?? 'Your firm',
        recipientName: (authUser?.user?.user_metadata?.full_name as string | undefined) ?? null,
        actionLink: minted.link,
      }),
    )
    await sendEmail({ to, subject: 'Confirm your email address', html })
  } catch (err) {
    // The token is already on the row, so nothing is lost — the operator can
    // hand the person the link with `scripts/dev-auth.mjs verify-link`.
    console.error('[firm/verify-email] send failed:', err)
    return NextResponse.json({ ok: true, sent: false, reason: 'send_failed' })
  }

  return NextResponse.json({ ok: true, sent: true })
}
