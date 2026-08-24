# IURIX

## What This Is

A self-serve web platform where solo and small-firm attorneys (1–15 staff) pay a one-time annual fee to put formal AI governance in place. **The deliverable is a written AI use policy, personalized to the firm** — what staff may use AI for, what they may not, and how client confidences are handled. **The training exists to keep the firm's staff aligned to that policy.** Staff complete the training course with embedded quizzes, pass with a score-gate (unlimited retakes), and receive a downloadable PDF certificate. Attorneys get a dashboard to audit staff completion, scores, and certificate status, and to issue reminders or reprints. The product is published under the **IURIX** brand.

## Core Value

An attorney can pay, receive a written AI policy tailored to their firm, invite their staff, see them complete the training that holds them to that policy, and produce the certificates and attestations that evidence it — without operator intervention.

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

- **Brand:** IURIX — brand identity in progress; the mark is staged at `public/brand/` but is not yet production-final (see `public/brand/README.md`)
- **Operator infrastructure:**
  - Netlify PRO account active — design around PRO features (server-side functions, branch deploys), not free-tier limits
  - Supabase free tier (2 active project cap) — flag if approaching limits before adding more environments
  - Cloudflare free tier — Cloudflare Stream is a paid add-on that must be enabled before video upload
  - Stripe not yet configured for this project — needs account/product/price setup
  - n8n self-hosted on VPS at `n8n.katychavezlaw.com` — operational and the preferred automation runtime for **all** automation in this project
- **Curriculum status:** Course curriculum and video script are still being designed and produced in parallel with the platform. Platform build does **not** block on content readiness — placeholder/dummy content is acceptable through dev and staging; real content drops in before launch.
- **Regulatory framing:** The firm's own written AI policy is the governing document the training and attestations are keyed to. ABA Model Rule 5.3 (Responsibilities Regarding Nonlawyer Assistance) and Formal Opinion 512 are cited as supporting background only — never as the product thesis (see the framing correction below). Marketing is national; certificate language is jurisdiction-neutral.
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
- **Framing:** The firm's personalized written AI policy is the product and the thesis; the training, attestations and certificates are the evidence of adherence to it. ABA Model Rule 5.3 / Formal Opinion 512 are background context and at most a supporting citation — never the pitch (see the framing correction below). Generic national framing; no state-specific accreditation claims in v1
- **Operator burden:** Self-run platform — operator (Rob) should not be in the loop for normal customer flows (purchase, invite, certify, renew); all of that is automated end-to-end

### ⚠️ Framing correction — 2026-08-24 (Katy, via Max)

**ABA Model Rule 5.3 is NOT this project's north star.** The Rule 5.3 framing was set by the
earliest planning sessions, was never revisited, and spread from there into the docs, the
marketing copy, the transactional emails and the certificate itself. Katy is adamant on this and
it is a **correction, not a preference**.

- **The product is the firm's own written AI use policy** — generated and personalized for each
  firm. That policy is what the customer buys.
- **The training exists to keep the firm's staff aligned to that policy**; the quiz, the
  attestations and the certificates are the evidence that they are.
- **ABA Model Rule 5.3 is outdated.** It is background context and, at most, a supporting
  citation in fine print. It is not the thesis, not the headline, and not why anyone buys this.

Future sessions must **not** reintroduce Rule 5.3 as the product thesis. The one place it stays
deliberately is the legal disclaimers in `.planning/legal/terms-of-service.md` (§3 and §11) —
naming the rule in order to disclaim it is protective, and those are left alone on purpose.

Full record of the correction, plus the authored training content still awaiting Katy's revision:
`.planning/FRAMING-CORRECTION-2026-08-24.md`.

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
| IURIX branding | Product renamed to IURIX (2026-07); "Built Smart by Rob" is a sibling brand under BSBR Holdings, not this product's publisher, and is retired from this product | — Pending |

## Launch Timeline

**Set 2026-06-19 (Rob)**

| Date | Milestone |
|------|-----------|
| Jun 20–22 | Katy works on developing course content |
| Jul 1 | Backend + frontend 100% complete; training content partially complete |
| Jul 10 | Everything 100% complete — content, backend, frontend, all flows |
| Week of Jul 13 | Full end-to-end testing with ≥6 real testers; all discovered bugs fixed before go-live |
| Jul 20 | **Go live** |

---

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
