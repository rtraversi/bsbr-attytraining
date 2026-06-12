# STATE — AI Compliance Training Platform

**Last updated:** 2026-06-12 (per-seat volume pricing locked; supersedes both prior same-day models)

---

## Project Reference

- **Project:** AI Compliance Training Platform (Built Smart by Rob)
- **Mode:** mvp
- **Granularity:** standard
- **Core value:** An attorney can pay, invite their staff, see them complete the training, and produce certificates that demonstrate Rule 5.3 supervision compliance — without operator intervention.
- **Current focus:** Phase 0 — Foundations

---

## Current Position

- **Phase:** 0 of 5
- **Phase name:** Foundations
- **Plan:** None (not yet planned)
- **Status:** Infrastructure prerequisites complete; Phase 0 code not yet started
- **Progress:** `[░░░░░░░░░░░░░░░░░░░░] 0% — 0 of 6 phases complete`

### Infrastructure Prerequisites Completed (pre-Phase 0)

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Cloudflare account | Done | Rob | Connected to GitHub |
| Supabase (dev + prod projects) | Done ⚠️ | Rob/Max | Dev project `ndmzvtuywcufvkxtkjhg` ownership CONFIRMED under Max's Supabase account (2026-06-12). ⚠️ Open: decide whether the prod project should live under Rob's account + Pro tier before launch |
| Resend account | Done | Rob | Sending domain config not yet verified |
| GitHub repo (`rtraversi/bsbr-attytraining`) | Done | Max | — |
| Node.js | Done | Max | ⚠️ Installed v24; spec calls for v22 LTS |
| pnpm | Done | Max | — |
| Wrangler CLI | Done | Max | — |
| Supabase CLI | Done | Max | — |
| Stripe account | Done | Rob | — |
| Stripe CLI | Done | Rob | v1.42.11 via winget; logged in 2026-06-12, CLI session valid to 2026-09-10 |

### Phase 0 Requirements Status (FND-01..07, AUDIT-01..03)

All 10 Phase 0 requirements are **not yet started** — none require accounts alone; they require running code, migrations, and live pages. All account/CLI prerequisites are now **Done** (Stripe CLI completed 2026-06-12) — Phase 0 work can begin (see `.planning/NEXT-10-STEPS.md`).

⚠️ **Branding note:** FND-04 references `builtsmartbyrob.com` as the sending domain. Domain decision has moved to `aistaffcompliance.com` — sending domain config should target `noreply@aistaffcompliance.com`.

---

## Performance Metrics

- **Requirements total (v1):** 63
- **Requirements mapped:** 63 (100%)
- **Phases planned:** 0 / 6
- **Phases completed:** 0 / 6
- **Estimated MVP duration:** ~5–6 weeks of solo work

---

## Phase Summary

| Phase | Name | Requirements | UI hint | Status |
|-------|------|--------------|---------|--------|
| 0 | Foundations | 10 (FND-01..07, AUDIT-01..03) | no | Not started |
| 1 | Hello-cert end-to-end stub | 23 (AUTH-01..05, PAY-01..07, CERT-01..09, AUTO-01..02) | yes | Not started |
| 2 | Real video + custom React quiz | 11 (COURSE-01..11) | yes | Not started |
| 3 | Firm admin dashboard | 9 (DASH-01..09) | yes | Not started |
| 4 | Automation hardening | 4 (AUTO-03..06) | no | Not started |
| 5 | Renewal flow + launch polish | 6 (RENEW-01..06) | yes | Not started |

---

## Accumulated Context

### Locked Decisions (carried from PROJECT.md + research)

- **Stack (adapter re-locked 2026-06-12):** Next.js 15.5 LTS (App Router, Node.js runtime via `nodejs_compat`) on **Cloudflare Workers** via `@opennextjs/cloudflare` (OpenNext adapter; supersedes the 2026-06-11 choice of `@cloudflare/next-on-pages`, which is deprecated — re-locked after doc verification), Supabase (Auth/Postgres/Storage) Pro tier, Cloudflare Stream, Stripe (`2025-09-30.acacia`), CF Workers for all automation, Resend (REST from CF Workers). No n8n. No VPS. No Netlify.
- **Stripe webhook lands in a Next.js Route Handler running in the Worker (Node runtime).** Raw body via `await req.text()`; HMAC via Stripe SDK v17 — `constructEventAsync` recommended but `constructEvent` works (Node crypto available under nodejs_compat). Idempotency table `processed_stripe_events(event_id PK)`, transactional Postgres write, fire-and-forget POST to the cert Worker for async work.
- **PDF generation lives in a CF Worker** using `pdf-lib` (pure JS, no headless browser, no VPS). Triggered by Supabase Database Webhook → authenticated POST to the Worker.
- **JWT signing for Cloudflare Stream:** use `jose` library (web-standard JWT library; works in plain CF Workers (cert Worker) and the Next.js Worker alike), NOT `jsonwebtoken` (heavier, Node-only assumptions, unnecessary).
- **Certification quiz is custom React** (~150–200 lines): server-side scoring, identity attestation, audit logging — this is the certifiable layer and does not change regardless of content format.
- **Course content format (2026-06-12, pending trial validation):** moving from a single 20–30 min video to **interactive Articulate Rise 360 content** (hosted web export: flip cards, scenario interactions, click-to-reveal, *ungraded* knowledge checks) ahead of the custom React certification quiz. Rise's web export cannot report scores to the app — acceptable because all certifiable events live in the custom quiz. Rob validates via the 30-day Articulate 360 trial before committing $1,449/yr. Fallbacks if the trial disappoints: custom React interactive blocks, then H5P (Dialog Cards / Branching Scenario).
- **Data model:** single `firm_members(firm_id, user_id, role)` table; `role ∈ {firm_admin, employee}`. `employees` may be exposed as a VIEW for UI clarity.
- **Cert downloads:** routed through `/api/certificates/[id]/url` (auth-checked) → 60-second Supabase signed URL. No raw storage URLs in emails.
- **Cloudflare Stream:** signed playback URLs minted server-side on every page load (4–8h TTL); Allowed Origins locked to production domain.
- **Auth:** magic-link invite + password on first visit; password + magic-link backup for repeat logins.
- **Environments:** two Supabase projects (`attytraining-dev`, `attytraining-prod`). Free-tier 2-project cap forces this.
- **Note:** `research/STACK.md` was written for the original Netlify + n8n stack. The CF Workers architecture supersedes any Netlify/n8n guidance in that file.
- **Pricing — per-seat volume (2026-06-12, Rob):** annual per-seat volume pricing — $35/user/yr (1–9 users), $32/user/yr (10–24), $28/user/yr (25+); all seats billed at the band rate the firm's headcount lands in; FLAT on renewal — no renewal discount. Supersedes BOTH prior same-day models (the original $199/$349/$499 tier bands AND the flat-tier variant) — there are NO fixed-price tiers. Stripe model: ONE product `prod_UgzKT3NrGNAvDA` + ONE volume-tiered Price `price_1ThbLNCzT2268ei9nkadS8kD` (lookup_key `per_seat_annual`, `billing_scheme=tiered`, `tiers_mode=volume`: up_to 9 → $35 / up_to 24 → $32 / inf → $28, `tax_behavior=exclusive`, `tax_code=txcd_20060058`). Checkout `quantity` = seats (Stripe computes the band rate); seat enforcement = subscription `quantity`. Source: live marketing site aistaffcompliance.com. Old test-mode objects archived (active=false, lookup keys released): products `prod_UgyZjCbV9uJdzX`/`prod_UgyZ7rqNgXZYao`/`prod_UgyZ30zgvigsd6`, prices `price_1ThachCzT2268ei9HlR1YivD`/`price_1ThaciCzT2268ei9tooaKk8j`/`price_1ThaciCzT2268ei9MRI94R1i`. Live-mode creation deferred pending Stripe Tax.

### Open Decisions (from research/SUMMARY.md "Decisions Needed Before Phase 1")

- [ ] Reviewing attorney identified + engaged (cert + landing + TOS review, $500–$1,500)
- [ ] Sending domain transactional email config (`noreply@builtsmartbyrob.com` + SPF/DKIM/DMARC)
- [ ] Quiz pass threshold (recommend 80%) hardcoded into `courses.pass_threshold`
- [ ] Question pool size + per-attempt count (recommend ~24–32 pool / 8–10 per attempt)
- [x] Stripe Price IDs confirmed — 1 Product × 1 volume-tiered Price = single Price ID `price_1ThbLNCzT2268ei9nkadS8kD` (per_seat_annual), created TEST mode 2026-06-12. Live-mode recreation pending Stripe Tax.
- [ ] Reconcile marketing pricing bands (extend to 25+ users) vs. target-market framing (docs describe 1–15 staff) — positioning vs. pricing-band mismatch to resolve at some point.
- [ ] Stripe Tax enabled + home-state sales-tax registration completed — IN PROGRESS: `tax_code` (`txcd_20060058`) + `tax_behavior` (`exclusive`) set on all test-mode objects; still missing head_office address (BSBR Holdings LLC) to activate Stripe Tax; state registrations + CPA consult still open.
- [ ] External uptime monitor for CF Worker health endpoint picked (UptimeRobot vs BetterStack)
- [ ] Articulate 360 trial outcome (Rob, 30-day trial) — lock Rise-hybrid course format or fall back to custom React interactive blocks / H5P; rewrite COURSE-01..05 + ROADMAP Phase 2 criteria 1–2 once decided
- [ ] CPA consult on SaaS sales tax (~$300–$500)

### Todos (carried)

(populated by `/gsd:plan-phase` per phase)

### Blockers

(none currently — see ROADMAP.md "External Blockers" for phase-level blockers)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260612-dzf | Propagate CF Pages + Workers stack pivot through CLAUDE.md, research docs, and STATE.md | 2026-06-12 | a31e15d | [260612-dzf-propagate-cf-pages-workers-stack-pivot-t](./quick/260612-dzf-propagate-cf-pages-workers-stack-pivot-t/) |
| 260612-efr | Re-lock hosting adapter to @opennextjs/cloudflare on Workers; add NEXT-10-STEPS.md for Max | 2026-06-12 | 728fab3 | [260612-efr-switch-locked-adapter-decision-to-openne](./quick/260612-efr-switch-locked-adapter-decision-to-openne/) |
| 260612-kqe | Mark Stripe CLI install + login done in NEXT-10-STEPS.md | 2026-06-12 | 583dc57 | [260612-kqe-mark-stripe-cli-install-login-done-in-ne](./quick/260612-kqe-mark-stripe-cli-install-login-done-in-ne/) |
| 260612-ky5 | Record Max's progress report (steps 4–7) in NEXT-10-STEPS.md as unverified + Verification Gaps section | 2026-06-12 | 98289da | [260612-ky5-record-max-s-progress-report-in-next-10-](./quick/260612-ky5-record-max-s-progress-report-in-next-10-/) |
| 260612-lg8 | Create Stripe test-mode products/prices (flat annual pricing) + propagate pricing change through docs | 2026-06-12 | d612d53 | [260612-lg8-record-stripe-products-prices-created-fl](./quick/260612-lg8-record-stripe-products-prices-created-fl/) |
| 260612-mdv | Switch to per-seat volume pricing ($35/$32/$28 from aistaffcompliance.com); redo Stripe objects; propagate through docs | 2026-06-12 | 27d799f | [260612-mdv-switch-pricing-model-to-per-seat-volume-](./quick/260612-mdv-switch-pricing-model-to-per-seat-volume-/) |

### Decisions to Log

(populated as decisions are made; promoted to PROJECT.md Key Decisions on phase transitions)

---

## Session Continuity

- **Last action:** Completed quick task 260612-mdv (2026-06-12) — switched the pricing model to per-seat volume tiers ($35/$32/$28 per user/yr by band, flat on renewal; source: aistaffcompliance.com marketing site), archived the 3-tier test-mode Stripe objects, created the single product + volume-tiered Price, and propagated the model through CLAUDE/PROJECT/REQUIREMENTS/ROADMAP/STATE/NEXT-10-STEPS. Remaining Stripe items: head_office address → activate Stripe Tax, state registration, live-mode recreation, hand Price ID to Max.
- **Next action:** `/gsd:plan-phase 0` to decompose Phase 0 (Foundations) into executable plans.
- **Branch:** none (git branching_strategy = `none` per config)
- **Files of record:**
  - `.planning/PROJECT.md` — project context, brand, constraints, key decisions
  - `.planning/REQUIREMENTS.md` — 63 v1 REQ-IDs with traceability to phases
  - `.planning/ROADMAP.md` — 6-phase MVP build order, success criteria
  - `.planning/research/SUMMARY.md` — locked stack, anti-features, critical pitfalls, recommended build order
  - `.planning/research/PITFALLS.md` — detailed pitfalls with phase mapping
  - `.planning/research/ARCHITECTURE.md` — component boundaries, data flows, RLS pattern
  - `.planning/STATE.md` — this file
