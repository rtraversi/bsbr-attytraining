/// <reference types="@cloudflare/workers-types" />

/**
 * cert-worker — Cloudflare Worker
 *
 * Crons:
 *   every 5 min  — drain cert_generation_queue via Next.js /api/certs/drain
 *   0 9 * * *   — expiry reminders (90/30/7 days) + inactivity reminders
 *                  + renewal reminders (30/14/3 days before current_period_end)
 *
 * Fetch:
 *   POST /  — Supabase Database Webhook: quiz_attempts INSERT with passed=true
 */

// ── Env ─────────────────────────────────────────────────────────────────────

export interface Env {
  WEBHOOK_SECRET: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_URL: string
  RESEND_API_KEY: string
  CERT_WEBHOOK_SECRET: string
  APP_URL: string
}

// ── Row types ────────────────────────────────────────────────────────────────

interface CertRow {
  id: string
  firm_id: string
  user_id: string
  expires_at: string
}

interface FirmRow {
  id: string
  name: string
  owner_id: string
  reminder_days: number
}

interface FirmRenewalRow {
  id: string
  name: string
  owner_id: string
  current_period_end: string
}

interface MemberRow {
  id: string
  user_id: string
  invited_at?: string
}

interface EnrollmentRow {
  user_id: string
  enrolled_at: string
}

interface TrainingEventRow {
  firm_member_id: string
  metadata: Record<string, unknown> | null
}

interface AuthUserRow {
  id: string
  email: string
  user_metadata: Record<string, unknown>
}

interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: {
    id: string
    firm_id: string
    enrollment_id: string
    user_id: string
    score: number
    passed: boolean
    answers: Record<string, unknown> | null
    attempted_at: string
  } | null
  old_record: Record<string, unknown> | null
}

// ── Supabase helpers ─────────────────────────────────────────────────────────

async function pgRest<T>(
  env: Env,
  method: string,
  path: string,
  body?: unknown,
): Promise<T | null> {
  const headers: Record<string, string> = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    headers['Prefer'] = 'return=minimal'
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    throw new Error(`pgRest ${method} ${path}: ${res.status} ${await res.text()}`)
  }

  if (method === 'GET') return res.json() as Promise<T>
  return null
}

async function authAdmin(env: Env, userId: string): Promise<AuthUserRow | null> {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) return null
  return res.json() as Promise<AuthUserRow>
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000)
}

function diffDays(dateStr: string, from: Date): number {
  return Math.round((new Date(dateStr).getTime() - from.getTime()) / 86_400_000)
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

// ── Email helpers ─────────────────────────────────────────────────────────────

const FROM = 'AI Staff Compliance <info@aistaffcompliance.com>'

async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

function expiryEmployeeHtml(name: string, days: number, dateStr: string, appUrl: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:14px">Hi ${name},</p>
<p style="font-size:14px">Your AI compliance training certificate <strong>expires in ${days} days</strong> — on ${dateStr}.</p>
<p style="font-size:14px">Renew your certification now to maintain your firm's compliance record under ABA Model Rule 5.3.</p>
<p><a href="${appUrl}/dashboard/training" style="display:inline-block;background:#14b8a6;color:#0f172a;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">Renew certification</a></p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">AI Staff Compliance Training — Built Smart by Rob</p>
</body></html>`
}

function expiryAdminHtml(empName: string, firmName: string, days: number, dateStr: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:14px"><strong>${empName}</strong>'s AI compliance training certificate for ${firmName} <strong>expires in ${days} days</strong> — on ${dateStr}.</p>
<p style="font-size:14px">They will need to re-certify to maintain your firm's Rule 5.3 compliance record. A reminder has been sent directly to ${empName}.</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">AI Staff Compliance Training — Built Smart by Rob</p>
</body></html>`
}

function inactivityHtml(name: string, firmName: string, appUrl: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:14px">Hi ${name},</p>
<p style="font-size:14px">${firmName} has enrolled you in AI compliance training. Please complete your training to earn your compliance certificate under ABA Model Rule 5.3.</p>
<p><a href="${appUrl}/dashboard/training" style="display:inline-block;background:#14b8a6;color:#0f172a;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">Complete training</a></p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">AI Staff Compliance Training — Built Smart by Rob</p>
</body></html>`
}

// ── Expiry reminders ─────────────────────────────────────────────────────────

const EXPIRY_BUCKETS = [90, 30, 7] as const

async function runExpiryReminders(env: Env): Promise<void> {
  const now = new Date()

  // Single query covering all three windows (6–91 days out)
  const floor   = addDays(now, 6).toISOString()
  const ceiling = addDays(now, 91).toISOString()

  const certs = await pgRest<CertRow[]>(
    env, 'GET',
    `/certificates?select=id,firm_id,user_id,expires_at&expires_at=gte.${encodeURIComponent(floor)}&expires_at=lte.${encodeURIComponent(ceiling)}`,
  ) ?? []

  if (certs.length === 0) return

  // Group by firm to batch admin + dedup-event lookups per firm
  const byFirm = new Map<string, CertRow[]>()
  for (const c of certs) {
    const arr = byFirm.get(c.firm_id) ?? []
    arr.push(c)
    byFirm.set(c.firm_id, arr)
  }

  for (const [firmId, firmCerts] of byFirm) {
    let firmData: FirmRow[], adminUser: AuthUserRow | null

    try {
      firmData = await pgRest<FirmRow[]>(
        env, 'GET',
        `/firms?select=id,name,owner_id,reminder_days&id=eq.${firmId}&limit=1`,
      ) ?? []
      if (!firmData[0]) continue
      adminUser = await authAdmin(env, firmData[0].owner_id)
    } catch (err) {
      console.error(`[expiry] firm lookup failed for ${firmId}:`, err)
      continue
    }

    const { name: firmName, owner_id: ownerId } = firmData[0]
    void ownerId // used above

    // Batch-fetch recent expiry events for this firm (last 8 days covers all buckets)
    const recentCutoff = addDays(now, -8).toISOString()
    const recentEvents = await pgRest<TrainingEventRow[]>(
      env, 'GET',
      `/training_events?select=firm_member_id,metadata&firm_id=eq.${firmId}&event_type=eq.expiry_reminder_sent&event_timestamp=gte.${encodeURIComponent(recentCutoff)}`,
    ) ?? []

    const alreadySent = new Set<string>()
    for (const e of recentEvents) {
      const m = e.metadata as { cert_id?: string; days_until_expiry?: number } | null
      if (m?.cert_id && m?.days_until_expiry) {
        alreadySent.add(`${m.cert_id}|${m.days_until_expiry}`)
      }
    }

    for (const cert of firmCerts) {
      const daysLeft = diffDays(cert.expires_at, now)
      const bucket = EXPIRY_BUCKETS.find(d => Math.abs(daysLeft - d) <= 1)
      if (!bucket) continue
      if (alreadySent.has(`${cert.id}|${bucket}`)) continue

      try {
        const empUser = await authAdmin(env, cert.user_id)
        if (!empUser?.email || empUser.email.endsWith('@redacted.invalid')) continue

        const empName = (empUser.user_metadata?.full_name as string | undefined) ?? empUser.email
        const dateStr = fmtDate(cert.expires_at)

        await sendEmail(
          env,
          empUser.email,
          `Your AI compliance certificate expires in ${bucket} days`,
          expiryEmployeeHtml(empName, bucket, dateStr, env.APP_URL),
        )

        if (adminUser?.email && adminUser.email !== empUser.email) {
          await sendEmail(
            env,
            adminUser.email,
            `${empName}'s AI compliance certificate expires in ${bucket} days`,
            expiryAdminHtml(empName, firmName, bucket, dateStr),
          )
        }

        // Resolve firm_member_id for the audit event
        const memberRows = await pgRest<MemberRow[]>(
          env, 'GET',
          `/firm_members?select=id&firm_id=eq.${firmId}&user_id=eq.${cert.user_id}&limit=1`,
        ) ?? []
        const firmMemberId = memberRows[0]?.id

        if (firmMemberId) {
          await pgRest(env, 'POST', '/training_events', {
            firm_id: firmId,
            firm_member_id: firmMemberId,
            event_type: 'expiry_reminder_sent',
            metadata: { cert_id: cert.id, days_until_expiry: bucket },
          })
        }
      } catch (err) {
        console.error(`[expiry] cert ${cert.id} bucket ${bucket}:`, err)
      }
    }
  }
}

// ── Inactivity reminders ─────────────────────────────────────────────────────

async function runInactivityReminders(env: Env): Promise<void> {
  const now = new Date()

  const firms = await pgRest<FirmRow[]>(
    env, 'GET',
    '/firms?select=id,name,owner_id,reminder_days&status=eq.active',
  ) ?? []

  for (const firm of firms) {
    const reminderDays = firm.reminder_days ?? 7
    const cutoff = addDays(now, -reminderDays).toISOString()

    try {
      // 1. Invited members who haven't logged in yet and invite is older than reminder_days
      const invitedMembers = await pgRest<MemberRow[]>(
        env, 'GET',
        `/firm_members?select=id,user_id,invited_at&firm_id=eq.${firm.id}&status=eq.invited&invited_at=lte.${encodeURIComponent(cutoff)}`,
      ) ?? []

      // 2. Enrolled-but-not-passed members whose enrollment is older than reminder_days
      const stalledEnrollments = await pgRest<EnrollmentRow[]>(
        env, 'GET',
        `/enrollments?select=user_id,enrolled_at&firm_id=eq.${firm.id}&status=in.(not_started,in_progress)&enrolled_at=lte.${encodeURIComponent(cutoff)}`,
      ) ?? []

      // Merge by user_id — invited takes priority as the firm_member_id source
      const targets = new Map<string, { firmMemberId: string }>()

      for (const m of invitedMembers) {
        targets.set(m.user_id, { firmMemberId: m.id })
      }

      for (const e of stalledEnrollments) {
        if (!targets.has(e.user_id)) {
          const memberRows = await pgRest<MemberRow[]>(
            env, 'GET',
            `/firm_members?select=id&firm_id=eq.${firm.id}&user_id=eq.${e.user_id}&status=not.in.(deleted,reassigned)&limit=1`,
          ) ?? []
          if (memberRows[0]) {
            targets.set(e.user_id, { firmMemberId: memberRows[0].id })
          }
        }
      }

      if (targets.size === 0) continue

      // Batch-fetch recent inactivity events for this firm
      const recentCutoff = addDays(now, -reminderDays).toISOString()
      const recentEvents = await pgRest<TrainingEventRow[]>(
        env, 'GET',
        `/training_events?select=firm_member_id&firm_id=eq.${firm.id}&event_type=eq.inactivity_reminder_sent&event_timestamp=gte.${encodeURIComponent(recentCutoff)}`,
      ) ?? []

      const recentlySent = new Set(recentEvents.map(e => e.firm_member_id))

      for (const [userId, { firmMemberId }] of targets) {
        if (recentlySent.has(firmMemberId)) continue

        try {
          const empUser = await authAdmin(env, userId)
          if (!empUser?.email || empUser.email.endsWith('@redacted.invalid')) continue

          const empName = (empUser.user_metadata?.full_name as string | undefined) ?? empUser.email

          await sendEmail(
            env,
            empUser.email,
            'Reminder: Complete your AI compliance training',
            inactivityHtml(empName, firm.name, env.APP_URL),
          )

          await pgRest(env, 'POST', '/training_events', {
            firm_id: firm.id,
            firm_member_id: firmMemberId,
            event_type: 'inactivity_reminder_sent',
            metadata: { reminder_days: reminderDays },
          })
        } catch (err) {
          console.error(`[inactivity] user ${userId} firm ${firm.id}:`, err)
        }
      }
    } catch (err) {
      console.error(`[inactivity] firm ${firm.id}:`, err)
    }
  }
}

// ── Renewal reminders ─────────────────────────────────────────────────────────

const RENEWAL_BUCKETS = [30, 14, 3] as const

function renewalReminderHtml(
  firmName: string,
  days: number,
  renewalDate: string,
  certified: number,
  pending: number,
  total: number,
  appUrl: string,
): string {
  const statusRows = [
    `<tr><td style="padding:6px 0;font-size:14px">Staff with valid certificate</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${certified} of ${total}</td></tr>`,
    `<tr><td style="padding:6px 0;font-size:14px">Still need to complete training</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right;color:${pending > 0 ? '#b45309' : '#15803d'}">${pending}</td></tr>`,
  ].join('')

  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:14px">Hi ${firmName} Admin,</p>
<p style="font-size:14px">Your AI compliance training subscription <strong>renews in ${days} days</strong> — on ${renewalDate}. Here's a quick look at where your team stands:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">${statusRows}</table>
${pending > 0 ? `<p style="font-size:14px">You have <strong>${pending} staff member${pending !== 1 ? 's' : ''}</strong> who ${pending !== 1 ? 'have' : 'has'} not yet completed this year's training. Reach out to them before your renewal date to close out your firm's Rule 5.3 compliance record.</p>` : `<p style="font-size:14px">Great news — all of your staff have completed their training for this certification period.</p>`}
<p><a href="${appUrl}/dashboard" style="display:inline-block;background:#14b8a6;color:#0f172a;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">View dashboard &amp; manage subscription</a></p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">AI Staff Compliance Training — Built Smart by Rob<br>To manage your subscription or update your billing details, click the button above and select "Manage Subscription" from your dashboard.</p>
</body></html>`
}

async function runRenewalReminders(env: Env): Promise<void> {
  const now = new Date()

  // Single query covering all three buckets (2–31 days before renewal)
  const floor   = addDays(now, 2).toISOString()
  const ceiling = addDays(now, 31).toISOString()

  const firms = await pgRest<FirmRenewalRow[]>(
    env, 'GET',
    `/firms?select=id,name,owner_id,current_period_end&status=eq.active&current_period_end=gte.${encodeURIComponent(floor)}&current_period_end=lte.${encodeURIComponent(ceiling)}`,
  ) ?? []

  if (firms.length === 0) return

  for (const firm of firms) {
    const daysRemaining = diffDays(firm.current_period_end, now)
    const bucket = RENEWAL_BUCKETS.find(d => Math.abs(daysRemaining - d) <= 1)
    if (!bucket) continue

    try {
      // Dedup: skip if we already sent this bucket for this firm in the last 24h
      const cutoff24h = addDays(now, -1).toISOString()
      const recentEvents = await pgRest<{ metadata: Record<string, unknown> | null }[]>(
        env, 'GET',
        `/training_events?select=metadata&firm_id=eq.${firm.id}&event_type=eq.renewal_reminder_sent&event_timestamp=gte.${encodeURIComponent(cutoff24h)}`,
      ) ?? []

      const alreadySent = recentEvents.some(e => {
        const m = e.metadata as { days_remaining?: number } | null
        return m?.days_remaining === bucket
      })
      if (alreadySent) continue

      // Owner's auth record (email + name)
      const adminUser = await authAdmin(env, firm.owner_id)
      if (!adminUser?.email || adminUser.email.endsWith('@redacted.invalid')) continue

      // Owner's firm_member_id (needed for the training_events NOT NULL FK)
      const memberRows = await pgRest<MemberRow[]>(
        env, 'GET',
        `/firm_members?select=id&firm_id=eq.${firm.id}&user_id=eq.${firm.owner_id}&limit=1`,
      ) ?? []
      const firmMemberId = memberRows[0]?.id
      if (!firmMemberId) continue

      // Cert status summary: active certs vs total non-deactivated members
      const [allMembers, activeCerts] = await Promise.all([
        pgRest<{ id: string }[]>(
          env, 'GET',
          `/firm_members?select=id,user_id&firm_id=eq.${firm.id}&status=neq.deactivated`,
        ),
        pgRest<{ user_id: string }[]>(
          env, 'GET',
          `/certificates?select=user_id&firm_id=eq.${firm.id}&expires_at=gte.${encodeURIComponent(now.toISOString())}`,
        ),
      ])

      const total = allMembers?.length ?? 0
      const certifiedUserIds = new Set((activeCerts ?? []).map(c => c.user_id))
      const certified = certifiedUserIds.size
      const pending = Math.max(0, total - certified)

      await sendEmail(
        env,
        adminUser.email,
        `Your AI compliance training renews in ${bucket} days — ${certified} of ${total} staff certified`,
        renewalReminderHtml(firm.name, bucket, fmtDate(firm.current_period_end), certified, pending, total, env.APP_URL),
      )

      await pgRest(env, 'POST', '/training_events', {
        firm_id: firm.id,
        firm_member_id: firmMemberId,
        event_type: 'renewal_reminder_sent',
        metadata: { days_remaining: bucket },
      })
    } catch (err) {
      console.error(`[renewal] firm ${firm.id} bucket ${bucket}:`, err)
    }
  }
}

// ── Worker export ─────────────────────────────────────────────────────────────

export default {
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    if (event.cron === '0 9 * * *') {
      // Daily reminders — run both jobs; failures in one don't block the other
      ctx.waitUntil(
        Promise.all([
          runExpiryReminders(env).catch(err => console.error('[scheduled] expiry reminders:', err)),
          runInactivityReminders(env).catch(err => console.error('[scheduled] inactivity reminders:', err)),
          runRenewalReminders(env).catch(err => console.error('[scheduled] renewal reminders:', err)),
        ]),
      )
    } else {
      // */5 * * * * — cert generation queue drain
      ctx.waitUntil(
        fetch(`${env.APP_URL}/api/certs/drain`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-webhook-secret': env.CERT_WEBHOOK_SECRET,
          },
        }),
      )
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const incomingSecret = request.headers.get('X-Webhook-Secret')
    if (!incomingSecret || incomingSecret !== env.WEBHOOK_SECRET) {
      return new Response('Unauthorized', { status: 401 })
    }

    let payload: SupabaseWebhookPayload
    try {
      payload = (await request.json()) as SupabaseWebhookPayload
    } catch {
      return new Response('Bad Request: invalid JSON', { status: 400 })
    }

    if (
      payload.type !== 'INSERT' ||
      payload.table !== 'quiz_attempts' ||
      !payload.record?.passed
    ) {
      return new Response('OK', { status: 200 })
    }

    const { id: attemptId, firm_id, enrollment_id, user_id, score } = payload.record

    try {
      // TODO: implement full cert generation pipeline
      // 1. Fetch enrollment + user + firm from Supabase (service role)
      // 2. Generate certificate PDF with pdf-lib
      // 3. Upload PDF to Supabase Storage at firms/{firm_id}/employees/{user_id}/{enrollment_id}.pdf
      // 4. Insert into public.certificates
      // 5. Send certificate email via Resend REST API
      void { attemptId, firm_id, enrollment_id, user_id, score }

      return new Response('OK', { status: 200 })
    } catch (err) {
      console.error('cert-worker fetch error:', err)
      return new Response('Internal Server Error', { status: 500 })
    }
  },
} satisfies ExportedHandler<Env>
