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

    // Defense in depth for queue rows created before the certificate rule, or
    // by a future writer that misses the assessment-layer guard.
    const { data: member } = await admin
      .from('firm_members')
      .select('is_attorney')
      .eq('firm_id', queue.firm_id)
      .eq('user_id', enrollment.user_id)
      .maybeSingle()
    if (member?.is_attorney === true) {
      await admin
        .from('cert_generation_queue')
        .update({ status: 'succeeded', last_error: 'Certificate ineligible: attorney' })
        .eq('id', queue.id)
      return NextResponse.json({ ok: true, skipped: 'attorney_ineligible' })
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

    // ── Certificate number — unique constraint guarantees global uniqueness ──────
    // (This comment used to say "DB sequence". 0014 replaced the sequence with a
    // random 4-digit tail plus a retry loop; the unique index is now the actual
    // guarantee, and the loop only keeps the insert from failing in practice.)
    const { data: certNumberRaw, error: seqErr } = await admin.rpc('generate_certificate_number')
    if (seqErr || !certNumberRaw) throw new Error('Failed to generate certificate number')
    const certNumber = certNumberRaw as string

    // ── Verification token ───────────────────────────────────────────────────────
    // Generated here rather than left to the column default, because the PDF's
    // QR code has to encode the SAME value the row is written with. Letting the
    // database mint it during the insert would mean the PDF was already printed
    // and uploaded before the token existed.
    //
    // 16 bytes = 128 bits, hex, matching generate_verification_token(). Web
    // Crypto is available in both the Worker and Node, so no import is needed.
    const tokenBytes = new Uint8Array(16)
    crypto.getRandomValues(tokenBytes)
    const verificationToken = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, '0')).join('')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const verifyUrl = `${appUrl}/verify/${verificationToken}`

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
      verifyUrl,
    })

    // ── Upload to Supabase Storage ────────────────────────────────────────────────
    const storagePath = `firms/${queue.firm_id}/employees/${enrollment.user_id}/${queue.enrollment_id}.pdf`

    const { error: uploadErr } = await admin.storage
      .from('certificates')
      .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`)

    // ── Insert certificates row ──────────────────────────────────────────────────
    // holder_name / firm_name are snapshots taken now, on purpose (0020). They
    // are what the public /verify page reads, so verification reflects what the
    // PDF actually says rather than whatever the profile says later.
    //
    // holder_name is NOT the `employeeName` used for the PDF: that one falls
    // back to the email address when no full_name is set, which is fine on a
    // private document sent to its own subject and unacceptable on a public
    // endpoint. A holder with no recorded name verifies as having none.
    const holderName = (authResult.data?.user?.user_metadata?.full_name as string | undefined)?.trim() || null

    const { error: certInsertErr } = await admin.from('certificates').insert({
      firm_id:            queue.firm_id,
      user_id:            enrollment.user_id,
      enrollment_id:      queue.enrollment_id,
      certificate_number: certNumber,
      storage_path:       storagePath,
      issued_at:          new Date().toISOString(),
      expires_at:         expiresAt.toISOString(),
      holder_name:        holderName,
      firm_name:          firmResult.data?.name ?? null,
      verification_token: verificationToken,
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
            employeeName,
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
