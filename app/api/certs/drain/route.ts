import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'

const OPERATOR_EMAIL = 'rob@builtsmartbyrob.com'
const MAX_ATTEMPTS = 3

export async function POST(req: NextRequest) {
  const incomingSecret = req.headers.get('x-webhook-secret')
  if (!incomingSecret || incomingSecret !== process.env.CERT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // --- Re-try failed rows that are past their backoff window ---
  const { data: retryRows } = await admin
    .from('cert_generation_queue')
    .select('id, firm_id, enrollment_id, quiz_attempt_id, attempt_count')
    .eq('status', 'failed')
    .lt('attempt_count', MAX_ATTEMPTS)
    .lte('next_retry_at', new Date().toISOString())

  let retried = 0
  for (const row of retryRows ?? []) {
    // Reset to pending (guarded: only if still 'failed' to avoid races)
    const { data: reset } = await admin
      .from('cert_generation_queue')
      .update({ status: 'pending' })
      .eq('id', row.id)
      .eq('status', 'failed')
      .select('id')

    if (!reset || reset.length === 0) continue

    // Re-fire the same webhook payload the generate route expects
    fetch(`${appUrl}/api/certs/generate`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': process.env.CERT_WEBHOOK_SECRET ?? '',
      },
      body: JSON.stringify({
        type: 'INSERT',
        table: 'cert_generation_queue',
        record: {
          id: row.id,
          firm_id: row.firm_id,
          enrollment_id: row.enrollment_id,
          quiz_attempt_id: row.quiz_attempt_id,
          status: 'pending',
          attempt_count: row.attempt_count,
        },
      }),
    }).catch(() => {
      // Non-fatal: row stays as 'failed', next drain will retry
    })

    retried++
  }

  // --- Alert operator on exhausted rows (attempt_count >= MAX_ATTEMPTS) ---
  const { data: alertRows } = await admin
    .from('cert_generation_queue')
    .select('id, enrollment_id, last_error')
    .eq('status', 'failed')
    .gte('attempt_count', MAX_ATTEMPTS)

  let alerted = 0
  for (const row of alertRows ?? []) {
    await admin
      .from('cert_generation_queue')
      .update({ status: 'alerted' })
      .eq('id', row.id)

    try {
      await sendEmail({
        to: OPERATOR_EMAIL,
        subject: 'ACTION REQUIRED: Certificate generation failed 3 times',
        html: `
          <p>Certificate generation has failed <strong>${MAX_ATTEMPTS} times</strong> and will not be retried automatically.</p>
          <p><strong>Enrollment ID:</strong> ${row.enrollment_id}</p>
          <p><strong>Queue row ID:</strong> ${row.id}</p>
          <p><strong>Last error:</strong> ${row.last_error ?? 'unknown'}</p>
          <p>Log into the Supabase dashboard and check the <code>cert_generation_queue</code> table to investigate.</p>
        `,
      })
    } catch {
      // Email failure doesn't undo the status flip — row won't be re-alerted
    }

    alerted++
  }

  return NextResponse.json({ ok: true, retried, alerted })
}
