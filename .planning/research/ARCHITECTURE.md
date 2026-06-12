# Architecture Research

> ⚠️ **STACK SUPERSEDED (2026-06-11):** This document was researched for the original Netlify + n8n + H5P stack. The locked stack is now Cloudflare Workers (`@opennextjs/cloudflare`) + CF Workers + custom React quiz — see `.planning/STATE.md` Locked Decisions and `CLAUDE.md`. Netlify/n8n/H5P-specific guidance below is historical; domain findings (Stripe, Supabase RLS, Cloudflare Stream, compliance) remain valid.

**Domain:** Self-serve B2B SaaS — compliance training / cert delivery (tiny multi-tenant LMS slice)
**Researched:** 2026-05-19
**Confidence:** HIGH (stack is locked; patterns map cleanly to documented Supabase + Stripe + n8n behaviors)

## TL;DR — Decisions That Drive the Roadmap

| Question | Decision | Why |
|---|---|---|
| Where does Stripe webhook land? | **Next.js Route Handler on Netlify** (`/api/webhooks/stripe`) | Raw-body signature verification is well-trodden in Next.js; keeps the seat/firm-provisioning write transactional and Postgres-local; n8n becomes a forward target, not the system of record. |
| Where is the certificate PDF generated? | **n8n** (via Database Webhook from Supabase) | Supabase Edge Functions / Deno have documented friction with PDF libraries (pdfkit, Puppeteer). n8n already runs on the VPS, has a built-in HTML-to-PDF node, and is explicitly the "automation runtime for everything" per project constraints. |
| How do quiz scores travel from H5P → DB? | **H5P xAPI → `postMessage` to Next.js parent → POST `/api/quiz/attempt` → Supabase (server-side write with service role)** | Never trust client-side direct writes for scoring. The Next.js route validates the user's session, recomputes pass/fail, and writes the row. |
| Auth model | **Single Supabase Auth user pool. Role = `firm_admin` vs `employee` stored in `firm_members.role` (not in `auth.users.user_metadata` alone).** Use `user_metadata.role` only as a denormalized convenience for JWT claims. | One source of truth, RLS-friendly, supports admin who is also enrolled. |
| Employee onboarding | **Magic-link invite (Supabase `inviteUserByEmail`) → set password on first visit** | One click in email, no inbox confusion; password optional for repeat logins. |
| Environments (Supabase free tier = 2 projects) | **2 separate projects: `attytraining-dev` + `attytraining-prod`** — local dev runs against `dev`; Netlify production deploy points at `prod`. No preview-deploy Supabase. | Free-tier cap forces this; Supabase docs explicitly recommend separate projects over branching for migration safety. |
| Multi-tenant security | **RLS on every table, scoped via `firm_members(user_id, firm_id, role)` join table.** Storage objects scoped by `firm_id` path prefix + RLS policy on `storage.objects`. Cert signed URLs generated server-side after a firm-membership check. | Defense in depth: even a leaked anon key cannot cross firms. |

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Next.js client)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ Marketing /  │  │ Firm Admin   │  │ Employee     │  │ Cloudflare  │ │
│  │ Checkout     │  │ Dashboard    │  │ Course Player│  │ Stream +    │ │
│  │ (Stripe.js)  │  │              │  │ + H5P iframe │  │ H5P iframe  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬───────┘ │
│         │                 │                 │ postMessage   │         │
└─────────┼─────────────────┼─────────────────┼───────────────┼─────────┘
          │                 │                 │               │
          ▼                 ▼                 ▼               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              NEXT.JS on NETLIFY (App Router + Route Handlers)            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Pages: /, /buy, /invite/[token], /dashboard, /course/[id]       │   │
│  │ Route handlers (server-only, hold service-role key):            │   │
│  │   POST /api/webhooks/stripe       ← Stripe (HMAC verified)      │   │
│  │   POST /api/quiz/attempt          ← H5P score submission        │   │
│  │   POST /api/invites               ← firm admin invites employee │   │
│  │   GET  /api/certificates/[id]/url ← issues signed Supabase URL  │   │
│  │   GET  /api/video/[id]/token      ← issues CF Stream signed tok │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────┬───────────────────────────────────┬──────────────────────────┘
           │ pg / supabase-js (service role)   │ HTTPS (HMAC)
           ▼                                   ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│       SUPABASE (system of        │  │   n8n  (n8n.katychavezlaw.com)   │
│             record)              │  │   (automation runtime)           │
│  ┌────────────────────────────┐  │  │  Triggers:                       │
│  │ Postgres                   │  │  │   • Supabase Database Webhook    │
│  │  firms, firm_members,      │  │  │     on quiz_attempts.passed=true │
│  │  employees, seats,         │──┼──▶│   • Cron: cert-expiry reminders │
│  │  enrollments, courses,     │  │  │   • Webhook: invite-email queue  │
│  │  quiz_attempts,            │  │  │                                  │
│  │  certificates              │  │  │  Actions:                        │
│  │  + RLS policies            │  │  │   • Generate PDF (HTML→PDF node) │
│  ├────────────────────────────┤  │  │   • Upload to Supabase Storage   │
│  │ Auth (users + JWT)         │  │  │   • Send email (SMTP / Resend)   │
│  ├────────────────────────────┤  │  │   • Mark certificate.ready=true  │
│  │ Storage                    │  │  │                                  │
│  │  bucket: certificates/     │◀─┼──┘                                  │
│  │   {firm_id}/{employee}.pdf │  │                                     │
│  └────────────────────────────┘  │                                     │
└──────────────────────────────────┘  └──────────────────────────────────┘
           ▲                                   ▲
           │                                   │
┌──────────┴───────────────────────────────────┴──────────────────────────┐
│                          EXTERNAL SERVICES                               │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────────────────┐│
│  │ Stripe      │  │ Cloudflare Stream│  │ Email (n8n SMTP or Resend)  ││
│  │ Checkout +  │  │ signed playback  │  │ — invite, cert, reminders   ││
│  │ Webhooks    │  │ + H5P quiz overlay│ │                             ││
│  └─────────────┘  └──────────────────┘  └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Owns | Does NOT own |
|---|---|---|
| **Next.js (Netlify)** | UI rendering, session/auth handshake, all third-party webhook intake, all DB writes that require validation (quiz pass logic, seat checks), signed-URL issuance | Long-running tasks, retries, scheduled jobs, PDF rendering, email dispatch |
| **Supabase Postgres** | All durable state (firms, enrollments, attempts, certs metadata), RLS-enforced multi-tenant boundary, Database Webhooks that fan out to n8n | Business logic that needs network calls (PDF, email) |
| **Supabase Auth** | User identity, JWT issuance, magic-link invite delivery, password reset | Authorization decisions (those live in RLS + route handlers) |
| **Supabase Storage** | Durable PDF certificate storage; RLS-scoped signed URLs | Generating the PDF |
| **n8n** | All async/automation: PDF rendering, email sending, reminder cron, expiry notifications, retry-on-failure workflows | Synchronous request/response paths; anything in the critical user-blocking flow |
| **Stripe** | Payment, subscription billing for renewals, source of truth for "paid" | Seat enforcement (that's Supabase's `firms.seat_limit`) |
| **Cloudflare Stream** | Video transcoding + signed-URL HLS delivery | Quiz state (that's H5P + Postgres) |
| **H5P** | In-video interactive quiz UI + xAPI event emission | Score persistence (server re-records authoritative score) |

## Recommended Project Structure

```
attytraining/
├── app/                              # Next.js App Router
│   ├── (marketing)/
│   │   ├── page.tsx                  # Landing
│   │   └── buy/page.tsx              # Stripe Checkout entry
│   ├── (auth)/
│   │   ├── invite/[token]/page.tsx   # Set password from invite
│   │   └── login/page.tsx
│   ├── (firm)/
│   │   ├── dashboard/page.tsx        # Firm admin: see all employees
│   │   └── employees/page.tsx        # Invite, manage seats
│   ├── (employee)/
│   │   └── course/[courseId]/page.tsx  # Video + H5P player
│   └── api/
│       ├── webhooks/
│       │   └── stripe/route.ts       # HMAC-verified, raw-body
│       ├── quiz/
│       │   └── attempt/route.ts      # Server-side score record
│       ├── invites/route.ts          # Admin invites employee
│       ├── certificates/[id]/url/route.ts  # Issue signed cert URL
│       └── video/[id]/token/route.ts # Issue CF Stream signed token
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 # Server client (service role)
│   │   ├── client.ts                 # Browser client (anon, RLS)
│   │   └── middleware.ts             # Session refresh
│   ├── stripe/
│   │   ├── webhook.ts                # Event handlers
│   │   └── checkout.ts               # Create session
│   ├── cloudflare/
│   │   └── stream-token.ts           # JWT signing for video
│   ├── auth/
│   │   ├── roles.ts                  # firm_admin vs employee guards
│   │   └── firm-context.ts           # Get user's firm(s)
│   └── n8n/
│       └── client.ts                 # Outbound webhook poster
├── supabase/
│   ├── migrations/                   # SQL migrations (versioned)
│   │   ├── 0001_init.sql
│   │   ├── 0002_rls_policies.sql
│   │   └── 0003_storage_policies.sql
│   ├── seed.sql                      # Dev seed data
│   └── config.toml
├── n8n-workflows/                    # Exported JSON workflows (committed)
│   ├── cert-generation.json
│   ├── invite-email.json
│   └── recert-reminder.json
└── .planning/
```

### Structure Rationale

- **`app/(firm)/` vs `app/(employee)/` route groups:** Role-based UI shells. Middleware checks role on entry. Prevents accidentally rendering an admin component in an employee context.
- **`api/` server routes hold all writes that have authorization stakes:** Quiz score, invite, cert URL issuance. Never let the browser write `passed = true` directly even with RLS, because authoritative pass/fail logic needs server-side validation against course config.
- **`lib/supabase/server.ts` vs `client.ts`:** Service-role key never reaches the browser. Server routes use service-role for trusted writes (Stripe provisioning, quiz attempt insert with computed `passed`). Browser uses anon key + user JWT and is constrained by RLS.
- **`n8n-workflows/` committed as JSON:** Workflows are infra. Export from n8n UI, commit, treat like code. Avoids "where did the cert workflow go?" drift.
- **`supabase/migrations/`:** Source-controlled SQL is the only sane way to keep dev and prod schemas in sync given the 2-project constraint.

## Data Flow

### Flow 1: Purchase → Firm Provisioning

```
1. Browser:    User on /buy clicks tier → POST /api/checkout/session
2. Next.js:    Create Stripe Checkout Session with metadata: { seat_tier, email }
3. Stripe:     User completes payment → redirect to /thanks
4. Stripe:     Async POST /api/webhooks/stripe (event: checkout.session.completed)
5. Next.js:    Read raw body, verify Stripe-Signature HMAC, parse event
6. Next.js:    Service-role TX:
                 INSERT firms (name, owner_email, seat_limit, stripe_customer_id)
                 INSERT auth.users via admin.inviteUserByEmail(owner_email,
                   redirectTo: /invite/welcome)  ← magic-link email sent
                 INSERT firm_members (user_id, firm_id, role='firm_admin')
7. Next.js:    Return 200 to Stripe (must be fast — <30s)
8. Next.js:    Fire-and-forget POST to n8n /webhook/firm-created
                 (n8n sends a richer "welcome to BSBR" email; non-blocking)
9. User:       Receives Supabase magic-link → /invite/welcome → set password
                 → lands on /dashboard
```

**Why webhook lands in Next.js, not n8n:**
- Stripe signature verification + transactional Postgres write should be in one process. If n8n sits in front, you either lose transactionality (n8n could succeed at HMAC check but Postgres write fails silently) or you double the failure surface.
- n8n then becomes a fan-out target for non-critical side effects (welcome email content, Slack ping to operator, etc).

### Flow 2: Invite → Employee Onboarding

```
1. Browser:    Firm admin on /dashboard/employees enters email →
                 POST /api/invites { email }
2. Next.js:    Auth check: caller's firm_members.role = 'firm_admin'
3. Next.js:    Seat check: COUNT(firm_members WHERE firm_id=X) < firms.seat_limit
4. Next.js:    supabase.auth.admin.inviteUserByEmail(email, {
                 data: { firm_id, role: 'employee' },
                 redirectTo: SITE/invite/accept })
5. Next.js:    INSERT firm_members (user_id=pending, firm_id, role='employee',
                 invited_at=now())
                 INSERT enrollments (employee_id, course_id, status='pending')
6. Supabase:   Sends magic-link email (templated)
7. User:       Clicks email → /invite/accept → sets password
8. Next.js:    On first login, resolve firm_members.user_id (was pending)
                 by matching invited email to auth.users.email
                 → mark enrollment.status='ready'
9. User:       Redirected to /course/[courseId]
```

**Note on step 5/8:** Supabase's `inviteUserByEmail` returns the new user record immediately, so you can capture the user_id at invite time and avoid the pending-resolution dance. Confirmed in Supabase JS reference.

### Flow 3: Quiz Pass → Certificate

```
1. Browser:    Employee on /course/[id] — Next.js page renders:
                 <iframe src=cloudflare-stream-player?signed-token=...>
                   <H5P interactions overlay xAPI events>
2. H5P:        On quiz completion, dispatches xAPI 'completed' verb statement
                 with score.scaled (0..1)
3. H5P iframe: window.parent.postMessage({ statement, score, courseId }, origin)
4. Parent:     window.addEventListener('message') handler validates origin →
                 POST /api/quiz/attempt { courseId, rawScore, scaledScore }
5. Next.js:    Auth: extract user from session
                 Authorization: verify enrollment(user, courseId) exists
                 Re-validate score against course.pass_threshold
                 INSERT quiz_attempts (employee_id, course_id, score,
                   passed=(score >= threshold), attempted_at)
6. Postgres:   On INSERT where passed=true AND no existing valid certificate:
                 → Database Webhook fires → POST n8n /webhook/quiz-passed
                   with { employee_id, firm_id, course_id, attempt_id }
7. n8n:        a. Fetch employee + firm + course details (Supabase node)
                 b. Render HTML cert template with name, firm, date, expiry
                 c. HTML-to-PDF node → bytes
                 d. Upload to Supabase Storage:
                      bucket=certificates, path={firm_id}/{employee_id}.pdf
                 e. INSERT certificates (employee_id, firm_id, course_id,
                      issued_at, expires_at = issued + 12 months,
                      storage_path)
                 f. Send email (employee + firm admin) with link to
                      /certificates/{id} (NOT a raw storage URL)
8. Browser:    Dashboard polls / SWR refetch → certificate row appears →
                 "Download" button → GET /api/certificates/[id]/url
9. Next.js:    Verify caller is the cert owner OR firm admin of cert's firm
                 supabase.storage.from('certificates')
                   .createSignedUrl(path, 60s)  ← short-lived
                 Return URL → browser redirects to it
```

**Why n8n for cert PDF, not Supabase Edge Function:**
- Documented GitHub issues show pdfkit, Puppeteer, and similar Deno-incompatible libraries fail or have permission issues on Supabase Edge Functions.
- n8n has a native HTML→PDF node, retry-on-failure built in, and the operator already runs it.
- This is async work (5-30s); pulling it out of the user request path is correct anyway.

**Why server-issued signed URLs over public/long-lived URLs:**
- Bucket is private; signed URL is generated only after the route handler confirms the caller is allowed to see this firm's cert.
- 60-second TTL means leaked URLs in logs/screenshots aren't a long-term liability.

## Multi-Tenant Security (Supabase RLS)

### Core Tables

```sql
firms          (id, name, stripe_customer_id, seat_limit, created_at)
firm_members   (id, firm_id, user_id, role, invited_at, joined_at)
                -- role: 'firm_admin' | 'employee'
                -- UNIQUE(firm_id, user_id)
employees      -- conceptually = firm_members WHERE role='employee'
                -- DECISION: don't make 'employees' a separate table;
                -- firm_members IS the membership/role record. Saves a join.
enrollments    (id, firm_member_id, course_id, status, started_at)
quiz_attempts  (id, firm_member_id, course_id, score, passed, attempted_at)
certificates   (id, firm_member_id, firm_id, course_id,
                issued_at, expires_at, storage_path, revoked_at)
```

> **Operator-specified data model note:** the brief listed `firms`, `employees`, `enrollments`, `quiz_attempts`, `certificates`. The recommendation above collapses `employees` into `firm_members` (one table for both admin + employee membership, distinguished by `role`). This is a small but important refinement — it lets a firm owner also be enrolled in the course, supports future roles cleanly, and keeps RLS policies uniform. If the operator wants the literal "employees" table, keep it as a VIEW over `firm_members WHERE role='employee'`.

### Helper Function (called from every policy)

```sql
-- Returns the firm_ids the current auth user belongs to.
-- Wrapped in (SELECT ...) for the documented performance pattern.
CREATE FUNCTION public.user_firm_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT firm_id FROM public.firm_members
  WHERE user_id = (SELECT auth.uid());
$$;

CREATE FUNCTION public.is_firm_admin(target_firm_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.firm_members
    WHERE user_id = (SELECT auth.uid())
      AND firm_id = target_firm_id
      AND role = 'firm_admin'
  );
$$;
```

### Policies (essential set)

```sql
-- firms: members can see their firm; only admins can update.
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
CREATE POLICY firms_select ON firms FOR SELECT
  USING (id IN (SELECT user_firm_ids()));
CREATE POLICY firms_update ON firms FOR UPDATE
  USING (is_firm_admin(id));

-- firm_members: admins see all members of their firm; employees see only self.
ALTER TABLE firm_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY fm_select_self ON firm_members FOR SELECT
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY fm_select_admin ON firm_members FOR SELECT
  USING (is_firm_admin(firm_id));
CREATE POLICY fm_insert_admin ON firm_members FOR INSERT
  WITH CHECK (is_firm_admin(firm_id));

-- enrollments: visible to the employee owner and to firm admins.
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY enr_select ON enrollments FOR SELECT
  USING (
    firm_member_id IN (
      SELECT id FROM firm_members WHERE user_id = (SELECT auth.uid())
    )
    OR firm_member_id IN (
      SELECT id FROM firm_members WHERE firm_id IN (
        SELECT firm_id FROM firm_members
        WHERE user_id = (SELECT auth.uid()) AND role = 'firm_admin'
      )
    )
  );

-- quiz_attempts + certificates: same pattern as enrollments
-- (employee sees own; admin sees all in their firm).

-- WRITES to quiz_attempts: NO browser-side INSERT policy.
-- All inserts go through Next.js API route using service-role key,
-- which bypasses RLS. This is intentional: server is authoritative on pass/fail.
```

### Storage RLS (private bucket `certificates`)

```sql
-- Path convention: {firm_id}/{firm_member_id}.pdf
-- Policy: a user can read if they're a member of the firm in the path's
-- first folder, OR a firm admin of that firm. n8n uploads via service role.

CREATE POLICY cert_read ON storage.objects FOR SELECT
  USING (
    bucket_id = 'certificates'
    AND (
      -- firm_id is the first path segment
      (storage.foldername(name))[1]::uuid IN (SELECT user_firm_ids())
    )
  );

-- INSERT/UPDATE/DELETE on the bucket are NOT exposed to anon/authenticated;
-- only the service role (used by n8n + Next.js routes) can write.
```

### Signed URL Pattern (the load-bearing detail)

Signed URLs alone are not enough — anyone with the URL gets access for the TTL window. The defense is:

1. **Bucket is private.** No public read.
2. **Signed URLs are issued only by `/api/certificates/[id]/url`**, which performs an explicit firm-membership check against `certificates.firm_id` before calling `createSignedUrl(path, 60)`.
3. **Short TTL** (60 seconds) so a logged URL is dead by the time anyone finds it.
4. **No raw storage URLs in emails.** Emails link to `/certificates/{id}` on the Next.js app, which forces a login and then issues a fresh signed URL on click.

## Auth Model

### One Supabase Auth User Pool

- Every human (firm admin, employee, future Rob-as-operator) is one row in `auth.users`.
- Role is a property of *membership* (`firm_members.role`), not of the user — this is what lets a person who runs Firm A as admin also be an enrolled employee at Firm B in the future.
- `auth.users.user_metadata` is a useful place to *cache* `current_firm_id` and `role` for fast UI rendering, but the source of truth is `firm_members`. Never base RLS on user_metadata alone.

### Magic-Link Invite (not Password-First)

Recommended flow:

```
admin.inviteUserByEmail(email, {
  data: { firm_id, role: 'employee' },
  redirectTo: `${SITE}/invite/accept`
})
```

- Supabase ships the templated invite email; no third-party email needed for this step.
- After clicking, employee is asked to set a password (one-time) and is then logged in.
- For repeat logins, password works; for password resets, Supabase recovery flow works.

### Why Not Pure Magic-Link Every Time

Magic-link-only every session is friction for users who'll log in monthly to renew. Password + optional magic-link as backup is the right balance for a once-a-year compliance product.

## Architectural Patterns

### Pattern 1: Server-Trusted Writes for Authorization-Sensitive Data

**What:** Any write whose validity depends on more than "the user owns the row" goes through a Next.js route handler with the service-role client.

**When:** Quiz pass/fail (depends on course config), seat enforcement (depends on count), cert revocation (depends on admin role).

**Example:**
```typescript
// app/api/quiz/attempt/route.ts
export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session) return new Response('unauthorized', { status: 401 })

  const { courseId, scaledScore } = await req.json()

  // 1. Validate enrollment exists
  const enrollment = await sb.from('enrollments')
    .select('*, courses(pass_threshold)')
    .eq('firm_member_id', session.firmMemberId)
    .eq('course_id', courseId).single()
  if (!enrollment.data) return new Response('not enrolled', { status: 403 })

  // 2. Compute pass server-side (don't trust client)
  const passed = scaledScore >= enrollment.data.courses.pass_threshold

  // 3. Insert with service-role (bypasses RLS, but we just authorized)
  await sbAdmin.from('quiz_attempts').insert({
    firm_member_id: session.firmMemberId,
    course_id: courseId,
    score: scaledScore,
    passed,
  })

  return Response.json({ passed })
}
```

### Pattern 2: Database Webhooks → n8n for Side Effects

**What:** Supabase emits a webhook on table events (e.g., INSERT into `quiz_attempts` where `passed=true`); n8n receives it, performs async work, writes results back.

**When:** Anything not in the user's blocking request path: PDF render, email send, reminders, integrations.

**Trade-off:** Adds a hop (extra latency for the user to see the cert appear), but isolates failure (a PDF render bug doesn't 500 the quiz submission). With the dashboard polling/refreshing, the user sees the cert within ~10 seconds.

### Pattern 3: Idempotency on Webhook Receivers

**What:** Both Stripe and Supabase Database Webhooks can deliver the same event twice. Receivers must be idempotent.

**Implementation:**
- Stripe webhook: keep a `processed_stripe_events(event_id PRIMARY KEY)` table; INSERT with ON CONFLICT DO NOTHING; only continue if the insert succeeded.
- n8n cert-generation: check `SELECT 1 FROM certificates WHERE firm_member_id=? AND course_id=? AND revoked_at IS NULL AND expires_at > now()` before generating. If a valid cert exists, skip.

### Pattern 4: postMessage Origin Validation for H5P → Parent

**What:** H5P emits xAPI in iframe; parent listens on `message` event. *Always* validate `event.origin`.

```typescript
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://h5p-host.attytraining.com') return
  if (!e.data?.statement?.result?.score) return
  // forward to /api/quiz/attempt
})
```

## Build Order — Smallest End-to-End Slice First

The operator's suggestion (scaffold → player → dashboard) is the right shape, but I'd reorder slightly to validate the end-to-end loop earliest:

### Phase A: "Hello cert" — prove the loop with stubs (~1 week)
The smallest slice that closes purchase → invite → pass → cert:
1. Two Supabase projects (`dev`, `prod`) with the core schema + RLS.
2. Next.js scaffold on Netlify (one page, login).
3. Stripe Checkout webhook → provision firm + magic-link invite admin.
4. Hardcoded single course; "Mark Pass" button (not real video/quiz yet).
5. n8n workflow: on `quiz_attempts.passed=true`, generate trivial PDF (just text "Certified") and email it.

**Done when:** Rob can pay $1 in Stripe test mode, get an admin invite, log in, invite himself as employee, click "Mark Pass", and receive a real (if ugly) PDF.

This is the riskiest path because it touches every integration. Validate it before investing in player/dashboard polish.

### Phase B: Real player (~1-2 weeks)
6. Cloudflare Stream signed playback in `/course/[id]`.
7. H5P embed + xAPI → postMessage → `/api/quiz/attempt`.
8. Replace "Mark Pass" with actual quiz pass detection.

### Phase C: Firm admin dashboard (~1 week)
9. `/dashboard` listing employees, status, score, cert link per row.
10. Resend invite button, seat counter.

### Phase D: Renewal + reminders (~1 week)
11. n8n cron: scan `certificates.expires_at < now() + 60d` → send recert reminder.
12. Stripe renewal pricing (60% of original) + flow.

### Phase E: Polish (~1 week)
13. Real cert PDF template, branding, email templates, marketing landing.

### Dependency Reasoning

- **A before B** because the entire automation backbone (webhook → DB → n8n → storage → email) is the highest-risk integration; build it on a fake quiz to expose problems before sinking time into video/H5P.
- **B before C** because the dashboard's "score" and "cert link" columns are meaningless without a real attempt.
- **D before E** is the bet that polish doesn't justify itself until renewal economics are proven.

## Environment Strategy

Given Supabase free tier = 2 active projects:

```
attytraining-dev   ← all developer activity + Netlify branch deploys + previews
attytraining-prod  ← only production main-branch deploy
```

- **Local dev:** runs against `attytraining-dev` via `.env.local`. No third Supabase env.
- **Netlify branch deploys:** all point at `attytraining-dev`. This is the documented compromise when the free-tier 2-project cap blocks per-PR environments.
- **Migrations:** `supabase/migrations/*.sql` is the only path to production. Apply locally → push to dev → after manual smoke test, push to prod via `supabase db push --linked` (or GitHub Action).
- **Stripe:** matching pattern — test-mode keys in dev/branch deploys, live-mode keys in prod only.
- **Cloudflare Stream:** one account; tag dev videos so they can be cleaned up.
- **n8n:** single self-hosted instance. Use workflow tags `env:dev` and `env:prod`, and split workflows that hit different Supabase URLs. (n8n doesn't natively segregate, so discipline is required.)

**When to add a third Supabase env:** If/when the product has paying customers and you're afraid to test migrations against `attytraining-dev`. At that point upgrade to Pro tier for a real staging project.

## Scaling Considerations

| Scale | Adjustments |
|---|---|
| 0–50 firms (~500 employees) | Current architecture is wildly overspec'd. Watch the n8n VPS (it's the only single-point process). |
| 50–500 firms (~5k employees) | Move n8n workflows behind a small queue (n8n has built-in queue mode) so concurrent cert generations don't block. Add Postgres connection pooling (Supabase Supavisor is already in front). |
| 500+ firms | Consider moving PDF generation to a dedicated Cloudflare Worker (Browser Rendering API) and demoting n8n to orchestration-only. Cache Cloudflare Stream signed tokens at the CDN edge. |

### First Bottleneck

**n8n single VPS** is the most likely first failure point — it's the only non-managed component. Mitigation: schedule a daily backup of n8n workflows + DB, monitor VPS uptime, have a documented "boot a second n8n" runbook.

### Second Bottleneck

**Stripe webhook latency on Netlify cold start.** Netlify functions have slower cold starts than Vercel/Cloudflare. Stripe will retry on 5xx so this is usually self-healing, but a missed webhook = missed firm provisioning = angry customer. Mitigation: idempotency table + a daily reconciliation job in n8n that diffs Stripe customers vs Supabase firms.

## Anti-Patterns

### Anti-Pattern 1: Letting the browser INSERT into `quiz_attempts` directly

**What people do:** Use `supabase-js` in the browser to insert quiz results, relying on RLS to scope to the user.
**Why wrong:** The client controls the `score` and `passed` columns. Any user can curl an insert with `passed=true, score=1.0` and get a cert.
**Do instead:** All `quiz_attempts` writes flow through `/api/quiz/attempt` which re-validates score against course config server-side. Have NO `INSERT` policy on `quiz_attempts` for `authenticated` — only service-role writes.

### Anti-Pattern 2: Putting Stripe webhook handling in n8n

**What people do:** Point Stripe webhook URL at `n8n.example.com/webhook/stripe`, do firm provisioning in n8n.
**Why wrong:** (a) n8n doesn't auto-verify Stripe signatures — you have to hand-roll HMAC in a Code node (CVE-2026-21894 demonstrated real n8n deployments missed this and accepted forged events). (b) Firm provisioning is transactional — n8n's row-by-row execution model isn't built for that. (c) Adds a SPoF (n8n VPS down = no signups).
**Do instead:** Stripe → Next.js route → Postgres TX → optionally fan out to n8n for non-critical side effects.

### Anti-Pattern 3: Public signed URLs in cert emails

**What people do:** Generate a long-TTL signed URL when the cert is created, embed it in the email.
**Why wrong:** Emails get forwarded, screenshotted, archived. A 7-day signed URL leaks indefinitely.
**Do instead:** Email links to `/certificates/{id}` on your domain; that route authenticates, authorizes, then issues a 60-second signed URL on demand.

### Anti-Pattern 4: Storing `role` only in `user_metadata`

**What people do:** Put `role: 'firm_admin'` in Supabase `auth.users.user_metadata`, write RLS that reads `auth.jwt() ->> 'role'`.
**Why wrong:** `user_metadata` is user-settable in some flows. You also lose multi-firm support and history.
**Do instead:** Authoritative role lives in `firm_members.role`. JWT custom claim is allowed as a denormalization for fast reads, but RLS joins `firm_members`.

### Anti-Pattern 5: Trying to do PDF generation in Supabase Edge Functions

**What people do:** "It's a function, just render the PDF there."
**Why wrong:** Documented issues with pdfkit (`Deno.readFileSync` blocked), Puppeteer (no headless Chromium in the runtime), and font loading. Multiple GitHub issues show this is a sinkhole.
**Do instead:** n8n HTML-to-PDF node (already on the operator's VPS, already supported). If n8n ever becomes a bottleneck, move to Cloudflare Browser Rendering API — not Supabase.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---|---|---|
| Stripe Checkout | Next.js creates Session → redirect | Use Session metadata for seat_tier passthrough |
| Stripe Webhooks | Next.js Route Handler, raw body, HMAC verify | App Router: `req.text()`; persist event_id for idempotency |
| Cloudflare Stream | Self-sign JWT with PEM key for video tokens | Avoid the API roundtrip-per-view; cache PEM in Netlify env |
| H5P (in iframe) | `H5P.externalDispatcher.on('xAPI')` → postMessage to parent | **Validate `event.origin`** in parent listener |
| Supabase Auth | `inviteUserByEmail` with metadata | Server-only (admin API requires service role) |
| Supabase DB Webhook | Configured per-table → POST to n8n | Set Authorization header secret; verify in n8n |
| n8n inbound webhooks | Authorization header with shared secret | Reject without secret; rate-limit at reverse proxy |
| n8n outbound to Supabase | Supabase node with service-role key | Treat n8n as a trusted server-side client |
| Email | n8n SMTP node OR Resend via n8n HTTP node | Resend recommended for deliverability on cert emails |

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| Browser ↔ Next.js | App Router routes + Server Actions | Server Actions OK for non-sensitive writes; explicit route for cert URL issuance |
| Next.js ↔ Supabase | supabase-js (service role from server, anon from browser) | Never expose service-role key to client |
| Next.js ↔ n8n | HTTPS POST with shared-secret Authorization header | Fire-and-forget for non-critical; await for critical (currently none) |
| Postgres ↔ n8n | Supabase Database Webhook (Postgres → n8n) and Supabase node (n8n → Postgres) | Both directions used; one-way per workflow |
| H5P iframe ↔ Next.js parent | `postMessage` with origin allowlist | Hard requirement — don't accept `'*'` |

## Sources

- [Supabase: Row Level Security — official docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH
- [Supabase: Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — HIGH
- [Supabase: Database Webhooks](https://supabase.com/docs/guides/database/webhooks) — HIGH
- [Supabase: inviteUserByEmail (JS reference)](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail) — HIGH
- [Supabase: Handling Stripe Webhooks (Edge Function example)](https://supabase.com/docs/guides/functions/examples/stripe-webhooks) — HIGH (we deviate; using Next.js instead — rationale in TL;DR)
- [Supabase: Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments) — HIGH
- [Supabase: The Vibe Coder's Guide to Supabase Environments (blog)](https://supabase.com/blog/the-vibe-coders-guide-to-supabase-environments) — HIGH (confirms separate-projects-over-branching for the 2-project free tier reality)
- [Supabase GH issue: pdfkit on Edge Functions blocklisted](https://github.com/supabase/supabase/issues/30378) — HIGH (load-bearing for "PDF in n8n not Edge")
- [Supabase GH discussion: Best practice for PDF generation from Edge Functions](https://github.com/orgs/supabase/discussions/38327) — MEDIUM (confirms ongoing friction)
- [Cloudflare Stream: Securing your stream + signed URL tokens](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/) — HIGH
- [H5P: xAPI documentation](https://h5p.org/documentation/x-api) — HIGH
- [H5P forum: postMessage from iframe to parent for xAPI](https://h5p.org/node/64552) — MEDIUM
- [Stripe: Resolve webhook signature verification errors](https://docs.stripe.com/webhooks/signature) — HIGH
- [Verify Stripe webhook signature in Next.js (Max Karlsson)](https://maxkarlsson.dev/blog/verify-stripe-webhook-signature-in-next-js-api-routes) — MEDIUM (App Router specifics)
- [Gecko Security: CVE-2026-21894 — n8n missing Stripe signature verification](https://www.gecko.security/blog/cve-2026-21894) — HIGH (load-bearing for "don't put Stripe webhook in n8n")
- [n8n community: Feature proposal — HMAC verification for Webhook node](https://community.n8n.io/t/feature-proposal-hmac-signature-verification-for-webhook-node/223375) — MEDIUM
- [Stacksync: Supabase multi-tenancy patterns](https://www.stacksync.com/blog/supabase-multi-tenancy-crm-integration) — MEDIUM
- [dev.to / IssueCapture: Row-Level Security in Supabase — Multi-Tenant SaaS](https://dev.to/issuecapture/row-level-security-in-supabase-multi-tenant-saas-from-day-one-4lon) — MEDIUM

---
*Architecture research for: AI Compliance Training Platform (Built Smart by Rob)*
*Researched: 2026-05-19*
