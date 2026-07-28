import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/resend'
import { CertDeliveryEmail } from '@/emails/cert-delivery'
import { CertEarnedAdminEmail } from '@/emails/cert-earned-admin'
import { generateCertPdf } from '@/lib/cert-pdf'

interface QueueRecord {
  id: string
  firm_id: string
  enrollment_id: string
  quiz_attempt_id: string
  status: string
  attempt_count: number
}

interface WebhookPayload {
  type: string
  table: string
  record: QueueRecord
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export async function POST(req: NextRequest) {
  // Validate shared secret — Supabase sends this in every webhook request
  const incomingSecret = req.headers.get('x-webhook-secret')
  if (!incomingSecret || incomingSecret !== process.env.CERT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = (await req.json()) as WebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Only process INSERT events on the queue table
  if (payload.type !== 'INSERT' || !payload.record) {
    return NextResponse.json({ ok: true })
  }

  const queue = payload.record
  const admin = createAdminClient()

  // Claim the job: atomically flip status pending → processing.
  // If another invocation already claimed it, the .eq('status','pending') condition
  // fails and data comes back empty — we bail out to avoid double-processing.
  const { data: claimed } = await admin
    .from('cert_generation_queue')
    .update({ status: 'processing', attempt_count: queue.attempt_count + 1 })
    .eq('id', queue.id)
    .eq('status', 'pending')
    .select('id')

  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'already_claimed' })
  }

  try {
    // ── Idempotency ─────────────────────────────────────────────────────────────
    const { data: existing } = await admin
      .from('certificates')
      .select('id')
      .eq('enrollment_id', queue.enrollment_id)
      .maybeSingle()

    if (existing) {
      await admin
        .from('cert_generation_queue')
        .update({ status: 'succeeded' })
        .eq('id', queue.id)
      return NextResponse.json({ ok: true, skipped: 'already_exists' })
    }

    // ── Fetch all data needed for the cert ──────────────────────────────────────
    const { data: enrollment, error: enrollErr } = await admin
      .from('enrollments')
      .select('user_id, course_id, completed_at')
      .eq('id', queue.enrollment_id)
      .single()

    if (enrollErr || !enrollment) {
      throw new Error(`Enrollment not found: ${queue.enrollment_id}`)
    }

    const [firmResult, courseResult, authResult, attemptResult] = await Promise.all([
      admin.from('firms').select('name, owner_id, notify_cert_earned').eq('id', queue.firm_id).single(),
      admin.from('courses').select('title').eq('id', enrollment.course_id).single(),
      admin.auth.admin.getUserById(enrollment.user_id),
      admin.from('quiz_attempts').select('score').eq('id', queue.quiz_attempt_id).single(),
    ])

    const firmName      = firmResult.data?.name   ?? 'Unknown Firm'
    const courseTitle   = courseResult.data?.title ?? 'Responsible Use of AI within the Legal Industry'
    const employeeEmail = authResult.data?.user?.email ?? 'Unknown'
    const employeeName  =
      (authResult.data?.user?.user_metadata?.full_name as string | undefined) || employeeEmail
    // quiz_attempts.score is `int not null check (score between 0 and 100)`, so the
    // fallback only covers the row being unreadable, not a genuinely absent score.
    const score         = attemptResult.data?.score ?? 0

    // ── Certificate number — DB sequence guarantees global uniqueness ────────────
    const { data: certNumberRaw, error: seqErr } = await admin.rpc('generate_certificate_number')
    if (seqErr || !certNumberRaw) throw new Error('Failed to generate certificate number')
    const certNumber = certNumberRaw as string

    // ── Date math ────────────────────────────────────────────────────────────────
    const completedAt = enrollment.completed_at
      ? new Date(enrollment.completed_at)
      : new Date()
    const expiresAt = new Date(completedAt)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // ── Generate PDF ─────────────────────────────────────────────────────────────
    const pdfBytes = await generateCertPdf({
      employeeName,
      employeeEmail,
      firmName,
      courseTitle,
      certNumber,
      score,
      completedAt,
      expiresAt,
    })

    // ── Upload to Supabase Storage ────────────────────────────────────────────────
    const storagePath = `firms/${queue.firm_id}/employees/${enrollment.user_id}/${queue.enrollment_id}.pdf`

    const { error: uploadErr } = await admin.storage
      .from('certificates')
      .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`)

    // ── Insert certificates row ──────────────────────────────────────────────────
    const { error: certInsertErr } = await admin.from('certificates').insert({
      firm_id:            queue.firm_id,
      user_id:            enrollment.user_id,
      enrollment_id:      queue.enrollment_id,
      certificate_number: certNumber,
      storage_path:       storagePath,
      issued_at:          new Date().toISOString(),
      expires_at:         expiresAt.toISOString(),
    })

    if (certInsertErr) throw new Error(`Certificate insert failed: ${certInsertErr.message}`)

    // ── Mark queue row done ──────────────────────────────────────────────────────
    await admin
      .from('cert_generation_queue')
      .update({ status: 'succeeded' })
      .eq('id', queue.id)

    // ── Email cert to employee ────────────────────────────────────────────────────
    const { data: signedUrlData } = await admin.storage
      .from('certificates')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7) // 7-day link

    const certUrl = signedUrlData?.signedUrl ?? ''

    if (process.env.NODE_ENV === 'development') {
      console.log('[dev] Cert generated:', certNumber, '| signed URL:', certUrl)
    } else {
      try {
        const html = await render(
          CertDeliveryEmail({
            employeeName: employeeEmail,
            firmName,
            certUrl,
            validUntil: formatDate(expiresAt),
          })
        )
        await sendEmail({
          to: employeeEmail,
          subject: 'Your IURIX certificate is ready',
          html,
        })
      } catch (emailErr) {
        // Non-fatal — cert is in Storage; employee can get a reprint from their dashboard
        console.error('[certs/generate] email send failed:', emailErr)
      }
    }

    // ── Notify the firm admin (opt-out via Settings → Notifications) ────────────────
    if (firmResult.data?.notify_cert_earned && firmResult.data.owner_id) {
      try {
        const ownerResult = await admin.auth.admin.getUserById(firmResult.data.owner_id)
        const ownerEmail = ownerResult.data?.user?.email

        if (ownerEmail && ownerEmail !== employeeEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
          if (process.env.NODE_ENV === 'development') {
            console.log('[dev] Admin cert-earned notification would send to:', ownerEmail)
          } else {
            const adminHtml = await render(
              CertEarnedAdminEmail({
                employeeName,
                firmName,
                dashboardUrl: `${appUrl}/dashboard`,
              })
            )
            await sendEmail({
              to: ownerEmail,
              subject: `${employeeName} earned their IURIX certificate`,
              html: adminHtml,
            })
          }
        }
      } catch (adminEmailErr) {
        // Non-fatal — same reasoning as the employee email above
        console.error('[certs/generate] admin notification failed:', adminEmailErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[certs/generate] pipeline failed:', message)

    // Park the job as failed — the future cron drain will retry with exponential backoff
    await admin
      .from('cert_generation_queue')
      .update({
        status:        'failed',
        last_error:    message,
        next_retry_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .eq('id', queue.id)

    // Return 200 — Supabase retries webhooks on 5xx, not on 200.
    // We own retry logic via the queue table, not via webhook retry.
    return NextResponse.json({ ok: true, error: message })
  }
}
