# Research Summary — AI Compliance Training Platform (Built Smart by Rob)

**Synthesized:** 2026-05-19
**Inputs:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Overall confidence:** HIGH on stack, architecture, anti-features, and pitfalls; MEDIUM on differentiator-vs-table-stakes splits (subjective by definition).

---

## Executive Summary

This is a one-course, one-cert compliance product for solo and small attorney firms (1–15 staff). The **artifact** — a defensible audit trail plus a clean PDF certificate referencing ABA Model Rule 5.3 — is the value. The training is the smallest viable wrapper around that artifact. Every architectural and feature decision should be filtered through one question: *does it make the artifact more defensible, or the path to it shorter?* If neither, it is an anti-feature for v1.

The stack is locked by the operator (Next.js on Netlify PRO, Supabase, Cloudflare Stream, Stripe, n8n self-hosted) and all four research streams agree it is the right shape for the price point ($199–$499/yr) and the segment. The two genuinely open technical decisions are: (1) the quiz layer (resolved below in favor of a custom React quiz, **not** H5P), and (2) the build order (resolved below in favor of an end-to-end "Hello cert" stub first, then real video).

The dominant risks are not technical — they are legal-framing risks (calling the cert "ABA-compliant" or "Rule 5.3 compliant" invites a bar complaint), data-privacy hygiene (attorney buyers vendor-audit their own vendors), and operator burnout from over-engineering. The architecture is small. The discipline required to keep it small is large.

---

## Key Findings (Top 7 Highest-Leverage Takeaways)

1. **The cert is evidence of training, not an accreditation.** Marketing, certificate language, and TOS must scrupulously avoid "ABA-approved," "Rule 5.3 compliant," "guarantees supervision compliance." A licensed-attorney review of cert + landing page + TOS ($500–$1,500) is a prerequisite to taking real payments. This is the single most important non-technical finding.

2. **Stripe webhook lands in Next.js, not n8n.** Three of the four research streams (Architecture, Pitfalls, and implicitly Stack) converge on this. n8n has no built-in HMAC verification (CVE-2026-21894 demonstrated real exploits), firm provisioning is transactional and belongs next to Postgres, and the synchronous critical path should be one process. n8n becomes a fan-out target for non-critical side effects (welcome email, Slack ping), never the system of record.

3. **PDF generation lives in n8n, not Netlify Functions, not Supabase Edge Functions.** Unanimous across Stack, Architecture, and Pitfalls. Netlify's 26s timeout plus Chromium cold-starts is unreliable; Supabase Edge Functions have documented friction with pdfkit/Puppeteer; n8n on the VPS has no timeout, persistent workers, and a native HTML→PDF (Puppeteer) node. This is the right boundary.

4. **The quiz layer is a custom React component, not H5P.** STACK recommended "H5P Path A" (CF Stream iframe + separate H5P Question Set below) on cost/licensing grounds. PITFALLS correctly identified that H5P has no Cloudflare Stream adapter and that for a single multiple-choice quiz pool, ~150–200 lines of React beats the H5P toolchain on every axis except authoring UX. Resolved in favor of custom React — trade-off documented below.

5. **Supabase Pro tier ($25/mo) is a launch prerequisite, not a future upgrade.** Free-tier auto-pause after 7 days inactivity and the 2-project cap are incompatible with paying customers. Budget item. Both Stack and Pitfalls flag this explicitly.

6. **Build the end-to-end loop first with stubs, before any real video player.** Architecture's "Phase A = Hello cert" recommendation is the right call for this operator. The riskiest integrations (Stripe webhook → Postgres → n8n → PDF → Storage → email → dashboard) all live on the automation backbone. Validate it with a "Mark Pass" button in week 1; do not invest in player polish until the backbone is proven. This explicitly aligns with the project constraint that the platform must not block on content.

7. **Collapse `employees` into `firm_members(firm_id, user_id, role)`.** A single membership table with `role ∈ {firm_admin, employee}` is the right model. It supports future "a user is admin of Firm A *and* enrolled at Firm B" cleanly, keeps RLS policies uniform, and saves a join. Operator's original `employees` terminology can survive as a VIEW (`firm_members WHERE role='employee'`) if helpful in UI code, but the underlying table is `firm_members`.

---

## Recommended Stack (Decisive Picks)

### Locked Choices

| Layer | Choice | Version / Notes |
|---|---|---|
| Frontend / SSR | **Next.js 15.5 LTS (App Router only)** on Netlify PRO | Do not adopt 16.x on Netlify until 2–3 patch releases land. App Router exclusively. |
| Runtime | React 18.3 + TypeScript 5.6 | |
| Styling | Tailwind v4.1 (CSS-first `@theme`) | |
| Auth + DB + Storage | **Supabase** — `@supabase/supabase-js` ^2.49, `@supabase/ssr` ^0.6 | **Upgrade prod to Pro ($25/mo) before launch.** Do NOT use deprecated `@supabase/auth-helpers-nextjs`. |
| Database | Postgres 15 (Supabase managed) | Source of truth. RLS on every table. Index every `firm_id` column. |
| Video | **Cloudflare Stream** (paid add-on) | Signed URLs only; refresh on every page load (4–8h TTL); Allowed Origins locked to production domain. |
| Payments | **Stripe** — Node SDK v17, API `2025-09-30.acacia` | Three Products (one per tier), each with `first_price` + `renewal_price` (60% of original). Seat tier in subscription metadata, not Stripe `quantity`. **Stripe Tax ON from day one.** |
| Automation | **n8n self-hosted** at `n8n.katychavezlaw.com` | All async work. Uptime monitoring (UptimeRobot/BetterStack) non-optional. |
| PDF generation | **n8n + Puppeteer (`n8n-nodes-puppeteer`)** | NOT in Netlify Functions. NOT in Supabase Edge Functions. |
| Email | **Resend** (via n8n) — Postmark as upgrade path | SPF + DKIM + DMARC on `builtsmartbyrob.com` before first send. |
| Email templating | `react-email` rendered server-side in Next.js, HTML passed to n8n | |

### Quiz Layer Decision — RESOLVED

**Verdict: Custom React quiz overlay over the Cloudflare Stream native player. NOT H5P. NOT Articulate Rise.**

STACK correctly eliminated Articulate Rise ($1,449/yr per author destroys the unit economics) and recommended H5P Path A. PITFALLS then made the harder integration call: H5P has no Cloudflare Stream adapter (supported sources: YouTube, Vimeo, Panopto only). Path A technically works (video and quiz are separate components on the same page), but it imports the entire H5P runtime, the `.h5p` authoring/build pipeline, the xAPI dispatch contract, and the iframe-postMessage gymnastics to capture scores. For a single quiz pool of ~24–32 multiple-choice questions with one-question-at-a-time and randomization, a React component is ~150–200 lines, has zero new dependencies, writes directly to `/api/quiz/attempt`, and supports every retake-mechanics requirement FEATURES lists.

**Trade-off the operator is accepting:** No xAPI standard, no portability to an LMS, no third-party authoring tool. For a one-course product with the cert as the artifact, none of those matter. If v2 ever adds multi-course or LMS integration, revisit.

**Migration safety net:** If the custom quiz proves to be more than ~5 days of work or the question pool grows beyond 50 items with rich media, fall back to H5P Path A. The decision is reversible because the quiz layer is server-trusted (score validated in `/api/quiz/attempt`) and decoupled from the video player.

### Locked Architectural Decisions

- **Stripe webhook → Next.js Route Handler** at `app/api/webhooks/stripe/route.ts`. Raw body, HMAC verified, idempotency table (`processed_stripe_events PRIMARY KEY event_id`), service-role Postgres write transactional, fire-and-forget POST to n8n for non-critical side effects. **Never n8n directly.**
- **PDF generation in n8n** triggered by Supabase Database Webhook on `quiz_attempts.passed = true`. Render HTML→PDF, upload to Storage (private bucket), insert `certificates` row, send email via Resend.
- **Cert downloads** stream through Next.js `/api/certificates/[id]/url`, which authenticates the caller (cert owner or firm admin), then issues a **60-second** signed Supabase Storage URL. No raw storage URLs in emails — emails link to the Next.js endpoint.
- **Auth: one Supabase user pool, role on membership.** `firm_members(firm_id, user_id, role)` is the source of truth. `app_metadata` (server-set, read-only from client) may cache `firm_id`/`role` as a JWT claim for fast UI rendering. Never `user_metadata`.
- **Magic-link invite** for both firm admin (post-Stripe-checkout) and employees (firm-admin-initiated). Password is set on first visit; thereafter password + magic-link backup.
- **Environments:** two Supabase projects (`attytraining-dev`, `attytraining-prod`). Netlify branch deploys + local dev all point at `dev`. Prod points at `prod`. Free-tier 2-project cap forces this.

---

## Table Stakes Features

**Firm admin (buyer):**
- Single-table dashboard: name, email, status, score, completion date, cert link — one screen, sortable, no drilldowns
- Add staff via individual entry OR CSV upload
- Resend invite + manual reminder button per row
- Cert reprint/download from admin view
- Stripe Customer Portal redirect (billing, payment method, renewal)
- Per-seat assignment + completion timestamps visible
- Seat reassignment when staff departs — **cert of departed staff remains in audit log permanently**
- Email notification to admin on each staff completion
- Account-level CSV export of audit log

**Staff (end user):**
- Email invite → set password on first visit → log in
- Resume-where-you-left-off video player (persist position every 30s)
- Mobile-responsive (test on real iPad Safari + Chromebook before launch)
- Closed captions on the video (Cloudflare Stream)
- Progress indicator (% complete)
- Pass/fail feedback immediately after each attempt
- Personal cert copy emailed to staff member (not just admin)

**Compliance evidence:**
- Unique cert ID (e.g., `BSBR-2026-A7K9-3M2P`) printed on PDF + stored in DB
- Cert fields: recipient name, course name, **course version**, issue date, expiry date, score, issuer (BSBR + firm), Rule 5.3 framework reference, disclaimer
- Identity attestation checkbox at quiz submit (timestamp + IP + UA captured)
- Immutable append-only `training_events` log: invite_sent, login, video_started, video_completed, quiz_attempt, identity_attestation, cert_issued, cert_downloaded, seat_reassigned
- 12-month expiry tracking + automated 90/30/7 day reminder cadence (n8n cron)

---

## Differentiators

- **Single course, single price, no SKU forest.** Positioning differentiator enforced by the codebase. "Pay $199, certify 5 staff, done."
- **Firm-level compliance attestation PDF export** (one button → one-page PDF: "On [date], all 5 staff of [Firm Name] held active Rule 5.3 training certification. Cert IDs, dates, scores attached."). **The artifact attorneys hand to their malpractice carrier.** No competitor produces this.
- **Plain-English explainer of what the cert proves** inline in the dashboard ("What this cert means under Rule 5.3 — expand"). Static copy. Trust-builder.
- **Rule-5.3-native reminder copy** ("Your staff's Rule 5.3 supervision certification expires Nov 14. Renewing now keeps your supervision documentation continuous.") vs generic LMS "Your annual compliance assignment is due."
- **Question-pool randomization + one-question-at-a-time + no back button.** Cheapest, most credible anti-trivialization control. Makes unlimited retakes defensible. Pool = 3–4× per-attempt size.
- **Identity attestation checkbox + signed completion statement** captured with IP/UA. Biggest credibility lift available without proctoring.
- **"Built Smart by Rob" brand voice.** Plain language, no enterprise jargon. Small-firm attorneys buy from people they trust.
- **One-click renewal** that re-enrolls existing staff (minus departed) at 60% price. Auto-cash-flow + dramatically better UX than re-buy + re-invite.

---

## Anti-Features

| Anti-feature | Why NOT |
|---|---|
| Course catalog / multiple courses / learning paths | Doubles UI complexity, drags toward LMS-shaped thinking. One course. One cert. One price. |
| Gamification (badges, leaderboards, streaks, XP) | Wrong audience. BYU research shows gamification helps long-form recurring L&D, not 30-min one-shot certs. Risks making the cert feel *less* serious. |
| Social features (comments, discussion boards, sharing) | Zero relevance to supervision evidence; adds moderation + privacy surface. |
| Custom course authoring per firm | Drags into enterprise LMS territory. Out of scope. |
| Heavy LMS nav (modules → lessons → sub-lessons) | Hostile UX for 20–30 min content. One video + one quiz + one cert. |
| In-product chat / chatbot | Implies the product is complicated. Email-only support + FAQ. |
| State-specific course variants in v1 | State bars don't mandate state-specific Rule 5.3 training. Multiplies content + maintenance for no validated demand. |
| CLE credit accreditation | Different product motion (attorney consumes; this is for *staff*). Out of scope. |
| Public certificate verification page | Privacy issue (paralegal names indexable), nobody is externally verifying paralegal certs. Cert ID + admin dashboard is sufficient. |
| HRIS integrations (BambooHR, Gusto, ADP) | Solo/small firms don't have an HRIS. CSV upload is enough. |
| Time-locked retakes / 24h cooldown / attempt cap | Undercuts unlimited-retake value prop. Question randomization is the credibility control. |
| Mobile native app | Responsive web covers it. App-store maintenance is dead weight. |
| Proctoring / webcam / browser lockdown | Wildly disproportionate to $199/yr paralegal cert. Identity attestation + IP/UA log + cert ID is the defense. |
| SSO / SAML / SCIM | Out of segment. Email + password (Supabase Auth). |
| In-product NPS / sentiment surveys | Wrong measure. Renewal rate is the truth. |
| Free trial | The cert *is* the product. A trial gives away the product. Demo video + sample cert image on marketing page instead. |
| Make.com / Zapier | n8n self-hosted is the only automation runtime per project constraint. |
| Operator admin UI before 3+ paying firms | Use Supabase + Stripe dashboards directly. Don't build internal tooling for problems that don't exist yet. |

---

## Critical Pitfalls (Top 7 — Phase-Mapped)

| # | Pitfall | Phase | Prevention |
|---|---|---|---|
| 1 | **Cert language that reads as legal advice or accreditation.** "ABA-approved," "Rule 5.3 compliant," "guarantees supervision compliance" → bar complaint risk + deceptive advertising + arguable UPL. | **Phase 0 — Foundations** | Use only "Completed [Course] under ABA Model Rule 5.3 Framework," "training record," "helps document training as part of a Rule 5.3 supervision program." Explicit disclaimer on cert + checkout + marketing footer. **Mandatory attorney review of cert template + landing page + TOS before public launch.** |
| 2 | **Storing staff PII without privacy framing.** Attorney buyers vendor-audit their vendors. No privacy policy + no DPA + no retention rules = no second-year renewal. | **Phase 0 — Foundations** | Privacy policy + TOS + one-page DPA published before Stripe connects to live mode. Retention = 7 years post-cert. Minimize PII (email + first/last name + role only). Self-serve "delete this employee record" in dashboard. |
| 3 | **RLS leaks across firms in production.** Policies pass SQL Editor (runs as `postgres`, bypasses RLS) but fail under anon JWT. New tables forgotten in RLS. Service-role key reused in client code. | **Phase 1 — Schema / Auth** | RLS enabled by default in every migration. Two seed firms in dev (`firm_a`, `firm_b`); cross-tenant isolation test in CI. Service-role key only in Netlify env + n8n. Index every `firm_id`. Run Supabase security advisor before each release. |
| 4 | **Stripe webhook provisions the same firm twice.** Retries on slow first attempt → duplicate firm/seat/email. | **Phase 2 — Stripe Integration** | `processed_stripe_events (event_id PK)` idempotency table. First step of webhook handler: try-insert; on conflict, return 200. UPSERT keyed on `stripe_customer_id`. Acknowledge 200 fast (<1s), push heavy work to n8n. |
| 5 | **n8n VPS dies and the cert pipeline silently fails.** Self-hosted = zero managed uptime. 60%+ of self-hosters report failures in first 30 days. | **Phase 4 — Automation backbone** | UptimeRobot/BetterStack health check + SMS alert. **Outbound dead-letter queue:** Next.js writes "needs cert" to `cert_generation_queue` table; n8n drains it; failures retry. Daily backup of n8n Postgres + volume + `N8N_ENCRYPTION_KEY` (latter to password manager). Pin n8n version, never auto-upgrade. Shared-secret header on every public n8n webhook. |
| 6 | **Cloudflare Stream signed-URL expiry breaks mid-course or in stored links.** Default 1-hour TTL; staff returns next day, 403. | **Phase 2 — Video player** | 4–8h token TTL, minted server-side at `/train/[enrollmentId]` page load — never per chunk, never stored in email, never in DB. Allowed Origins locked to production domain. Budget alert at $50/mo. |
| 7 | **Solo-operator over-engineering before revenue.** 3 months building abstractions before a single firm pays. Burnout + zero market signal. | **Every phase** | Time-box phases in days, not weeks. Hardcode three n8n workflows (provision firm, issue cert, send reminders) — no workflow engine. No operator admin UI until 3+ paying firms. Use Supabase + Stripe dashboards directly. Build to the *first* customer's needs, not the *hundredth*. |

Moderate pitfalls covered in PITFALLS.md: refund creep when the cert is the product, mid-cycle seat upgrade, Stripe Tax not configured, renewals billing wrong price/time, content going stale as ABA opinions evolve, password-reset support burden, missing audit log, iPad Safari/Chromebook quiz compatibility.

---

## Decisions Needed Before Phase 1

1. **Cert + marketing copy: who is the reviewing attorney, and what is the budget?** ($500–$1,500). Without this, Pitfall 1 is unmitigated.
2. **Sending domain for transactional email.** Recommend `noreply@builtsmartbyrob.com`. SPF + DKIM + DMARC configured before first invite.
3. **Pass threshold for the quiz.** Recommend 80%. Hardcoded into `courses.pass_threshold` and `/api/quiz/attempt`.
4. **Question pool size + per-attempt count.** Recommend ~24–32 pool / 8–10 per attempt.
5. **Pricing IDs in Stripe.** Three Products × two Prices each = six Price IDs. Need confirmed values.
6. **Stripe Tax enablement + home-state sales-tax registration.**
7. **Supabase Pro upgrade timing.** Recommend before connecting Stripe live mode.
8. **n8n monitoring service.** Pick UptimeRobot or BetterStack. Wire health check + SMS alerting before Phase 4.
9. **Refund policy text** displayed at checkout. Recommend: "Refunds within 14 days **and** before any cert is issued; once any cert is issued, the purchase is non-refundable."
10. **Course version field on `certificates`.** Confirm it ships from migration 0001.
11. **Custom React quiz vs H5P fallback trigger.** Agree the trigger: if custom quiz looks like >5 days of work or pool grows beyond 50 items with rich media, pivot to H5P Path A.
12. **`employees` table naming.** Confirm data model is `firm_members(firm_id, user_id, role)` with `role ∈ {firm_admin, employee}`. If `employees` is needed for UI/API clarity, it becomes a VIEW over `firm_members WHERE role='employee'`.

---

## Recommended Build Order

Six phases. Phase 1 is an **end-to-end stub** — Architecture's "Phase A = Hello cert" approach — not conventional foundation → billing → content → automation → dashboard ordering.

**Rationale:** This operator is solo, in MVP mode, the project constraint says the platform must not block on content, and the highest-risk surface is the automation backbone (Stripe HMAC → Postgres TX → DB webhook → n8n → Storage → Resend → polled dashboard). Stub the player and validate the loop in week 1. Real video comes in Phase 2.

| Phase | Target | One-line goal | Pitfalls addressed |
|---|---|---|---|
| **Phase 0 — Foundations** | 3–5 days | Privacy policy + TOS + DPA published; attorney review of cert + landing copy queued; Supabase Pro decision made; sending domain SPF/DKIM/DMARC set up; data model migration `0001` with `firms`, `firm_members`, `enrollments`, `quiz_attempts`, `certificates`, `training_events`, `processed_stripe_events`, `cert_generation_queue` — RLS enabled on every table; two seed firms with cross-tenant isolation test in CI. | 1, 2, 3, 17 |
| **Phase 1 — Hello-cert end-to-end stub** | ~5–7 days | Rob can pay $1 in Stripe test mode, receive admin magic-link, invite himself as employee, click a "Mark Pass" button, and receive an ugly-but-real PDF cert. Stripe webhook → Next.js → idempotent Postgres TX → DB webhook → n8n → trivial PDF → Supabase Storage → Resend email. No video. No quiz. No dashboard polish. **This is the riskiest path.** | 3, 4, 5, 7, 10 |
| **Phase 2 — Real video + custom React quiz** | 7–10 days | Cloudflare Stream signed playback in `/course/[id]` with 4–8h TTL refresh on every page load + Allowed Origins. Custom React quiz overlay (question pool randomization, one-question-at-a-time, no back, identity attestation). `/api/quiz/attempt` server-trusted score validation. Replace the "Mark Pass" stub. | 6, 8, 9, 18 |
| **Phase 3 — Firm admin dashboard** | 5–7 days | Single-table employee status (sortable, default sort = incomplete-first). Add staff individually + CSV upload. Resend invite + manual reminder buttons. Cert reprint. Seat reassignment with cert retention. CSV audit-log export. **Firm-level compliance attestation PDF export (the differentiator).** | 12, 16, 17 |
| **Phase 4 — Automation hardening + reminder cadence** | 3–5 days | Replace trivial cert PDF with real branded template. n8n cron for 90/30/7 day expiry reminders. UptimeRobot/BetterStack alerts on n8n. Daily n8n backup job. `cert_generation_queue` dead-letter drain on 5-minute schedule. SPF/DKIM/DMARC verified across gmail/outlook/yahoo. | 5, 14, 15 |
| **Phase 5 — Renewal flow + launch polish** | 5–7 days | Stripe renewal price (60%) wired with 30/14/3-day pre-renewal email cadence. Cert-expiry-vs-renewal decoupling logic + 30-day grace period. Refund-eligibility check (`count(certs_issued)==0 AND age<14 days`). Refund policy text at checkout. Marketing landing page final copy. iPad Safari + Chromebook QA. | 11, 14, 18 |

**Total estimated MVP duration: ~5–6 weeks of solo work** if discipline holds.

**Research flags for deeper planning:**
- **Phase 2** needs research if the custom React quiz exceeds 5 days — fallback to H5P Path A is documented but the implementation isn't.
- **Phase 4** needs research if Puppeteer in n8n proves flaky — fallback options (PDF Generator API, DocRaptor, Browserless, self-hosted Gotenberg) are listed in STACK.md but not benchmarked.
- **Phase 5** needs research on proration math for mid-cycle seat upgrades.

**Standard well-trodden pattern phases (skip deep research):** Phase 0, Phase 1, Phase 3.

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Stack choices | **HIGH** | All major versions verified against current 2026 official docs. The one shift from STACK's verdict is the quiz layer (custom React over H5P); rationale documented and reversible. |
| Architecture | **HIGH** | Patterns map cleanly to documented Supabase + Stripe + n8n behaviors; convergence across Architecture and Pitfalls on every load-bearing decision. |
| Table-stakes feature set | **HIGH** | Competitor analysis (Ethena, KnowBe4, Lawline) confirms the baseline. |
| Differentiators | **MEDIUM** | Splits partly subjective. Firm-level attestation PDF export is highest-confidence differentiator; "plain-English Rule 5.3 explainer" is a hypothesis. |
| Anti-features list | **HIGH** | Each line grounded in PROJECT.md constraints or competitor research. |
| Critical pitfalls | **HIGH** | Stack-specific pitfalls verified against current docs + CVE disclosures. Legal-framing grounded in ABA Opinion 512 + state-bar UPL guidance; operator should still get attorney review. |
| Build-order recommendation | **MEDIUM-HIGH** | "Phase A = Hello cert" is opinionated. Synthesized order favors Architecture because integration risk is dominant, content-doesn't-block-platform enables stub-first, and solo-operator over-engineering is the strongest reason to validate end-to-end early. |

### Known Gaps

- **Course curriculum + question bank are not designed yet.** Platform-side this is fine (stub content + placeholder video); Phase 5 launch requires the operator's content track to land. Surface as external blocker in the roadmap.
- **PDF cert template visual design** has not been researched. Plan a half-day in Phase 4.
- **First-customer acquisition motion** is outside this research's scope.
- **Specific reviewing attorney** for cert + TOS copy is not yet identified. Block on this before Phase 5 launch.
