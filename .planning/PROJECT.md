# AI Compliance Training Platform

## What This Is

A self-serve web platform where solo and small-firm attorneys (1–15 staff) pay a one-time annual fee to certify their staff on proper AI usage under ABA Model Rule 5.3 (Vendor Supervision / attorney ethics compliance). Staff complete a 20–30 minute video course with embedded quizzes, pass with a score-gate (unlimited retakes), and receive a downloadable PDF certificate. Attorneys get a dashboard to audit staff completion, scores, and certificate status, and to issue reminders or reprints. The product is published under the **Built Smart by Rob** brand.

## Core Value

An attorney can pay, invite their staff, see them complete the training, and produce certificates that demonstrate Rule 5.3 supervision compliance — without operator intervention.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Stripe checkout creates a paid firm account with the purchased number of seats (per-seat volume pricing)
- [ ] Firm admin can invite employees up to their purchased seat count
- [ ] Employees receive an invitation, set credentials, and log in
- [ ] Employees play a Cloudflare Stream video with embedded interactive quizzes (H5P or Articulate Rise)
- [ ] Score gate determines pass/fail; failures can retake unlimited times
- [ ] On pass, n8n generates a PDF certificate and stores it in Supabase Storage
- [ ] Certificate is emailed to the employee and accessible from the firm dashboard
- [ ] Firm admin dashboard shows each employee's status, score, completion date, and certificate link
- [ ] Certificates have a 12-month validity; system tracks expiry and surfaces re-certification due dates
- [ ] Annual renewal flow (priced at the same flat annual price as year one) re-enrolls existing staff for a new cycle.
- [ ] n8n handles enrollment confirmations, completion triggers, certificate generation, and reminder nudges
- [ ] Stripe webhook provisions firm account + seats on payment

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- State-specific course variants (TX, CA, NY, FL) — v1 is ABA Model Rule 5.3 generic only; per-state courses would multiply content production
- Mid-to-large firm sales (15+ staff custom pricing, SSO, POs) — v1 targets solo/small firms with self-serve Stripe; B2B sales is a different product motion
- Custom course content per firm — v1 is one canonical course; white-label or custom training is post-launch
- LMS-style features (multiple courses, prerequisites, learning paths) — single course only
- CLE credit accreditation — v1 is a compliance/training cert, not CLE
- Make.com or Zapier for automation — n8n self-hosted is the only automation runtime
- Free tier / trial — paid only; the cert *is* the product
- Public certificate verification page (third-party lookup) — defer until validated demand

## Context

- **Brand:** Built Smart by Rob — existing brand identity, logo and color assets are ready and can be applied to this product
- **Operator infrastructure:**
  - Netlify PRO account active — design around PRO features (server-side functions, branch deploys), not free-tier limits
  - Supabase free tier (2 active project cap) — flag if approaching limits before adding more environments
  - Cloudflare free tier — Cloudflare Stream is a paid add-on that must be enabled before video upload
  - Stripe not yet configured for this project — needs account/product/price setup
  - n8n self-hosted on VPS at `n8n.katychavezlaw.com` — operational and the preferred automation runtime for **all** automation in this project
- **Curriculum status:** Course curriculum and video script are still being designed and produced in parallel with the platform. Platform build does **not** block on content readiness — placeholder/dummy content is acceptable through dev and staging; real content drops in before launch.
- **Regulatory framing:** Training references ABA Model Rule 5.3 (Responsibilities Regarding Nonlawyer Assistance) as the governing framework. Marketing is national; certificate language is jurisdiction-neutral.
- **Quiz delivery layer:** H5P (open-source, self-hostable) vs. Articulate Rise — decision pending; both are viable embed-in-video options. Cost, authoring UX, and Cloudflare Stream integration story will drive the call.

## Constraints

- **Tech stack — frontend/hosting:** Next.js 15.5 (App Router, Node.js runtime via `nodejs_compat`) on **Cloudflare Workers** via `@opennextjs/cloudflare` — all portals and SaaS apps live on CF, not Netlify
- **Tech stack — backend:** Supabase (Auth + Postgres + Storage) — single integrated provider for auth, DB, and certificate PDF storage
- **Tech stack — API / automation:** **Cloudflare Workers** — all serverless functions, cert generation, email sending, and scheduled jobs run as CF Workers or CF Workers Cron Triggers; no n8n, no VPS
- **Tech stack — video:** Cloudflare Stream (paid add-on required) — for signed-URL streaming and bandwidth economics
- **Tech stack — payments:** Stripe — standard for self-serve SaaS checkout; supports tiered pricing + webhooks
- **Tech stack — interactive video/quiz:** Custom React quiz component (~150–200 lines) over Cloudflare Stream native player — no H5P, no Articulate Rise
- **Pricing constraint:** $35/user/yr for 1–9 users, $32/user/yr for 10–24 users, $28/user/yr for 25+ users — billed annually per enrolled user; volume bands (all seats billed at the band rate the firm's headcount lands in); FLAT on renewal — no renewal discount (course substantially updated each year).
- **Target market constraint:** Solo and small firms (1–15 staff) — UX, marketing, and pricing tiers reflect this; product is self-serve only
- **Compliance framing:** ABA Model Rule 5.3 — generic national framing; no state-specific accreditation claims in v1
- **Operator burden:** Self-run platform — operator (Rob) should not be in the loop for normal customer flows (purchase, invite, certify, renew); all of that is automated end-to-end

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js on Cloudflare Workers (OpenNext adapter) | All portals and SaaS apps are moving to CF Workers; Netlify is websites only | — Decided 2026-06-11 |
| Adapter: `@opennextjs/cloudflare` over deprecated `@cloudflare/next-on-pages` | Cloudflare deprecated next-on-pages; OpenNext on Workers is the official Node-runtime path | — Decided 2026-06-12 |
| Supabase for auth + DB + storage | One integrated provider reduces moving parts; certs need durable storage anyway | — Pending |
| Cloudflare Stream for video hosting | Signed URLs + bandwidth economics vs. self-hosting; willing to enable paid add-on | — Pending |
| CF Workers as the only automation runtime | No VPS to manage, no n8n to maintain; CF Workers handle cert gen (pdf-lib), email (Resend REST), and scheduled reminders (CF Cron) | — Decided 2026-06-11 |
| Score-gate with unlimited retakes (no attempt cap) | Maximizes completion rate; cert is the outcome customers paid for, not a hurdle | — Pending |
| 12-month certificate validity with annual recertification | Drives renewal revenue (flat annual price; renewal costs as much to produce as year one) and aligns with annual compliance review cadence | — Pending — renewal pricing decided flat 2026-06-12 |
| ABA Model Rule 5.3 generic, national scope (no state variants in v1) | Single course → single content production track → fastest path to launch | — Pending |
| Solo/small firms (1–15 staff), self-serve only | Per-seat volume pricing fits self-serve; no sales motion; one-page checkout → onboarding | — Pending |
| Curriculum produced in parallel, not gating platform build | Platform can scaffold with placeholder content; final video drops in before launch | — Pending |
| Built Smart by Rob branding (existing brand assets) | BSBR brand exists with logo and colors; apply to this product rather than create new identity | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-19 after initialization; adapter re-locked to @opennextjs/cloudflare 2026-06-12*
