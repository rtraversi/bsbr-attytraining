# Roadmap — AI Compliance Training Platform (Built Smart by Rob)

**Created:** 2026-05-19
**Mode:** mvp
**Granularity:** standard
**Total v1 requirements:** 63 (100% mapped)
**Estimated MVP duration:** ~5–6 weeks of solo work
**Source documents:** `PROJECT.md`, `REQUIREMENTS.md`, `research/SUMMARY.md`, `research/PITFALLS.md`, `research/ARCHITECTURE.md`

---

## Strategy

This roadmap follows the **Vertical MVP** build order recommended in `research/SUMMARY.md`. Phase 1 is deliberately an end-to-end *stub* — Architecture's "Hello cert" approach — that validates the riskiest integration path (Stripe → Postgres → DB webhook → n8n → PDF → Storage → email → dashboard) with a "Mark Pass" button **before** the real video player or custom quiz is built. Real video + custom React quiz arrive in Phase 2 to replace the stub.

**Why this ordering:** the operator is solo, in MVP mode; the project constraint allows the platform not to block on curriculum; and the highest-risk surface is the automation backbone. Stub the player and validate the loop in week 1.

Curriculum (real video script + real quiz questions + cert visual design) is produced in **parallel** by the operator. Placeholder content is acceptable through Phase 4; real content drops in before the Phase 5 public launch. Mandatory attorney review of the cert template, marketing landing copy, and TOS is kicked off in Phase 0 and **must be complete before Phase 5 public launch** — surfaced as an external blocker on Phase 5.

---

## Phases

- [ ] **Phase 0: Foundations** — CF Workers scaffold, privacy/TOS/DPA published, RLS-enforced schema with cross-tenant isolation test, audit log, sending domain, Supabase Pro
- [ ] **Phase 1: Hello-cert end-to-end stub** — Paid Stripe checkout → admin invite → employee invite → "Mark Pass" button → trivial PDF cert emailed and downloadable
- [ ] **Phase 2: Articulate Rise 360 content + custom React certification quiz** — Rise 360 interactive web export embedded via iframe (learning layer), custom React quiz with server-side scoring and identity attestation (certifiable layer), replaces "Mark Pass" stub
- [ ] **Phase 3: Firm admin dashboard** — Single-table employee status view, CSV upload, reminders, seat reassignment, audit-log CSV export, firm-level attestation PDF
- [ ] **Phase 4: Automation hardening** — Real branded cert template, expiry-reminder cron (CF Workers Cron Trigger), UptimeRobot alerts, Supabase PITR verified, shared-secret header on the Supabase→Worker webhook
- [ ] **Phase 5: Renewal flow + launch polish** — Stripe renewal at the same flat annual price, 30/14/3-day reminder cadence, 30-day grace period, marketing landing final copy, iPad Safari + Chromebook QA, attorney-reviewed launch

---

## Phase Details

### Phase 0: Foundations
**Goal:** CF Workers scaffold, Supabase schema + RLS, privacy docs, and sending domain are in place — the platform can be safely built on top.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, AUDIT-01, AUDIT-02, AUDIT-03
**Success Criteria** (what must be TRUE):
  1. `pnpm dev` runs locally and `pnpm run deploy` (`opennextjs-cloudflare build && deploy`) deploys a "Hello World" app to **Cloudflare Workers** — Next.js 15.5 (Node.js runtime via `nodejs_compat`), `@opennextjs/cloudflare`, `wrangler.jsonc` + `open-next.config.ts` configured, Supabase dev env wired, `middleware.ts` session refresh running.
  2. Migration `0001_initial_schema.sql` runs cleanly against the dev Supabase project and creates all tables (`firms`, `firm_members`, `enrollments`, `quiz_attempts`, `certificates`, `training_events`, `processed_stripe_events`, `cert_generation_queue`) with RLS enabled and `firm_id` indexed on every tenant-scoped table (FND-02, FND-07).
  3. A developer can run the CI cross-tenant isolation test locally: as a user of `firm_a`, every query against any tenant-scoped table returns zero rows from `firm_b` (FND-03).
  4. The marketing site footer links to live Privacy Policy, Terms of Service, and Data Processing Addendum pages — each reachable on the production domain (FND-01, AUDIT-03).
  5. A test email sent from `noreply@builtsmartbyrob.com` via Resend lands in Gmail, Outlook, and Yahoo inboxes (not spam) with SPF, DKIM, and DMARC all passing (FND-04).
  6. The production Supabase project is on the Pro tier ($25/mo) and documented before any Stripe live-mode connection is attempted (FND-05).
  7. A row inserted into `training_events` cannot be updated or deleted from any non-service-role context, and the standard disclaimer footer is present on every public surface (FND-06, AUDIT-01, AUDIT-02).
**Plans:** TBD
**UI hint:** no

---

### Phase 1: Hello-cert end-to-end stub
**Goal:** Operator can pay $1 in Stripe test mode, receive an admin magic-link, invite an employee, click a "Mark Pass" button, and receive a real (if ugly) PDF certificate via email — the riskiest integration path validated end-to-end.
**Mode:** mvp
**Depends on:** Phase 0
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, CERT-01, CERT-02, CERT-03, CERT-04, CERT-05, CERT-06, CERT-07, CERT-08, CERT-09, AUTO-01, AUTO-02
**Success Criteria** (what must be TRUE):
  1. A buyer can complete Stripe Checkout choosing a seat quantity at per-seat volume pricing ($35/$32/$28 per user/yr by band) with Stripe Tax applied, the refund-policy text visible at checkout, and the firm + admin `firm_members` row provisioned in a single Postgres transaction (PAY-01, PAY-02, PAY-04, PAY-06, PAY-07).
  2. Re-sending the same `checkout.session.completed` event from the Stripe dashboard produces no duplicate firm, no duplicate seat allocation, and no duplicate invite email (PAY-03).
  3. The firm admin receives a magic-link email from `noreply@builtsmartbyrob.com`, sets a password on first visit, can log in / log out / use "forgot password," can invite an employee by name + email, and can resend any pending invite with one click (AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05).
  4. An employee on the "Mark Pass" stub page can trigger a `quiz_attempts.passed=true` insert; the Supabase DB Webhook fires to the CF Worker cert endpoint; within ~2 minutes a PDF certificate (containing recipient name, course name + version, issue date, expiry date = +365 days, score, firm name, unique `BSBR-YYYY-XXXX-XXXX` ID, Rule 5.3 framework reference, and the strict disclaimer) is uploaded to Supabase Storage, a `certificates` row is inserted, and the cert is emailed to the employee via Resend (CERT-01, CERT-02, CERT-03, CERT-04, CERT-05, CERT-06).
  5. If the CF Worker cert endpoint fails (e.g. Supabase Storage timeout), the `cert_generation_queue` row persists and is picked up by the CF Cron drain within 5 minutes — no cert is silently lost (AUTO-01, AUTO-02).
  6. Both the firm admin and the cert owner can re-download any certificate from the dashboard via `/api/certificates/[id]/url`, which authenticates the caller and returns a 60-second signed Supabase Storage URL; the expiry-tracking column (`expires_at`) is populated and queryable (CERT-07, CERT-08, CERT-09, PAY-05).
**Plans:** TBD
**UI hint:** yes

---

### Phase 2: Articulate Rise 360 content + custom React certification quiz
**Goal:** Employees work through a real Articulate Rise 360 interactive training module and then take the custom React certification quiz with identity attestation — the "Mark Pass" stub from Phase 1 is replaced by a real, server-trusted pass/fail loop.

> ✅ **Course format locked (2026-06-18, Rob):** Articulate Rise 360 interactive web export is the learning layer (authored by Rob + Katy, attorney). Hosted on CF R2 or Articulate's hosting, embedded via iframe. Rise reports no scores — all certifiable events live in the custom React quiz. Cloudflare Stream is NOT required at launch.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** COURSE-01, COURSE-02, COURSE-03, COURSE-04, COURSE-05, COURSE-06, COURSE-07, COURSE-08, COURSE-09, COURSE-10, COURSE-11
**Success Criteria** (what must be TRUE):
  1. An enrolled employee navigating to the training page sees the Articulate Rise 360 interactive course embedded via iframe; the training page is enrollment-gated server-side; the Rise content loads from its hosting origin (CF R2 or Articulate hosting) over HTTPS; the content is WCAG 2.1 AA accessible (COURSE-01, COURSE-02, COURSE-03).
  2. An employee who leaves and returns to the training page resumes from their last position within the Rise content (Rise handles this internally via localStorage); a "Begin Certification Quiz" button is not accessible until the employee explicitly confirms they have completed the training (COURSE-04, COURSE-05).
  3. After confirming training completion, the employee takes a multiple-choice quiz drawn from a randomized question pool (pool ≥ 3× per-attempt count), one question at a time, with no back button — each answered question is locked before the next appears (COURSE-06, COURSE-07).
  4. At quiz submit, the employee must check an identity-attestation checkbox; the attestation timestamp, IP, and user-agent are recorded in `training_events`, and the pass/fail decision is computed server-side in `/api/quiz/attempt` against `courses.pass_threshold` — a forged client-side score is rejected (COURSE-08, COURSE-09).
  5. A failed employee can retake the quiz with a fresh randomized subset every attempt (unlimited retakes); on pass, the employee sees an immediate "Congratulations — your certificate is being generated" confirmation and receives the cert email within 5 minutes (COURSE-10, COURSE-11).
**Plans:** TBD
**UI hint:** yes

---

### Phase 3: Firm admin dashboard
**Goal:** A firm admin can see, manage, remind, and report on their entire staff's training status from a single screen — including the firm-level attestation PDF that is the product's primary differentiator.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07, DASH-08, DASH-09
**Success Criteria** (what must be TRUE):
  1. A firm admin lands on `/dashboard` and sees a single sortable table of all firm employees with columns: name, email, status (not started / in progress / passed / expired), latest score, completion date, cert link — default sort = incomplete-first (DASH-01).
  2. The admin can add an employee individually by name + email (triggers the AUTH-02 invite flow) and can bulk-upload via CSV with name + email columns; the system validates the CSV, dedupes against existing employees, and dispatches invites only to new rows (DASH-02, DASH-03).
  3. The admin can click "Remind" on any incomplete row to dispatch a reminder email; can reassign a seat (soft-deletes the departed employee's `firm_members` row while preserving their `certificates` and `training_events` for the audit log); and can self-serve "delete employee record" to redact PII while preserving cert-ID + dates + event log entries (DASH-04, DASH-05, DASH-09).
  4. The admin can export the firm's full audit log as a CSV (one row per `training_events` entry joined with employee name/email at event time) and can generate a one-page "firm attestation" PDF listing every currently-certified staff member with cert ID, issue date, expiry date, and the Rule 5.3 disclaimer (DASH-06, DASH-07).
  5. A static "What this certificate means under ABA Model Rule 5.3" expandable explainer appears on the dashboard with plain-English copy (DASH-08).
**Plans:** TBD
**UI hint:** yes

---

### Phase 4: Automation hardening
**Goal:** Replace the trivial Phase 1 cert template with the real branded template, harden the CF Worker automation against silent failure, and wire the expiry-reminder cadence — production-grade operational guardrails before exposing the platform to real customers.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** AUTO-03, AUTO-04, AUTO-05, AUTO-06
**Success Criteria** (what must be TRUE):
  1. A CF Workers Cron Trigger fires daily and emits expiry-reminder emails (via Resend REST API) to firm admins and employees at 90, 30, and 7 days before each cert's `expires_at` (AUTO-03).
  2. UptimeRobot (or equivalent) external health check pings the CF Worker health endpoint (`GET /workers/health`) every 5 minutes; operator receives SMS alert if the endpoint is down >5 minutes (AUTO-04).
  3. The Supabase DB Webhook POST to the CF Worker requires `X-Webhook-Secret` verified at the top of the handler; missing or wrong secret returns 401 (AUTO-05).
  4. All CF Worker secrets are recorded in the operator's password manager; Supabase PITR is confirmed enabled on the prod project; a restore test has been performed against the dev Supabase project (AUTO-06).
  5. The branded cert PDF template (BSBR logo as embedded base64, typography, layout, disclaimer block) replaces the trivial Phase 1 template via `pdf-lib` — visual review passes on screen and print.
**Plans:** TBD
**UI hint:** no

---

### Phase 5: Renewal flow + launch polish
**Goal:** Annual renewal at the same flat annual price is wired end-to-end with the pre-renewal email cadence, expiry/grace logic, marketing landing copy, and cross-browser QA — the platform is ready for public launch under the Built Smart by Rob brand.
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** RENEW-01, RENEW-02, RENEW-03, RENEW-04, RENEW-05, RENEW-06
**Success Criteria** (what must be TRUE):
  1. 30 days before a firm's annual cycle ends, every firm admin receives a summary email of staff cert status with a one-click "Renew now" link; if the firm has not renewed, follow-up emails fire at 14 and 3 days pre-renewal (RENEW-01, RENEW-02).
  2. The renewal Checkout flow reuses the same single volume-tiered Price ID and the firm's seat quantity (per-seat volume $35/$32/$28 — no renewal discount); a successful renewal automatically re-enrolls every currently-active employee from the prior cycle, departed employees are NOT re-enrolled, and re-enrolled employees are notified by email (RENEW-03, RENEW-04).
  3. When a certificate's `expires_at` passes, its dashboard status flips to "expired"; the employee retains read access to past cert PDFs for the 7-year retention window but cannot generate a new cert without re-enrollment (RENEW-05).
  4. A 30-day grace period applies after `expires_at` during which a firm can renew at the renewal price without losing continuity of supervision documentation; after grace, the renewal flow treats it as a fresh purchase at full price (RENEW-06).
  5. The marketing landing page final copy is published, the attorney review of cert + landing copy + TOS is complete (signed sign-off recorded), and the platform passes manual QA on real iPad Safari and a real Chromebook (Stream player, custom quiz overlay, dashboard, cert download).
**Plans:** TBD
**UI hint:** yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Foundations | 0/0 | Not started | — |
| 1. Hello-cert end-to-end stub | 0/0 | Not started | — |
| 2. Real video + custom React quiz | 0/0 | Not started | — |
| 3. Firm admin dashboard | 0/0 | Not started | — |
| 4. Automation hardening | 0/0 | Not started | — |
| 5. Renewal flow + launch polish | 0/0 | Not started | — |

---

## External Blockers

- **Attorney review of cert template + marketing landing copy + TOS** — kicked off in Phase 0; must be complete before Phase 5 public launch. Budget $500–$1,500. Without this, marketing claims that read as accreditation or legal advice are unmitigated (Pitfall 1).
- **Real course curriculum (video + quiz question pool)** — produced in parallel by the operator. Platform accepts placeholder content through Phase 4; real content must drop in before Phase 5 launch.
- **Stripe Tax registration in operator's home state** — required before Phase 1 live-mode connection; CPA consult recommended (~$300–$500).

---

## Research Flags for Deeper Planning

- **Phase 2 fallback:** If the custom React quiz exceeds ~5 days of work or the question pool grows beyond 50 items with rich media, pivot to H5P Path A. Fallback decision documented in `research/SUMMARY.md`; implementation isn't planned.
- **Phase 4 fallback:** If Puppeteer in n8n proves flaky, alternatives (PDF Generator API, DocRaptor, Browserless, self-hosted Gotenberg) are listed in `research/STACK.md` but not benchmarked.
- **Phase 5 deferred:** Proration math for mid-cycle seat upgrades is v2 (out-of-scope for MVP per REQUIREMENTS.md v2 list).
