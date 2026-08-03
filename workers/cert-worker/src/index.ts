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
