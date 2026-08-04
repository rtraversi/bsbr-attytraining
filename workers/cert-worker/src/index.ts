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
  /** Reconciliation only. Read-only usage — this job never mutates Stripe. */
  STRIPE_SECRET_KEY: string
  /** Where reconciliation findings go. Same address the app's webhook alerts use. */
  OPERATOR_ALERT_EMAIL: string
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
  /** Optional because only runExpiryReminders selects it — runInactivityReminders
   *  filters on status=eq.active instead and never reads the column back. */
  status?: string
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

// iurixaccreditation.com is verified in Resend (Rob, 2026-07-29) — DKIM, SPF and
// DMARC all confirmed live. noreply@ is deliberate: the zone has no inbound MX,
// so replies would bounce; don't imply a reply is possible. Must stay in sync
// with FROM_ADDRESS in lib/resend.ts — this is a duplicate, not a shared import.
const FROM = 'IURIX <noreply@iurixaccreditation.com>'

/**
 * Split a recipient value into the array Resend expects. Must stay in step with
 * parseRecipients in lib/resend.ts — this is a duplicate, not a shared import,
 * because the worker builds independently of the app.
 *
 * The previous `[to]` was already an array, which is why this looked correct:
 * but a value holding several addresses became ONE malformed entry
 * ("a@x.com, b@y.com") rather than two recipients, and Resend rejects it. That
 * is what stopped OPERATOR_ALERT_EMAIL from holding a list.
 */
function parseRecipients(to: string): string[] {
  return to
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean)
}

async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<void> {
  const recipients = parseRecipients(to)
  // Thrown, not skipped. Every caller in this file is inside a cron job whose
  // failures are logged; a silent no-send would make an unset or malformed
  // secret indistinguishable from a healthy run with nothing to report.
  if (recipients.length === 0) throw new Error('sendEmail: no valid recipients')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: recipients, subject, html }),
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
<p style="font-size:12px;color:#6b7280">IURIX</p>
</body></html>`
}

function expiryAdminHtml(empName: string, firmName: string, days: number, dateStr: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:14px"><strong>${empName}</strong>'s AI compliance training certificate for ${firmName} <strong>expires in ${days} days</strong> — on ${dateStr}.</p>
<p style="font-size:14px">They will need to re-certify to maintain your firm's Rule 5.3 compliance record. A reminder has been sent directly to ${empName}.</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">IURIX</p>
</body></html>`
}

// The lapsed-firm variant of the above. Two things differ, both deliberate.
//
// It does NOT say "a reminder has been sent to <name>" — on this path the
// employee is not emailed at all, because a lapsed firm's staff cannot sign in.
// Claiming otherwise would be false.
//
// ⚠ It must NOT link to checkout. The win-back destination is blocked on
// ix-doublebill: a returning customer whose email already has an account gets
// charged and provisioned nothing. Until that is fixed, the only safe
// destination is the existing Stripe portal, which is where an existing
// customer's subscription actually lives. Do not "improve" this into a
// checkout CTA before ix-doublebill lands.
function expiryAdminLapsedHtml(
  empName: string,
  firmName: string,
  days: number,
  dateStr: string,
  appUrl: string,
): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:14px"><strong>${empName}</strong>'s AI compliance training certificate for ${firmName} <strong>expires in ${days} days</strong> — on ${dateStr}.</p>
<p style="font-size:14px">Your IURIX subscription is not currently active, so ${empName} cannot re-certify and your firm's Rule 5.3 record will not be renewed.</p>
<p style="font-size:14px">You can review your subscription and billing details in the customer portal.</p>
<p><a href="${appUrl}/api/portal" style="display:inline-block;background:#14b8a6;color:#0f172a;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">Manage subscription</a></p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">IURIX</p>
</body></html>`
}

// The cron's inactivity reminder. This is a SECOND copy of the reminder wording
// — emails/training-reminder.tsx carries the app-side one (the admin's manual
// "Remind" button). The two must stay in sync; they are worded from the same
// approved line (Max, 2026-07-30).
//
// Framing is deliberate: accreditation is all-or-none (Katy's legal read), so
// this states the consequence for the FIRM rather than nagging the individual.
// Nothing here should imply one person finishing is sufficient.
function inactivityHtml(name: string, firmName: string, appUrl: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:14px">Hi ${name},</p>
<p style="font-size:14px"><strong>Your firm can't be certified until everyone completes their training.</strong></p>
<p style="font-size:14px">${firmName} can't be certified under ABA Model Rule 5.3 until every member of the firm has completed their training — and yours is still to do.</p>
<p><a href="${appUrl}/dashboard/training" style="display:inline-block;background:#14b8a6;color:#0f172a;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">Complete training</a></p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">IURIX</p>
</body></html>`
}

// ── Expiry reminders ─────────────────────────────────────────────────────────

// Active firms get the full runway. A firm that is no longer active gets a
// shorter, admin-only cadence — see the lapsed handling in runExpiryReminders.
const EXPIRY_BUCKETS = [90, 30, 7] as const
const EXPIRY_BUCKETS_LAPSED = [30, 7] as const

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
        `/firms?select=id,name,owner_id,reminder_days,status&id=eq.${firmId}&limit=1`,
      ) ?? []
      if (!firmData[0]) continue
      adminUser = await authAdmin(env, firmData[0].owner_id)
    } catch (err) {
      console.error(`[expiry] firm lookup failed for ${firmId}:`, err)
      continue
    }

    const { name: firmName, owner_id: ownerId } = firmData[0]
    void ownerId // used above

    // firms.status is CHECK-constrained to ('active','payment_failed','cancelled')
    // — verified against 0001_initial_schema.sql:45-46, not assumed. The
    // generated type is a bare `string`, so it could not answer this.
    //
    // Tested for 'active' rather than against a list of the other two: a status
    // added later should fall to the conservative lapsed path by default, and
    // payment_failed — not cancelled — is the common case here, since Stripe
    // Smart Retries exhausting a card lands there.
    const isActive = firmData[0].status === 'active'
    const buckets: readonly number[] = isActive ? EXPIRY_BUCKETS : EXPIRY_BUCKETS_LAPSED

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
      const bucket = buckets.find(d => Math.abs(daysLeft - d) <= 1)
      if (!bucket) continue
      if (alreadySent.has(`${cert.id}|${bucket}`)) continue

      try {
        const empUser = await authAdmin(env, cert.user_id)
        if (!empUser?.email || empUser.email.endsWith('@redacted.invalid')) continue

        const empName = (empUser.user_metadata?.full_name as string | undefined) ?? empUser.email
        const dateStr = fmtDate(cert.expires_at)

        // Employees of a lapsed firm are skipped entirely; only the admin is
        // contacted.
        //
        // Note the reason, because it is NOT "they cannot sign in" — nothing in
        // the app currently blocks that. handleSubscriptionDeleted only flips
        // firms.status, and no middleware or layout gates on it, so a lapsed
        // firm's staff can still log in today. The reason is that re-certifying
        // is impossible while the firm is not paying, so chasing the employee
        // puts the burden on the one person who cannot resolve it, and reads as
        // nagging. The admin is the only one who can act.
        if (isActive) {
          await sendEmail(
            env,
            empUser.email,
            `Your AI compliance certificate expires in ${bucket} days`,
            expiryEmployeeHtml(empName, bucket, dateStr, env.APP_URL),
          )
        }

        // On the active path the admin is skipped when they ARE the employee,
        // to avoid sending the same person two emails. On the lapsed path the
        // employee send was skipped above, so that guard must not apply or an
        // owner-only firm would be told nothing at all.
        if (adminUser?.email && (!isActive || adminUser.email !== empUser.email)) {
          await sendEmail(
            env,
            adminUser.email,
            isActive
              ? `${empName}'s AI compliance certificate expires in ${bucket} days`
              : `${empName}'s certificate expires in ${bucket} days — your subscription is not active`,
            isActive
              ? expiryAdminHtml(empName, firmName, bucket, dateStr)
              : expiryAdminLapsedHtml(empName, firmName, bucket, dateStr, env.APP_URL),
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

      // Batch-fetch recent reminder events for this firm.
      //
      // Both types count. Deduping on inactivity_reminder_sent alone meant a
      // manual nudge was invisible here, so an employee could be personally
      // chased by their partner in the morning and auto-chased by the cron the
      // same evening — two near-identical emails, one of which makes the firm
      // look like it is nagging. From the employee's side the sender does not
      // matter; what matters is that they were already contacted.
      //
      // Lookback duration and recipient are unchanged — that is the separate
      // inactivity rewrite.
      const recentCutoff = addDays(now, -reminderDays).toISOString()
      const recentEvents = await pgRest<TrainingEventRow[]>(
        env, 'GET',
        `/training_events?select=firm_member_id&firm_id=eq.${firm.id}&event_type=in.(inactivity_reminder_sent,nudge_sent)&event_timestamp=gte.${encodeURIComponent(recentCutoff)}`,
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
            "Your firm can't be certified until everyone completes their training",
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

// ⚠ Deliberately states NO dollar amount. The worker cannot compute a reliable
// figure — volume bands mean the per-seat rate moves with headcount, seats can
// change mid-term, and tax is applied by Stripe at invoice time. A wrong number
// on a billing notice is worse than no number, so the portal is the only place
// the exact amount is quoted. Do not "helpfully" add one here.
//
// The charge disclosure leads, before the team-status table. This email exists
// to warn about money leaving an account; burying that under a compliance
// progress report is what made the old version read as a status update rather
// than a billing notice.
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
<p style="font-size:14px">Your AI compliance training subscription <strong>renews in ${days} days</strong> — on ${renewalDate}. <strong>The card on file will be charged automatically on that date</strong> unless you cancel before then.</p>
<p style="font-size:14px">To see the exact renewal amount, update your payment method, or turn off auto-renewal, open the billing portal:</p>
<p><a href="${appUrl}/api/portal" style="display:inline-block;background:#14b8a6;color:#0f172a;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px">Manage subscription &amp; billing</a></p>
<p style="font-size:14px">Here's a quick look at where your team stands:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">${statusRows}</table>
${pending > 0 ? `<p style="font-size:14px">You have <strong>${pending} staff member${pending !== 1 ? 's' : ''}</strong> who ${pending !== 1 ? 'have' : 'has'} not yet completed this year's training. Reach out to them before your renewal date to close out your firm's Rule 5.3 compliance record.</p>` : `<p style="font-size:14px">Great news — all of your staff have completed their training for this certification period.</p>`}
<p><a href="${appUrl}/dashboard" style="font-size:14px;color:#0f766e">View your team dashboard</a></p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">IURIX</p>
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
      // Dedup: skip if we already sent this bucket for this firm recently.
      //
      // The memory has to outlast the ELIGIBILITY WINDOW, not the gap between
      // two runs. A bucket matches within ±1 day (see the find() above), so
      // days 31, 30 and 29 all qualify as the "30-day" reminder — three
      // consecutive days on which this firm is eligible. The old 24h window
      // equalled the cron period exactly, so any run-to-run drift let the same
      // notice send twice, and across the full 3-day window the admin could
      // receive it up to 3 times.
      //
      // 8 days clears that window with room to spare and still sits well below
      // the 11-day gap to the next bucket (30 → 14 → 3), so it cannot suppress
      // a reminder that should legitimately fire. It also matches what
      // runExpiryReminders already uses, for the same reason.
      //
      // An hour would not have been enough: it fixes drift between two runs but
      // still lets day 31 forget day 30.
      const dedupeCutoff = addDays(now, -8).toISOString()
      const recentEvents = await pgRest<{ metadata: Record<string, unknown> | null }[]>(
        env, 'GET',
        `/training_events?select=metadata&firm_id=eq.${firm.id}&event_type=eq.renewal_reminder_sent&event_timestamp=gte.${encodeURIComponent(dedupeCutoff)}`,
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

// ── Retention purge ───────────────────────────────────────────────────────────
//
// Max: "why keep it for longer than we need?" The principle is KEEP THE
// OUTCOME, DROP THE DETAIL. Scores, pass/fail and certificates are the record;
// IP addresses, user agents and individual answers are incidental detail that
// stops earning its keep long before the record does.
//
// Certificates are NEVER purged. They are the product.
//
// ⚠️ ORDERING: this cannot run before refund eligibility ships, because training
// events are the evidence behind it (lib/refund-eligibility.ts). The windows
// below are years and the refund window is 14 days, so there is no live
// conflict — but if a retention period is ever SHORTENED toward the refund
// window, that stops being true.

/** Days after which a training event's IP address and user agent are nulled. */
const RETAIN_EVENT_IDENTIFIERS_DAYS = 730 // 2 years

/** Days after which a quiz attempt's individual answers are nulled. Score and passed stay. */
const RETAIN_QUIZ_ANSWERS_DAYS = 365 // 12 months

/** Days after which a RESOLVED provisioning failure is deleted. Unresolved rows are kept. */
const RETAIN_RESOLVED_FAILURES_DAYS = 365 // 12 months

/** Days after which whole training_event rows are deleted. See PURGE_EVENT_ROWS. */
const RETAIN_EVENT_ROWS_DAYS = 730 // 2 years

/**
 * 🔴 OFF, pending a decision from Max — the plan contradicts itself here.
 *
 * Its retention table says, of the same table at the same 2-year mark:
 *
 *     training_events.ip_address, .user_agent  →  null them, KEEP THE EVENT ROW
 *     training_events rows                     →  DELETE
 *
 * Both cannot hold. If the rows are deleted at 2 years, nulling their
 * identifiers at 2 years is a no-op on rows that cease to exist in the same
 * pass.
 *
 * Left off rather than guessed, because the two mistakes are not symmetric:
 * keeping the rows too long is fixed by flipping this to true, while deleting
 * them wrongly destroys Rule 5.3 supervision evidence that cannot be
 * reconstructed. Certificates are kept forever, and these events are the proof
 * behind them — deleting the evidence while keeping the conclusion is the
 * outcome most likely to be regretted.
 *
 * Flip to true once Max confirms deletion is what he meant.
 */
// Typed as boolean, not inferred as the literal `false`, so the branch below is
// live code that keeps typechecking rather than statically-dead code a future
// lint pass offers to delete.
const PURGE_EVENT_ROWS: boolean = false

/**
 * PostgREST mutation that reports how many rows it touched.
 *
 * pgRest() sends `Prefer: return=minimal` and returns null for non-GET, which is
 * right for its callers but useless here: a purge that silently affects zero
 * rows forever looks identical to a purge that is working. `count=exact` puts
 * the number in Content-Range.
 *
 * `filter` is a required argument rather than part of an optional query string,
 * because a PostgREST PATCH or DELETE with no filter applies to EVERY ROW IN THE
 * TABLE. Making it impossible to call this without one is the whole point.
 */
async function pgRestPurge(
  env: Env,
  method: 'PATCH' | 'DELETE',
  table: string,
  filter: string,
  body?: unknown,
): Promise<number> {
  if (!filter || !filter.includes('=')) {
    throw new Error(`pgRestPurge refused: ${method} ${table} with no filter — this would affect every row`)
  }

  const headers: Record<string, string> = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    Prefer: 'return=minimal,count=exact',
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    throw new Error(`pgRestPurge ${method} ${table}: ${res.status} ${await res.text()}`)
  }

  // Content-Range comes back as "*/<count>" for a mutation with count=exact.
  const range = res.headers.get('content-range')
  const total = range ? Number(range.split('/')[1]) : NaN
  return Number.isFinite(total) ? total : 0
}

/** ISO timestamp `days` before now — the cutoff every purge filters on. */
function cutoffIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

async function runRetentionPurge(env: Env): Promise<void> {
  const results: string[] = []

  // 1. Training event identifiers. The event row survives with its type,
  //    timestamp and metadata — what happened and when is the compliance
  //    record; who-from-which-IP is the detail.
  //
  //    `ip_address=not.is.null` keeps this from rewriting rows that are already
  //    clean on every single daily run.
  {
    const cutoff = cutoffIso(RETAIN_EVENT_IDENTIFIERS_DAYS)
    const n = await pgRestPurge(
      env,
      'PATCH',
      'training_events',
      `event_timestamp=lt.${cutoff}&or=(ip_address.not.is.null,user_agent.not.is.null)`,
      { ip_address: null, user_agent: null },
    )
    results.push(`event identifiers nulled: ${n}`)
  }

  // 2. Quiz answers. score and passed are untouched — the certificate rests on
  //    those, not on which distractor someone picked in question 4.
  {
    const cutoff = cutoffIso(RETAIN_QUIZ_ANSWERS_DAYS)
    const n = await pgRestPurge(
      env,
      'PATCH',
      'quiz_attempts',
      `attempted_at=lt.${cutoff}&answers=not.is.null`,
      { answers: null },
    )
    results.push(`quiz answers nulled: ${n}`)
  }

  // 3. Resolved provisioning failures. Measured from resolved_at, not
  //    created_at: the row's job is done when an operator closes it, and an
  //    UNRESOLVED failure is never purged at any age — it means someone paid
  //    and may still be owed a firm or a refund.
  {
    const cutoff = cutoffIso(RETAIN_RESOLVED_FAILURES_DAYS)
    const n = await pgRestPurge(
      env,
      'DELETE',
      'provisioning_failures',
      `resolved_at=not.is.null&resolved_at=lt.${cutoff}`,
    )
    results.push(`resolved provisioning failures deleted: ${n}`)
  }

  // 4. Whole training event rows — see PURGE_EVENT_ROWS.
  if (PURGE_EVENT_ROWS) {
    const cutoff = cutoffIso(RETAIN_EVENT_ROWS_DAYS)
    const n = await pgRestPurge(env, 'DELETE', 'training_events', `event_timestamp=lt.${cutoff}`)
    results.push(`training event rows deleted: ${n}`)
  } else {
    results.push('training event rows: SKIPPED (PURGE_EVENT_ROWS is off)')
  }

  console.log(`[retention-purge] ${results.join(' | ')}`)
}

// ── Reconciliation ────────────────────────────────────────────────────────────
//
// The refund policy will state that someone charged who received nothing gets a
// full refund or access, with no window. That promise has no detector today.
// provisioning_failures catches the three CLASSIFIED causes, but a silent
// failure — the webhook never delivered, or the handler threw before writing
// anything — leaves no trace at all. The only symptom is a customer sitting on
// /onboarding, and nobody finds out until they complain.
//
// This is the detector: compare Stripe against the database daily, in three
// directions. It is READ ONLY on both sides. It cancels nothing, provisions
// nothing and refunds nothing — it reports, and a human acts.

/** Ignore anything younger than this. Provisioning is not instant. */
const RECONCILE_GRACE_MS = 15 * 60 * 1000

interface StripeSubscription {
  id: string
  customer: string
  status: string
  livemode: boolean
  created: number
  items: { data: { quantity?: number | null }[] }
}

interface FirmReconcileRow {
  id: string
  name: string
  status: string
  max_seats: number
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  created_at: string
}

/** Paginated GET against the Stripe REST API. No SDK — the worker uses raw fetch throughout. */
async function stripeListActiveSubscriptions(env: Env): Promise<StripeSubscription[]> {
  const all: StripeSubscription[] = []
  let startingAfter: string | undefined

  // Bounded rather than while(true): a pagination bug that never terminates
  // would burn the whole cron budget silently. 100 pages is 10,000 subscriptions.
  for (let page = 0; page < 100; page++) {
    const params = new URLSearchParams({ status: 'active', limit: '100' })
    if (startingAfter) params.set('starting_after', startingAfter)

    const res = await fetch(`https://api.stripe.com/v1/subscriptions?${params}`, {
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        // Pinned to match every Stripe call in the app (app/api/checkout/route.ts
        // and siblings). An unpinned call silently follows the account default.
        'Stripe-Version': '2026-05-27.dahlia',
      },
    })

    if (!res.ok) throw new Error(`Stripe subscriptions ${res.status}: ${await res.text()}`)

    const body = (await res.json()) as { data: StripeSubscription[]; has_more: boolean }
    all.push(...body.data)

    const last = body.data[body.data.length - 1]
    if (!body.has_more || !last) break
    startingAfter = last.id
  }

  return all
}

function subscriptionQuantity(sub: StripeSubscription): number {
  return sub.items.data.reduce((sum, item) => sum + (item.quantity ?? 0), 0)
}

async function runReconciliation(env: Env): Promise<void> {
  const [subsRaw, firms] = await Promise.all([
    stripeListActiveSubscriptions(env),
    pgRest<FirmReconcileRow[]>(
      env,
      'GET',
      '/firms?select=id,name,status,max_seats,stripe_subscription_id,stripe_customer_id,created_at',
    ),
  ])

  const now = Date.now()

  // 🔴 LIVEMODE ONLY. Learned from running this against real data on 2026-08-03:
  // all 30 sandbox subscriptions are livemode:false and 13 of them have no firm,
  // so without this filter the job reports 13 phantom emergencies on day one and
  // is switched off by the second. Filtering on the object's own flag rather
  // than trusting which key is configured means a sandbox key produces silence
  // instead of a false alarm.
  const subs = subsRaw.filter(
    (s) => s.livemode === true && now - s.created * 1000 > RECONCILE_GRACE_MS,
  )

  const firmRows = firms ?? []

  // A lapsed re-subscription arrives with a NEW subscription id, and
  // handlePaymentSucceeded resolves those by CUSTOMER before updating the row.
  // Matching on both keys here means the window between those two events reads
  // as healthy rather than as an emergency in both directions at once.
  const firmBySubId = new Map<string, FirmReconcileRow>()
  const firmByCustomerId = new Map<string, FirmReconcileRow>()
  for (const f of firmRows) {
    if (f.stripe_subscription_id) firmBySubId.set(f.stripe_subscription_id, f)
    if (f.stripe_customer_id) firmByCustomerId.set(f.stripe_customer_id, f)
  }

  const matchFirm = (sub: StripeSubscription) =>
    firmBySubId.get(sub.id) ?? firmByCustomerId.get(sub.customer) ?? null

  const paidButNothing: string[] = []
  const accessWithoutPayment: string[] = []
  const seatDrift: string[] = []

  // 🔴 The livemode filter has a MIRROR-IMAGE failure the plan does not mention.
  //
  // The plan's guard is written for direction 1: without it, 13 sandbox
  // subscriptions with no firm read as 13 emergencies. True. But the database
  // has no livemode column — a firm provisioned in sandbox is indistinguishable
  // from a live one. So with a sandbox key the filter empties `subs`, and
  // direction 2 then reports EVERY ACTIVE FIRM as "access without payment".
  // That is a far bigger false alarm than the one the guard prevents, and it
  // would arrive on the same first run.
  //
  // Directions 2 and 3 are therefore suppressed when there are no live
  // subscriptions at all. Zero live subscriptions means either a sandbox key or
  // a product that has not sold anything yet — in both cases "these firms have
  // no subscription" is noise, not information. Direction 1 needs no such guard:
  // an empty subscription list cannot produce a false positive there.
  //
  // This degrades in the right direction. The day the first real customer
  // exists, subs is non-empty and all three directions engage on their own.
  const canCompareFirmsToStripe = subs.length > 0

  // ── Direction 1: active Stripe subscription with no firm ───────────────────
  // The one that matters. This is someone who paid and received nothing.
  for (const sub of subs) {
    if (!matchFirm(sub)) {
      paidButNothing.push(
        `${sub.id} (customer ${sub.customer}, ${subscriptionQuantity(sub)} seats, created ${new Date(sub.created * 1000).toISOString()})`,
      )
    }
  }

  const liveSubBySubId = new Map(subs.map((s) => [s.id, s]))
  const liveSubByCustomerId = new Map(subs.map((s) => [s.customer, s]))

  for (const firm of canCompareFirmsToStripe ? firmRows : []) {
    const sub =
      (firm.stripe_subscription_id ? liveSubBySubId.get(firm.stripe_subscription_id) : undefined) ??
      (firm.stripe_customer_id ? liveSubByCustomerId.get(firm.stripe_customer_id) : undefined) ??
      null

    // ── Direction 2: active firm with no live subscription ───────────────────
    // status='active' ONLY — a payment_failed or cancelled firm is SUPPOSED to
    // have no live subscription, and reporting those would bury the real signal
    // under every lapsed customer the product is handling correctly.
    if (firm.status === 'active') {
      const firmAgeMs = now - new Date(firm.created_at).getTime()
      if (!sub && firmAgeMs > RECONCILE_GRACE_MS) {
        accessWithoutPayment.push(`${firm.name} (firm ${firm.id})`)
      }
    }

    // ── Direction 3: seat drift ──────────────────────────────────────────────
    if (sub) {
      const stripeSeats = subscriptionQuantity(sub)
      if (stripeSeats !== firm.max_seats) {
        seatDrift.push(
          `${firm.name} (firm ${firm.id}): DB max_seats=${firm.max_seats}, Stripe quantity=${stripeSeats}`,
        )
      }
    }
  }

  const findings = paidButNothing.length + accessWithoutPayment.length + seatDrift.length

  // SILENCE WHEN HEALTHY. A report that always arrives is a report nobody reads,
  // and this one has to be believed on the day it finally says something.
  if (findings === 0) {
    console.log(
      `[reconciliation] clean — ${subs.length} live subscriptions, ${firmRows.length} firms` +
        (canCompareFirmsToStripe ? '' : ' (directions 2 and 3 skipped: no live subscriptions)'),
    )
    return
  }

  const section = (title: string, items: string[]) =>
    items.length === 0
      ? ''
      : `<h3 style="font-size:14px;margin:24px 0 8px">${title} (${items.length})</h3><ul style="font-size:13px">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111827;max-width:640px;margin:0 auto;padding:32px 24px">
<p style="font-size:14px">Daily Stripe/database reconciliation found <strong>${findings}</strong> discrepancy(ies).</p>
${section('🔴 PAID BUT NOT PROVISIONED — someone was charged and received nothing', paidButNothing)}
${section('⚠️ ACTIVE FIRM WITH NO LIVE SUBSCRIPTION — access without payment', accessWithoutPayment)}
${section('⚠️ SEAT DRIFT — billed quantity does not match the firm record', seatDrift)}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0">
<p style="font-size:12px;color:#6b7280">Compared ${subs.length} live active subscriptions against ${firmRows.length} firms.${canCompareFirmsToStripe ? '' : ' Directions 2 and 3 were SKIPPED — no live subscriptions exist, so firm-to-Stripe comparison would report every firm.'} Subscriptions younger than 15 minutes are ignored. This job is read-only — nothing was changed in Stripe or the database.</p>
</body></html>`

  await sendEmail(
    env,
    env.OPERATOR_ALERT_EMAIL,
    `[IURIX] Reconciliation: ${findings} discrepancy(ies)`,
    html,
  )
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
          // Idempotent and cheap — every filter excludes rows already purged, so
          // a daily run costs nothing once the backlog is clear.
          runRetentionPurge(env).catch(err => console.error('[scheduled] retention purge:', err)),
          runReconciliation(env).catch(err => console.error('[scheduled] reconciliation:', err)),
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
