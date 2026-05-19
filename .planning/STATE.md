# STATE — AI Compliance Training Platform

**Last updated:** 2026-05-19 (post-roadmap)

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
- **Status:** Roadmap approved; ready for `/gsd:plan-phase 0`
- **Progress:** `[░░░░░░░░░░░░░░░░░░░░] 0% — 0 of 6 phases complete`

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

- **Stack:** Next.js 15.5 LTS (App Router) on Netlify PRO, Supabase (Auth/Postgres/Storage) Pro tier, Cloudflare Stream, Stripe (`2025-09-30.acacia`), n8n self-hosted at `n8n.katychavezlaw.com`, Resend (email via n8n).
- **Stripe webhook lands in Next.js, not n8n.** HMAC verified, idempotency table `processed_stripe_events(event_id PK)`, transactional Postgres write, fire-and-forget to n8n for side effects.
- **PDF generation lives in n8n** (Puppeteer node). Not Netlify Functions. Not Supabase Edge Functions.
- **Quiz layer is custom React** (~150–200 lines) over Cloudflare Stream native player. Not H5P. Not Articulate Rise. Fallback to H5P Path A only if custom quiz exceeds ~5 days of work.
- **Data model:** single `firm_members(firm_id, user_id, role)` table; `role ∈ {firm_admin, employee}`. `employees` may be exposed as a VIEW for UI clarity.
- **Cert downloads:** routed through `/api/certificates/[id]/url` (auth-checked) → 60-second Supabase signed URL. No raw storage URLs in emails.
- **Cloudflare Stream:** signed playback URLs minted server-side on every page load (4–8h TTL); Allowed Origins locked to production domain.
- **Auth:** magic-link invite + password on first visit; password + magic-link backup for repeat logins.
- **Environments:** two Supabase projects (`attytraining-dev`, `attytraining-prod`). Free-tier 2-project cap forces this.

### Open Decisions (from research/SUMMARY.md "Decisions Needed Before Phase 1")

- [ ] Reviewing attorney identified + engaged (cert + landing + TOS review, $500–$1,500)
- [ ] Sending domain transactional email config (`noreply@builtsmartbyrob.com` + SPF/DKIM/DMARC)
- [ ] Quiz pass threshold (recommend 80%) hardcoded into `courses.pass_threshold`
- [ ] Question pool size + per-attempt count (recommend ~24–32 pool / 8–10 per attempt)
- [ ] Stripe Price IDs (3 Products × 2 Prices = 6 Price IDs) confirmed
- [ ] Stripe Tax enabled + home-state sales-tax registration completed
- [ ] n8n monitoring service picked (UptimeRobot vs BetterStack)
- [ ] CPA consult on SaaS sales tax (~$300–$500)

### Todos (carried)

(populated by `/gsd:plan-phase` per phase)

### Blockers

(none currently — see ROADMAP.md "External Blockers" for phase-level blockers)

### Decisions to Log

(populated as decisions are made; promoted to PROJECT.md Key Decisions on phase transitions)

---

## Session Continuity

- **Last action:** Roadmap created and approved; ROADMAP.md + STATE.md written; REQUIREMENTS.md traceability table populated with all 63 REQ-ID → phase mappings.
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
