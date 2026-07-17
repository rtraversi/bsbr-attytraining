import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'

// Temporary destination — Max's personal inbox until a real support address
// exists. Deliberately a literal constant (not a Worker secret): easier to
// find and swap when the real address lands.
const SUPPORT_INBOX = 'solarsaiko@gmail.com'

interface RequestBody {
  topic?: unknown
  subject?: unknown
  details?: unknown
}

function asTrimmedString(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s || s.length > max) return null
  return s
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: RequestBody
  try {
    body = (await req.json()) as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const topic = asTrimmedString(body.topic, 100)
  const subject = asTrimmedString(body.subject, 200)
  const details = asTrimmedString(body.details, 5000)
  if (!topic || !subject || !details) {
    return NextResponse.json(
      { error: 'Topic, subject, and details are all required.' },
      { status: 400 }
    )
  }

  // Submitter identity comes from the authenticated session, never from the
  // client payload — a support thread that trusts a typed-in email is spoofable.
  const submitterEmail = user.email ?? '(no email on account)'
  const firmId = (user.app_metadata?.firm_id as string | undefined) ?? '(none)'
  const role = (user.app_metadata?.role as string | undefined) ?? '(none)'

  const html = `
    <h2 style="margin:0 0 12px">Support request</h2>
    <table style="border-collapse:collapse;font-size:14px">
      <tr><td style="padding:2px 12px 2px 0;color:#8A8A8A">From</td><td>${escapeHtml(submitterEmail)}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#8A8A8A">Firm</td><td>${escapeHtml(firmId)}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#8A8A8A">Role</td><td>${escapeHtml(role)}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#8A8A8A">Topic</td><td>${escapeHtml(topic)}</td></tr>
      <tr><td style="padding:2px 12px 2px 0;color:#8A8A8A">Subject</td><td>${escapeHtml(subject)}</td></tr>
    </table>
    <p style="margin:16px 0 4px;color:#8A8A8A;font-size:14px">Details</p>
    <p style="margin:0;font-size:14px;white-space:pre-wrap">${escapeHtml(details)}</p>
  `

  if (process.env.NODE_ENV === 'development') {
    console.log('[dev] Support request:', { submitterEmail, topic, subject })
    return NextResponse.json({ ok: true })
  }

  // Unlike cert delivery (where email is a side effect), sending IS the whole
  // operation here — a failure must surface to the user, not be swallowed.
  try {
    await sendEmail({
      to: SUPPORT_INBOX,
      subject: `[Support] ${topic} — ${subject}`,
      html,
    })
  } catch (err) {
    console.error('[support/contact] send failed:', err)
    return NextResponse.json(
      { error: 'Could not send your request. Please try again.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
