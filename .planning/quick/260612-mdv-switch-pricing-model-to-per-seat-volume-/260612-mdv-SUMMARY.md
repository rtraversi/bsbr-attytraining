---
phase: quick-260612-mdv
plan: 01
subsystem: planning-docs
tags: [pricing, stripe, requirements, documentation]
dependency_graph:
  requires: []
  provides: [per-seat-volume-pricing-in-all-docs]
  affects: [CLAUDE.md, .planning/PROJECT.md, .planning/REQUIREMENTS.md, .planning/ROADMAP.md, .planning/STATE.md, .planning/NEXT-10-STEPS.md]
tech_stack:
  added: []
  patterns: [per-seat-volume-pricing, single-product-single-price, tiers_mode-volume]
key_files:
  created: []
  modified:
    - CLAUDE.md
    - .planning/PROJECT.md
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/NEXT-10-STEPS.md
decisions:
  - "Pricing — per-seat volume (2026-06-12, Rob): $35/$32/$28/user/yr by 1–9/10–24/25+ bands; single Stripe product + volume-tiered price; supersedes both prior same-day models"
metrics:
  duration: ~15 minutes
  completed: 2026-06-12
---

# Phase quick-260612-mdv Plan 01: Switch Pricing Model to Per-Seat Volume Summary

**One-liner:** Propagated locked per-seat volume pricing ($35/$32/$28/user/yr, `tiers_mode=volume`, single product `prod_UgzKT3NrGNAvDA` + price `price_1ThbLNCzT2268ei9nkadS8kD`) through all six active planning docs, replacing the obsolete 3-tier flat-price band model everywhere it appeared as an active spec.

## What Was Done

### Task 1: CLAUDE.md (commit c7bb84f)

Four locations updated:

1. **Pricing constraint** (Constraints section): replaced `$199/5 seats, $349/6–15 seats, $499/16+ seats` with `$35/user/yr (1–9), $32/user/yr (10–24), $28/user/yr (25+)`, volume bands, flat renewal.
2. **§4 Stripe section**: heading changed from "tiered seat pricing" to "per-seat volume pricing"; 3 products/3 prices replaced with ONE product `prod_UgzKT3NrGNAvDA` + ONE volume-tiered Price `price_1ThbLNCzT2268ei9nkadS8kD`; old objects noted as archived; Checkout quantity = seats documented.
3. **What NOT to Use row**: reversed — old row warned against per-seat quantity; new row warns against the 3-tier fixed-price pattern and documents the per-seat volume model as the chosen approach.
4. **Stack Patterns by Variant**: removed `prod_basic ($199)` / `prod_standard ($349)` bullets; replaced with single-price + quantity-based Checkout description.
5. Also updated: Core Tech Stripe row ("Three tiered Prices" → "ONE Product + ONE volume-tiered Price") and Confidence Assessment row.

### Task 2: PROJECT.md, REQUIREMENTS.md, ROADMAP.md (commit b026546)

- **PROJECT.md**: pricing constraint line, Active requirements list ("correct seat tier" → "purchased number of seats (per-seat volume pricing)"), Key Decisions rationale.
- **REQUIREMENTS.md PAY-01**: rewritten for quantity-based volume Checkout with `tiers_mode=volume`.
- **REQUIREMENTS.md PAY-04**: "allocates seats per tier" → "allocates seats equal to the purchased Checkout quantity".
- **REQUIREMENTS.md RENEW-03**: single volume-tiered Price ID + current seat quantity; no separate renewal price.
- **ROADMAP.md Phase 1 SC#1**: "three tiers (Basic $199 / Standard $349 / Pro $499)" → "seat quantity at per-seat volume pricing ($35/$32/$28 per user/yr by band)".
- **ROADMAP.md Phase 5 SC#2**: old tier price list → "same single volume-tiered Price ID and the firm's seat quantity (per-seat volume $35/$32/$28)".

### Task 3: STATE.md + NEXT-10-STEPS.md (commit 27d799f)

- **STATE.md header**: updated to note per-seat volume pricing locked.
- **STATE.md locked decisions**: replaced flat-tier pricing bullet with per-seat volume bullet; includes new product/price IDs, archived old objects list, Supersedes note for both prior same-day models.
- **STATE.md open decisions**: Stripe Price-ID item updated to single volume-tiered Price ID; new open decision added for market/band reconciliation (1–15 staff framing vs. 25+ pricing band).
- **NEXT-10-STEPS Step 8**: pricing model blockquote rewritten; 3-product/3-price completed list replaced with single product + single volume-tiered price; Archived section added for old objects; volume-cliff note added ("24 seats = $768 but 25 seats = $700"); live-mode checklist updated to reference single price ID.

## Verification

### Negative verification (no active old-pricing refs in six edited files)

Lines 167–168 of NEXT-10-STEPS.md contain old price IDs and lookup keys, but these are explicitly inside the **Archived (active=false, lookup keys released):** block — the plan explicitly permits archived/superseded mentions. No active old-pricing references remain.

### Positive verification

All six files confirmed to contain per-seat / tiers_mode=volume / $35.$32.$28 / new price ID markers:
- CLAUDE.md ✓
- .planning/PROJECT.md ✓
- .planning/REQUIREMENTS.md ✓
- .planning/ROADMAP.md ✓
- .planning/STATE.md ✓
- .planning/NEXT-10-STEPS.md ✓

## Deviations from Plan

None — plan executed exactly as written. The only minor note: the Confidence Assessment row ("Stripe pattern (three Prices + metadata)") and the Core Tech Stripe table row were also updated as they contained active old-model references not called out explicitly in the plan's four CLAUDE.md locations, but clearly within scope of the "no surviving ACTIVE old-pricing references" success criterion.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | c7bb84f | docs(quick-260612-mdv): rewrite CLAUDE.md pricing to per-seat volume model |
| Task 2 | b026546 | docs(quick-260612-mdv): rewrite PROJECT/REQUIREMENTS/ROADMAP to per-seat volume pricing |
| Task 3 | 27d799f | docs(quick-260612-mdv): update STATE.md + NEXT-10-STEPS Step 8 for per-seat volume pricing |

## Self-Check: PASSED

- CLAUDE.md modified ✓ (c7bb84f)
- .planning/PROJECT.md modified ✓ (b026546)
- .planning/REQUIREMENTS.md modified ✓ (b026546)
- .planning/ROADMAP.md modified ✓ (b026546)
- .planning/STATE.md modified ✓ (27d799f)
- .planning/NEXT-10-STEPS.md modified ✓ (27d799f)
- All six files contain positive verification markers ✓
- STATE.md Quick Tasks Completed table untouched ✓
- STATE.md Session Continuity section untouched ✓
- .planning/quick/** not edited ✓
- .planning/research/** not edited ✓
