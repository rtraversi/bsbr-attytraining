---
phase: quick-260612-lg8
plan: "01"
subsystem: planning-docs
tags: [stripe, pricing, documentation, flat-pricing]
dependency_graph:
  requires: []
  provides: [stripe-test-mode-ids, flat-pricing-decision]
  affects: [NEXT-10-STEPS, PROJECT, REQUIREMENTS, ROADMAP, CLAUDE, STATE]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - .planning/NEXT-10-STEPS.md
    - .planning/STATE.md
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - CLAUDE.md
decisions:
  - "Flat annual pricing locked 2026-06-12 (Rob): $199/$349/$499 same price on renewal — no renewal discount; one Price ID per tier"
  - "Stripe test-mode objects created: 3 products (prod_UgyZjCbV9uJdzX, prod_UgyZ7rqNgXZYao, prod_UgyZ30zgvigsd6) + 3 flat annual prices with lookup keys basic_annual/standard_annual/pro_annual"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-12"
  tasks_completed: 3
  files_modified: 6
---

# Phase quick-260612-lg8 Plan 01: Record Stripe Products + Prices (Flat Pricing) Summary

**One-liner:** Recorded real Stripe test-mode product/price IDs (3 products + 3 flat annual prices with lookup keys + tax config) into NEXT-10-STEPS Step 8, and propagated the locked flat-pricing model (no renewal discount, same Price ID on renewal) through all 6 planning docs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rewrite NEXT-10-STEPS.md Step 8 with real test-mode IDs and flat pricing | 05a6dbd | .planning/NEXT-10-STEPS.md |
| 2 | Propagate flat-pricing model through PROJECT.md, REQUIREMENTS.md, ROADMAP.md, CLAUDE.md | 617785b | .planning/PROJECT.md, .planning/REQUIREMENTS.md, .planning/ROADMAP.md, CLAUDE.md |
| 3 | Record flat-pricing locked decision and update Open Decisions in STATE.md | d612d53 | .planning/STATE.md |

## What Was Done

**Task 1 — NEXT-10-STEPS.md Step 8:**
- Replaced the "Not started" Step 8 block with real test-mode data
- Status updated to "Done (test mode) — live mode pending Stripe Tax"
- Listed all 3 products with IDs, tier metadata, and seat_cap values
- Listed 3 flat annual prices with lookup keys (basic_annual, standard_annual, pro_annual) and price IDs
- Added tax_code (txcd_20060058) and tax_behavior=exclusive
- Marked completed items [x]; added 4 remaining live-mode/tax/handoff items as [ ]
- Added note that flat pricing is the locked model (one Price ID per tier, no renewal discount)

**Task 2 — Flat pricing propagation (4 files):**
- PROJECT.md: Updated success criteria, pricing constraint, and Key Decisions table row for 12-month cert validity — all references to "~60% of original" replaced with flat pricing language
- REQUIREMENTS.md: Rewrote RENEW-03 — renewal uses same annual Price ID, no discounted renewal price
- ROADMAP.md: Updated Phase 5 overview bullet, Goal line, and Success Criteria #2 — removed $119/$209/$299 renewal prices, replaced with flat annual price reuse
- CLAUDE.md: Updated pricing constraint bullet; replaced prod_basic/prod_standard/prod_pro with real product IDs and flat annual prices with lookup keys; updated "What NOT to Use" table row for Stripe quantity pricing

**Task 3 — STATE.md:**
- Added flat-pricing locked decision to Locked Decisions with full Stripe test-mode IDs, rationale, and consequence
- Marked Stripe Price IDs open decision [x] done for test mode (3 prices, one per tier)
- Annotated Stripe Tax open decision with IN PROGRESS status (tax_code + tax_behavior set; head_office address and state registrations still open) — left unchecked

## Decisions Made

1. **Flat annual pricing (Rob, 2026-06-12):** $199/$349/$499 annual per tier, same price on renewal. Rationale: training requires substantial research and updating year over year; renewal years cost as much to produce as year one. One Price ID per tier (3 prices total). Supersedes the prior "renewal ~60% of original" model.

2. **Stripe test-mode objects created:** Three products with tier/seat_cap metadata; three flat annual recurring prices with lookup keys (basic_annual, standard_annual, pro_annual); tax_code txcd_20060058 ("Training Services - Self-study Web-based"), tax_behavior=exclusive. Live-mode creation deferred until Stripe Tax is enabled (head_office address missing).

## Deviations from Plan

None — plan executed exactly as written.

The REQUIREMENTS.md verify check flagged a potential false positive: the new RENEW-03 text originally included the phrase `renewal_price Price ID` (explaining what we are NOT creating). Rephrased to avoid triggering the grep, while preserving the intent. No plan logic changed.

## Known Stubs

None. This was a pure documentation task — no UI components, no data sources, no rendered output.

## Self-Check: PASSED

- .planning/NEXT-10-STEPS.md — modified, commit 05a6dbd confirmed
- .planning/PROJECT.md — modified, commit 617785b confirmed
- .planning/REQUIREMENTS.md — modified, commit 617785b confirmed
- .planning/ROADMAP.md — modified, commit 617785b confirmed
- CLAUDE.md — modified, commit 617785b confirmed
- .planning/STATE.md — modified, commit d612d53 confirmed
- grep check: no "60%", "renewal_price", "$119", "$209", "$299" in any of the 4 propagation files — PASS
- grep check: "price_1Thach" found in both NEXT-10-STEPS.md and STATE.md — PASS
- All 3 product IDs and 3 price IDs appear verbatim in NEXT-10-STEPS.md — PASS
- STATE.md Quick Tasks Completed table and Session Continuity section unchanged — PASS
