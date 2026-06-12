# Requirements — AI Compliance Training Platform

**Source documents:** `PROJECT.md`, `research/SUMMARY.md`, `research/FEATURES.md`, `research/PITFALLS.md`
**Defined:** 2026-05-19

---

## v1 Requirements

REQ-IDs use `CATEGORY-NN` format. Each requirement is user-centric, specific, and testable.

### Foundations (FND)

- [ ] **FND-01**: System has a public Privacy Policy, Terms of Service, and Data Processing Addendum reachable from the marketing site footer
- [ ] **FND-02**: Database has Row Level Security enabled on every tenant-scoped table from migration 0001 (`firms`, `firm_members`, `enrollments`, `quiz_attempts`, `certificates`, `training_events`, `processed_stripe_events`, `cert_generation_queue`)
- [ ] **FND-03**: Two seed firms exist in dev and a cross-tenant isolation integration test runs in CI before every merge
- [ ] **FND-04**: All transactional email is sent from a verified sending domain (`builtsmartbyrob.com`) with SPF, DKIM, and DMARC configured
- [ ] **FND-05**: Production Supabase project is on the Pro tier ($25/mo) before Stripe is connected in live mode
- [ ] **FND-06**: Every cert, checkout flow, and marketing page surface carries the strict disclaimer footer: *"This certificate documents completion of training. It is not legal advice and does not constitute accreditation by the ABA or any state bar."*
- [ ] **FND-07**: The data model uses a single `firm_members(firm_id, user_id, role)` table with `role ∈ {firm_admin, employee}` (an `employees` VIEW MAY be exposed for UI/API clarity but the underlying table is `firm_members`)

### Authentication & Onboarding (AUTH)

- [ ] **AUTH-01**: After successful Stripe checkout, the firm admin receives a magic-link email and sets a password on first visit
- [ ] **AUTH-02**: A firm admin can invite an employee by entering name + email; the employee receives a magic-link email and sets a password on first visit
- [ ] **AUTH-03**: Any user can log in with email + password and stay logged in across browser sessions
- [ ] **AUTH-04**: Any user can request a "forgot password" reset by email
- [ ] **AUTH-05**: A firm admin can resend any pending invite from the dashboard (one click per row)

### Checkout & Provisioning (PAY)

- [ ] **PAY-01**: A buyer can complete Stripe Checkout for one of three fixed tiers — Basic (≤5 seats / $199), Standard (6–15 seats / $349), Pro (16+ seats / $499) — billed annually
- [ ] **PAY-02**: Stripe webhooks are received by a Next.js Route Handler that verifies the HMAC signature on the raw body and rejects unsigned requests
- [ ] **PAY-03**: Webhook handling is idempotent — the same Stripe event ID processed twice produces no duplicate firm, seat allocation, or invite
- [ ] **PAY-04**: On `checkout.session.completed`, the system creates the firm record, allocates seats per tier, creates the firm-admin `firm_members` row, and triggers the AUTH-01 magic-link invite — all in a single Postgres transaction
- [ ] **PAY-05**: A firm admin can click "Manage billing" from the dashboard and be redirected to the Stripe Customer Portal (managed by Stripe — payment method, invoices, cancellation)
- [ ] **PAY-06**: Stripe Tax is enabled on the Stripe account and applied to every Checkout session before the account is switched to live mode
- [ ] **PAY-07**: The checkout page displays a refund policy: *"Refunds available within 14 days of purchase AND only if no certificate has yet been issued. Once any certificate is issued, the purchase is non-refundable."* The refund-eligibility check enforces both conditions

### Course Delivery & Quiz (COURSE)

> 📝 **Course-format pivot (2026-06-12, pending trial validation):** Course content is moving from a single 20–30 min video to **interactive Articulate Rise 360 content** (hosted web export: flip cards, scenarios, click-to-reveal, *ungraded* knowledge checks) followed by the **custom React certification quiz** as the certifiable layer. Rob is validating Rise via the 30-day Articulate 360 trial before the $1,449/yr commit. COURSE-06..11 (quiz, attestation, server-side scoring) are unaffected. COURSE-01..05 (video player) will be rewritten once the trial decision locks — Cloudflare Stream likely shrinks to short clips embedded within the interactive content.

- [ ] **COURSE-01**: An enrolled employee can view a single course page that loads a Cloudflare Stream video via a signed playback URL minted server-side on page load (4–8h TTL)
- [ ] **COURSE-02**: The Cloudflare Stream signed playback configuration locks Allowed Origins to the production domain
- [ ] **COURSE-03**: The video player displays closed captions (provided by Cloudflare Stream)
- [ ] **COURSE-04**: The video player persists playback position every 30 seconds; on re-entry, the employee resumes from the last persisted position
- [ ] **COURSE-05**: The video player shows a visible progress indicator (percentage watched)
- [ ] **COURSE-06**: After watching the video, the employee takes a multiple-choice quiz drawn from a randomized question pool (per-attempt count is a subset of the pool, ≥3× pool/attempt ratio)
- [ ] **COURSE-07**: The quiz presents one question at a time, with no back button — once the employee advances, the prior answer is locked
- [ ] **COURSE-08**: On quiz submit, the employee must check an identity attestation checkbox stating they personally completed the training; the attestation timestamp, IP address, and user-agent are recorded in `training_events`
- [ ] **COURSE-09**: The pass/fail decision is computed server-side in `/api/quiz/attempt` against `courses.pass_threshold` (default 80%); the client's score is never trusted
- [ ] **COURSE-10**: An employee who fails can retake the quiz unlimited times; each attempt draws a fresh randomized subset from the pool
- [ ] **COURSE-11**: On pass, the employee sees an immediate "Congratulations — your certificate is being generated" confirmation and receives the cert by email within 5 minutes

### Certificate Generation (CERT)

- [ ] **CERT-01**: When a `quiz_attempts` row is inserted with `passed = true`, a Supabase Database Webhook fires an authenticated HTTP POST to a dedicated CF Worker endpoint that handles all cert generation
- [ ] **CERT-02**: The CF Worker cert endpoint generates the certificate PDF using `pdf-lib` (pure JS, no headless browser), writes the PDF bytes to Supabase Storage, and continues the pipeline
- [ ] **CERT-03**: The generated PDF is uploaded to a private Supabase Storage bucket pathed `{firm_id}/{firm_member_id}.pdf`
- [ ] **CERT-04**: The PDF contains: recipient name, course name, course version, issue date, expiry date (issue + 365 days), score, issuing firm name, unique cert ID in the format `BSBR-{YYYY}-{4 alphanumeric}-{4 alphanumeric}`, the ABA Model Rule 5.3 Framework reference, and the strict disclaimer (FND-06)
- [ ] **CERT-05**: A `certificates` row is inserted recording the cert ID, recipient `firm_members.id`, issue date, expiry date, course version, score, and storage path
- [ ] **CERT-06**: A certificate-issued email is sent to the employee with a link to a Next.js endpoint (not a raw storage URL)
- [ ] **CERT-07**: The Next.js endpoint `/api/certificates/[id]/url` authenticates the caller (cert owner OR firm admin of the issuing firm) and returns a 60-second signed Supabase Storage URL
- [ ] **CERT-08**: A firm admin can re-download any of their firm's certificates from the dashboard (uses CERT-07)
- [ ] **CERT-09**: Each cert has a 12-month validity window; the system tracks `expires_at` and surfaces expiry status in the firm dashboard

### Firm Admin Dashboard (DASH)

- [ ] **DASH-01**: A firm admin sees a single-table view of all their firm's employees with columns: name, email, status (not started / in progress / passed / expired), latest score, completion date, cert link (when issued); default sort = incomplete-first
- [ ] **DASH-02**: A firm admin can add an employee individually by name + email (triggers AUTH-02 invite)
- [ ] **DASH-03**: A firm admin can bulk-add employees via CSV upload (columns: name, email); the system validates the CSV, dedupes against existing employees, and triggers AUTH-02 invites for each new row
- [ ] **DASH-04**: A firm admin can click "Remind" per row to resend a reminder email to incomplete employees
- [ ] **DASH-05**: A firm admin can reassign a seat — soft-deleting one `firm_members.employee` and replacing them with a new invitee; the departed employee's `firm_members` row is marked inactive but their `certificates` and `training_events` remain in the audit log permanently
- [ ] **DASH-06**: A firm admin can export their firm's full audit log as CSV (one row per `training_events` entry, joined with employee name/email at time of event)
- [ ] **DASH-07**: A firm admin can click "Generate firm attestation" to receive a one-page PDF stating: "As of [today], the following members of [Firm Name] hold active training certification under the ABA Model Rule 5.3 Framework: [name, cert ID, issue date, expiry date for each]." Includes the FND-06 disclaimer.
- [ ] **DASH-08**: The dashboard displays a static "What this certificate means under ABA Model Rule 5.3" expandable explainer with plain-English copy
- [ ] **DASH-09**: A firm admin can self-serve "delete this employee record" — redacts PII (name → "Redacted", email → null) on the `firm_members` row while preserving the cert ID, issue/expiry dates, and event log entries for compliance traceability

### Automation & Reminders (AUTO)

- [ ] **AUTO-01**: A CF Worker endpoint (`POST /workers/cert-generate`) handles all cert generation and email sending; it is triggered by a Supabase Database Webhook on `quiz_attempts.passed = true`; no n8n, no VPS, no external automation runtime
- [ ] **AUTO-02**: A `cert_generation_queue` table acts as a dead-letter queue — the CF Worker writes "needs cert" rows on failure; a CF Workers Cron Trigger (every 5 minutes) re-processes failed rows with exponential backoff; rows that fail 3 times alert the operator via Resend email
- [ ] **AUTO-03**: A CF Workers Cron Trigger sends expiry-reminder emails (via Resend REST API) at 90, 30, and 7 days before each cert's `expires_at`
- [ ] **AUTO-04**: An UptimeRobot (or equivalent) external health check pings a CF Worker health endpoint (`GET /workers/health`) every 5 minutes and SMS-alerts the operator on failure
- [ ] **AUTO-05**: The Supabase Database Webhook POST to the CF Worker cert endpoint requires a shared-secret header (`X-Webhook-Secret`) checked at the top of the Worker; missing or wrong secret returns 401
- [ ] **AUTO-06**: All CF Worker secrets (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `CERT_WEBHOOK_SECRET`, `CF_STREAM_KEY_PEM`) are documented in the operator's password manager; Supabase PITR (point-in-time recovery) is verified enabled on the prod project before launch

### Audit & Privacy (AUDIT)

- [ ] **AUDIT-01**: An append-only `training_events` table records (firm_id, firm_member_id, event_type, event_timestamp, ip_address, user_agent, metadata_json) for every user action: invite_sent, login, video_started, video_completed, quiz_attempt, identity_attestation, cert_issued, cert_downloaded, seat_reassigned, employee_record_deleted
- [ ] **AUDIT-02**: `training_events` rows are insert-only (RLS policy denies UPDATE and DELETE on this table; service-role bypass is restricted to the operator)
- [ ] **AUDIT-03**: PII retention is documented in the Privacy Policy as 7 years post-cert (regulatory minimum for Rule 5.3 supervision documentation); after that window an operator-scripted cleanup redacts old rows

### Renewal (RENEW)

- [ ] **RENEW-01**: 30 days before a firm's annual cycle ends, all firm admins receive an email summarizing their staff's cert status and a one-click "Renew now" link
- [ ] **RENEW-02**: Renewal emails repeat at 14 days and 3 days pre-renewal if the firm has not yet renewed
- [ ] **RENEW-03**: Each Stripe Product has a `renewal_price` Price ID set to 60% of the first-year price (Basic $119, Standard $209, Pro $299); the renewal Checkout flow uses the renewal Price ID
- [ ] **RENEW-04**: After a successful renewal, all currently-active employees from the prior cycle are automatically re-enrolled and notified; departed employees are NOT re-enrolled
- [ ] **RENEW-05**: When a cert's `expires_at` passes, its status flips to "expired" in the dashboard; the employee retains read access to past cert PDFs for the 7-year retention window but cannot generate a new cert without re-enrollment
- [ ] **RENEW-06**: A 30-day grace period applies after `expires_at` during which a firm can renew at the renewal price without losing continuity of supervision documentation; after grace, the renewal is treated as a fresh purchase

---

## v2 Requirements (Deferred — Not Out of Scope, Just Not Now)

- Mid-cycle seat upgrade flow (firm grew 5 → 12 staff in-cycle)
- Manual cert revocation by firm admin (staff terminated for misconduct)
- Staff-side profile editing (name/email updates by staff themselves)
- Postmark as deliverability upgrade path if Resend issues arise
- Operator admin UI (deferred until 3+ paying firms)
- Real branded cert template polish (Phase 4 ships a working but plain template; visual design pass is a half-day item)
- Real-content quarterly update cadence for ABA opinion changes

## Out of Scope (Explicit Exclusions)

- State-specific course variants (TX, CA, NY, FL) — single ABA Model Rule 5.3 generic course only
- Mid-to-large firm sales motion (15+ staff custom pricing, SSO, POs) — v1 is self-serve only
- Course catalog / multiple courses / learning paths — one course only
- Gamification (badges, leaderboards, streaks)
- Social features (comments, discussion boards, sharing)
- In-product chat or chatbot
- HRIS integrations (BambooHR, Gusto, ADP)
- Time-locked retakes or attempt caps — unlimited retakes is a value prop
- Mobile native app — responsive web only
- Proctoring (webcam, browser lockdown)
- SSO / SAML / SCIM
- In-product NPS / sentiment surveys
- Free trial — the cert *is* the product
- Make.com / Zapier / n8n / any external automation platform — CF Workers is the only automation runtime
- Public certificate verification page (third-party cert ID lookup)
- CLE credit accreditation — different product motion
- Free tier of the product

---

## Definition of Done

A requirement is complete when:

1. The behavior described is observable in the running application (manually testable by following the requirement text as a script)
2. An automated test covers it (unit, integration, or e2e — appropriate to the layer)
3. The relevant `training_events` row(s) are emitted for any user action
4. RLS policies prevent the action from being performed on or seen by another firm's data
5. The relevant disclaimer / privacy / audit guardrail from the FND or AUDIT categories is in place

---

## Traceability

Every v1 REQ-ID is mapped to exactly one phase. Coverage: **63 / 63 (100%)**.

| REQ-ID | Phase |
|--------|-------|
| FND-01 | Phase 0 |
| FND-02 | Phase 0 |
| FND-03 | Phase 0 |
| FND-04 | Phase 0 |
| FND-05 | Phase 0 |
| FND-06 | Phase 0 |
| FND-07 | Phase 0 |
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| AUTH-04 | Phase 1 |
| AUTH-05 | Phase 1 |
| PAY-01 | Phase 1 |
| PAY-02 | Phase 1 |
| PAY-03 | Phase 1 |
| PAY-04 | Phase 1 |
| PAY-05 | Phase 1 |
| PAY-06 | Phase 1 |
| PAY-07 | Phase 1 |
| COURSE-01 | Phase 2 |
| COURSE-02 | Phase 2 |
| COURSE-03 | Phase 2 |
| COURSE-04 | Phase 2 |
| COURSE-05 | Phase 2 |
| COURSE-06 | Phase 2 |
| COURSE-07 | Phase 2 |
| COURSE-08 | Phase 2 |
| COURSE-09 | Phase 2 |
| COURSE-10 | Phase 2 |
| COURSE-11 | Phase 2 |
| CERT-01 | Phase 1 |
| CERT-02 | Phase 1 |
| CERT-03 | Phase 1 |
| CERT-04 | Phase 1 |
| CERT-05 | Phase 1 |
| CERT-06 | Phase 1 |
| CERT-07 | Phase 1 |
| CERT-08 | Phase 1 |
| CERT-09 | Phase 1 |
| DASH-01 | Phase 3 |
| DASH-02 | Phase 3 |
| DASH-03 | Phase 3 |
| DASH-04 | Phase 3 |
| DASH-05 | Phase 3 |
| DASH-06 | Phase 3 |
| DASH-07 | Phase 3 |
| DASH-08 | Phase 3 |
| DASH-09 | Phase 3 |
| AUTO-01 | Phase 1 |
| AUTO-02 | Phase 1 |
| AUTO-03 | Phase 4 |
| AUTO-04 | Phase 4 |
| AUTO-05 | Phase 4 |
| AUTO-06 | Phase 4 |
| AUDIT-01 | Phase 0 |
| AUDIT-02 | Phase 0 |
| AUDIT-03 | Phase 0 |
| RENEW-01 | Phase 5 |
| RENEW-02 | Phase 5 |
| RENEW-03 | Phase 5 |
| RENEW-04 | Phase 5 |
| RENEW-05 | Phase 5 |
| RENEW-06 | Phase 5 |

### Phase Coverage Summary

| Phase | Requirement count | Categories |
|-------|-------------------|------------|
| Phase 0 — Foundations | 10 | FND-01..07, AUDIT-01..03 |
| Phase 1 — Hello-cert end-to-end stub | 23 | AUTH-01..05, PAY-01..07, CERT-01..09, AUTO-01..02 |
| Phase 2 — Real video + custom React quiz | 11 | COURSE-01..11 |
| Phase 3 — Firm admin dashboard | 9 | DASH-01..09 |
| Phase 4 — Automation hardening | 4 | AUTO-03..06 |
| Phase 5 — Renewal flow + launch polish | 6 | RENEW-01..06 |
| **Total** | **63** | **9 categories, 0 orphans** |
