---
phase: quick-260612-mdv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - CLAUDE.md
  - .planning/PROJECT.md
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/STATE.md
  - .planning/NEXT-10-STEPS.md
autonomous: true
requirements: [PAY-01, PAY-04, RENEW-03]
must_haves:
  truths:
    - "Every active planning/spec doc describes per-seat volume pricing ($35/$32/$28 by band), not the 3-tier flat-price band model"
    - "PAY-01, PAY-04, and RENEW-03 describe quantity-based Stripe Checkout with tiers_mode=volume"
    - "CLAUDE.md no longer warns against per-seat quantity pricing — it documents it as the chosen model"
    - "STATE.md locked-decisions and NEXT-10-STEPS Step 8 reference the single new product/price IDs, with old IDs shown only as archived"
  artifacts:
    - path: "CLAUDE.md"
      provides: "Pricing constraint + Stripe §4 + What-NOT-to-Use + Stack Patterns rewritten for per-seat volume"
    - path: ".planning/REQUIREMENTS.md"
      provides: "PAY-01, PAY-04, RENEW-03 rewritten for quantity-based volume pricing"
    - path: ".planning/STATE.md"
      provides: "Per-seat locked decision superseding both prior models; updated Price-ID open decision"
    - path: ".planning/NEXT-10-STEPS.md"
      provides: "Step 8 rewritten for single product + tiered price, old objects archived"
  key_links:
    - from: "all six docs"
      to: "per-seat volume model"
      via: "consistent $35/$32/$28 bands + single price_1ThbLNCzT2268ei9nkadS8kD"
      pattern: "35.*32.*28|per_seat|per-seat"
---

<objective>
Propagate the locked per-seat volume pricing model (sourced from the live aistaffcompliance.com marketing site) through all active planning docs and CLAUDE.md, replacing the obsolete 3-tier flat-price band model ($199/$349/$499) everywhere it appears as an ACTIVE spec.

Purpose: The pricing model is locked. Two prior models (original tier bands, and this-morning's flat-tier variant of the same) are now superseded by a SINGLE Stripe product with ONE volume-tiered Price where Checkout `quantity` = seats and Stripe auto-computes the band rate. The planning corpus must reflect this or downstream Phase 1 planning will encode the wrong pricing, Stripe object IDs, and seat-enforcement logic.

Output: Six edited files (CLAUDE.md + 5 .planning docs) with consistent per-seat volume pricing, the new product/price IDs as canonical, and old objects shown only as archived/superseded.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
This is a documentation-propagation quick task. No code, no research, no new dependencies.

## Final locked pricing model (the target state)

PER-SEAT annual pricing, volume bands — ALL seats billed at the band rate the firm's total headcount lands in:
- Solo & Boutique, 1–9 users: **$35/user/year**
- Small Firm, 10–24 users: **$32/user/year**
- Growing Firm, 25+ users: **$28/user/year**

Billed annually per enrolled user. **FLAT on renewal — no renewal discount** (course substantially updated each year). This SUPERSEDES BOTH prior models: the original $199/$349/$499 tier bands AND this-morning's flat-tier variant. There are NO fixed-price tiers anymore.

## New Stripe TEST-mode objects (canonical going forward)

- Product: `prod_UgzKT3NrGNAvDA` — "AI Staff Compliance Training — Annual Certification" — metadata `pricing_model=per_seat_volume`, `tax_code=txcd_20060058`
- Price: `price_1ThbLNCzT2268ei9nkadS8kD` — lookup_key `per_seat_annual` — recurring yearly, `billing_scheme=tiered`, `tiers_mode=volume`, tiers: up_to 9 → $35/unit, up_to 24 → $32/unit, inf → $28/unit; `tax_behavior=exclusive`
- Account: `acct_1TYqL3CzT2268ei9`
- Live-mode creation still deferred pending Stripe Tax (head_office address still missing).

## OLD objects — ARCHIVED (active=false, lookup keys released) — show only as "archived"

- Products: `prod_UgyZjCbV9uJdzX`, `prod_UgyZ7rqNgXZYao`, `prod_UgyZ30zgvigsd6`
- Prices: `price_1ThachCzT2268ei9HlR1YivD`, `price_1ThaciCzT2268ei9tooaKk8j`, `price_1ThaciCzT2268ei9MRI94R1i`

## Architectural consequences to encode

- Checkout: ONE product, ONE Price; Stripe Checkout `quantity` = seats purchased; Stripe computes the band rate automatically (`tiers_mode=volume`). `adjustable_quantity` enabled lets the buyer pick seat count in Checkout.
- Seat enforcement: seats owned = subscription `quantity` (no more `seat_cap` tier metadata). Invite-time enforcement compares active members against subscription quantity.
- Volume-cliff note (include ONLY where pricing is explained in NEXT-10-STEPS Step 8): 24 seats = $768 but 25 seats = $700 — a known, accepted property of volume pricing.

## Scope boundary — DO NOT EDIT

- `.planning/quick/**` — historical quick-task artifacts (immutable record).
- `.planning/research/**` — historical research corpus written for the original Netlify+n8n stack; STATE.md already flags it as superseded. Its $199–$499 narrative references are out of scope for this task and must NOT be edited.
- STATE.md "Quick Tasks Completed" table and "Session Continuity" section — orchestrator-owned; do NOT touch.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite CLAUDE.md pricing model (4 locations)</name>
  <files>CLAUDE.md</files>
  <action>
Rewrite four sections of CLAUDE.md to the per-seat volume model:

1. **Pricing constraint line** (in `## Project` > `### Constraints`): Replace "**Pricing constraint:** $199 / 5 seats, $349 / 6–15 seats, $499 / 16+ seats — annual; renewal ~60% of original" with the per-seat volume bands: "$35/user/yr for 1–9 users, $32/user/yr for 10–24 users, $28/user/yr for 25+ users — billed annually per enrolled user; volume bands (all seats billed at the band rate the firm's headcount lands in); FLAT on renewal — no renewal discount (course substantially updated each year)."

2. **§4 Stripe section — Integration Patterns** ("### 4. Stripe — tiered seat pricing, webhooks, portal"): Replace the three `prod_basic`/`prod_standard`/`prod_pro` product+price bullet lines with a SINGLE product + single volume-tiered Price. State: one Product `prod_UgzKT3NrGNAvDA` ("AI Staff Compliance Training — Annual Certification", metadata `pricing_model=per_seat_volume`); one Price `price_1ThbLNCzT2268ei9nkadS8kD` (lookup_key `per_seat_annual`, recurring yearly, `billing_scheme=tiered`, `tiers_mode=volume`, tiers up_to 9 → $35/unit / up_to 24 → $32/unit / inf → $28/unit, `tax_behavior=exclusive`). Update the heading from "tiered seat pricing" to "per-seat volume pricing". Add: Stripe Checkout `quantity` = number of seats; `adjustable_quantity` enabled so the buyer picks seat count in Checkout; Stripe auto-computes the band rate via `tiers_mode=volume`. Seat enforcement: seats owned = subscription `quantity` (no `seat_cap` metadata). Note old objects are archived (active=false).

3. **"What NOT to Use" table** — the row warning against Stripe per-seat `quantity` ("Stripe per-seat `quantity` for tier pricing | Tiers here are bands (5, 15, 16+), not strict per-seat ... | Three distinct Prices, seat cap as subscription metadata"): REVERSE it. The chosen model now IS per-seat `quantity` with `tiers_mode=volume`. Either remove the row or rewrite it to the inverse warning: do NOT use three distinct fixed-price Prices with seat_cap metadata; use ONE volume-tiered Price with Checkout `quantity` = seats instead. Make the row's "Avoid" column name the OLD pattern and "Use Instead" name the new single volume-tiered Price.

4. **"Stack Patterns by Variant"** — the bullets referencing "Use `prod_basic` ($199). Seat metadata `{ seat_count: 5 }`" and "Use `prod_standard` ($349). Same flow.": Rewrite for quantity-based Checkout. State: all variants use the single Price `per_seat_annual` with Checkout `quantity` = the firm's seat count; Stripe computes the band rate automatically. No per-tier product selection.

Per PAY-01/PAY-04/RENEW-03 alignment. Keep all non-pricing content (stack, adapter, auth, etc.) untouched.
  </action>
  <verify>
    <automated>cd "C:/Sites/attytraining" && grep -nE 'prod_basic|prod_standard|prod_pro|\$199|\$349|\$499' CLAUDE.md | grep -viE 'archiv|supersed|do not use|avoid|old pattern' || echo "CLEAN: no active old-pricing refs in CLAUDE.md"</automated>
  </verify>
  <done>CLAUDE.md pricing constraint, §4 Stripe, What-NOT-to-Use row, and Stack Patterns all describe per-seat volume pricing with the single product/price IDs; no surviving ACTIVE $199/$349/$499 or prod_basic/standard/pro references (only archived/inverse-warning mentions remain).</done>
</task>

<task type="auto">
  <name>Task 2: Rewrite PROJECT.md, REQUIREMENTS.md, ROADMAP.md pricing references</name>
  <files>.planning/PROJECT.md, .planning/REQUIREMENTS.md, .planning/ROADMAP.md</files>
  <action>
**PROJECT.md:**
- `## Constraints` > "**Pricing constraint:**" line: replace "$199 / 5 seats, $349 / 6–15 seats, $499 / 16+ seats — annual; flat price on renewal (no renewal discount)." with the per-seat volume bands ($35 / $32 / $28 per user/yr by 1–9 / 10–24 / 25+ band; billed annually per enrolled user; flat on renewal — no renewal discount).
- `### Active` requirements list: "Stripe checkout creates a paid firm account with the correct seat tier" → "...with the purchased number of seats (per-seat volume pricing)".
- `## Key Decisions` table: the "Solo/small firms (1–15 staff), self-serve only" row's "Pricing tiers fit" rationale → reword to "per-seat volume pricing fits self-serve; no sales motion". Leave other decision rows intact. (Do NOT rewrite market positioning.)

**REQUIREMENTS.md:**
- **PAY-01**: rewrite from "complete Stripe Checkout for one of three fixed tiers — Basic (≤5 seats / $199), Standard (6–15 seats / $349), Pro (16+ seats / $499) — billed annually" to: "A buyer can complete Stripe Checkout choosing a seat QUANTITY (min 1); pricing is per-seat volume — $35/user/yr (1–9), $32/user/yr (10–24), $28/user/yr (25+), all seats billed at the band rate the headcount lands in — billed annually. Stripe computes the band rate via a single volume-tiered Price (`tiers_mode=volume`)."
- **PAY-04**: "allocates seats per tier" → "allocates seats equal to the purchased Checkout quantity".
- **RENEW-03**: rewrite the parenthetical and tier-price list. From "(flat annual pricing — no renewal discount); the renewal ... charges the same price as year one ($199/$349/$499 per tier). There is exactly one Price per tier" to: "(flat annual pricing — no renewal discount); renewal reuses the SAME single volume-tiered Price ID and the firm's current seat quantity, charging the same per-seat band rate as year one. There is exactly one Price — no separate discounted renewal price."
- `### Active` (PROJECT-mirrored line if present) — not in REQUIREMENTS; skip.

**ROADMAP.md:**
- Phase 1 Success Criteria #1: "Stripe Checkout for any of the three tiers (Basic $199 / Standard $349 / Pro $499)" → "Stripe Checkout choosing a seat quantity at per-seat volume pricing ($35/$32/$28 per user/yr by band)".
- Phase 5 Success Criteria #2: "reuses the same flat annual Price ID ... (Basic $199, Standard $349, Pro $499 — no renewal discount)" → "reuses the same single volume-tiered Price ID and the firm's seat quantity (per-seat volume $35/$32/$28 — no renewal discount)".
- Phase 5 phase-list bullet + Goal line: "same flat annual price" phrasing is fine as-is but verify it does not name $199/$349/$499; if it does, replace with "same per-seat volume pricing".

Keep all non-pricing content untouched. Do NOT rewrite the 1–15 staff target-market framing anywhere (that reconciliation is flagged separately in STATE.md per Task 3).
  </action>
  <verify>
    <automated>cd "C:/Sites/attytraining" && grep -nE '\$199|\$349|\$499|three (fixed )?tiers|per tier|seat tier' .planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md | grep -viE 'archiv|supersed' || echo "CLEAN: no active tier-pricing refs in PROJECT/REQUIREMENTS/ROADMAP"</automated>
  </verify>
  <done>PAY-01 describes quantity-based volume Checkout; PAY-04 says "purchased quantity"; RENEW-03 says single volume-tiered Price + current seat quantity; PROJECT.md and ROADMAP.md pricing lines show $35/$32/$28 bands; no surviving $199/$349/$499 or "three tiers"/"per tier" references.</done>
</task>

<task type="auto">
  <name>Task 3: Update STATE.md locked decision + NEXT-10-STEPS Step 8</name>
  <files>.planning/STATE.md, .planning/NEXT-10-STEPS.md</files>
  <action>
**STATE.md** (do NOT touch the "Quick Tasks Completed" table or "Session Continuity" — orchestrator-owned):
- `### Locked Decisions`: REPLACE the existing "**Pricing — flat annual (2026-06-12, Rob):** $199 / $349 / $499 ..." bullet entirely with a new per-seat bullet: "**Pricing — per-seat volume (2026-06-12, Rob):** annual per-seat volume pricing — $35/user/yr (1–9 users), $32/user/yr (10–24), $28/user/yr (25+); all seats billed at the band rate the firm's headcount lands in; FLAT on renewal — no renewal discount. Supersedes BOTH prior same-day models (the original $199/$349/$499 tier bands AND the flat-tier variant) — there are NO fixed-price tiers. Stripe model: ONE product `prod_UgzKT3NrGNAvDA` + ONE volume-tiered Price `price_1ThbLNCzT2268ei9nkadS8kD` (lookup_key `per_seat_annual`, `billing_scheme=tiered`, `tiers_mode=volume`: up_to 9 → $35 / up_to 24 → $32 / inf → $28, `tax_behavior=exclusive`, `tax_code=txcd_20060058`). Checkout `quantity` = seats (Stripe computes the band rate); seat enforcement = subscription `quantity`. Source: live marketing site aistaffcompliance.com. Old test-mode objects archived (active=false): products `prod_UgyZjCbV9uJdzX`/`prod_UgyZ7rqNgXZYao`/`prod_UgyZ30zgvigsd6`, prices `price_1ThachCzT2268ei9HlR1YivD`/`price_1ThaciCzT2268ei9tooaKk8j`/`price_1ThaciCzT2268ei9MRI94R1i`. Live-mode creation deferred pending Stripe Tax."
- `### Open Decisions`: the checked Stripe Price IDs item — keep it `[x]` but update its text from "3 Products × 1 annual Price = 3 Price IDs ... (flat annual pricing)" to "1 Product × 1 volume-tiered Price = single Price ID `price_1ThbLNCzT2268ei9nkadS8kD` (per_seat_annual), created TEST mode 2026-06-12. Live-mode recreation pending Stripe Tax."
- `### Open Decisions`: ADD one new unchecked item flagging the market/band reconciliation: "[ ] Reconcile marketing pricing bands (extend to 25+ users) vs. target-market framing (docs describe 1–15 staff) — positioning vs. pricing-band mismatch to resolve at some point." Leave the Stripe Tax line unchanged.
- Update the file's top "**Last updated:**" line to note per-seat volume pricing locked (keep the date 2026-06-12).

**NEXT-10-STEPS.md — Step 8 only** ("### Step 8: Stripe products and prices"):
- Rewrite the "> **Pricing model (locked ...)**" blockquote to describe per-seat volume pricing: ONE product + ONE volume-tiered Price; Checkout `quantity` = seats; Stripe auto-computes band rate; flat on renewal (same Price ID reused at renewal). Include the volume-cliff note here (and ONLY here): "Known accepted property of volume pricing: 24 seats = $768 but 25 seats = $700."
- Replace the "Completed — test mode [x]" block: instead of 3 products + 3 prices, show ONE product `prod_UgzKT3NrGNAvDA` ("AI Staff Compliance Training — Annual Certification", metadata `pricing_model=per_seat_volume`, `tax_code=txcd_20060058`) and ONE Price `price_1ThbLNCzT2268ei9nkadS8kD` (lookup_key `per_seat_annual`, recurring yearly, `billing_scheme=tiered`, `tiers_mode=volume`: up_to 9 → $35/unit, up_to 24 → $32/unit, inf → $28/unit, `tax_behavior=exclusive`). Add a single "Archived (active=false, lookup keys released):" line listing the 3 old products + 3 old prices.
- Keep the "Remaining — live mode [ ]" items but adjust wording: head_office address → activate Stripe Tax (unchanged); home-state sales-tax registration (unchanged); "Recreate all 3 products + 3 prices in LIVE mode" → "Recreate the single product + volume-tiered price in LIVE mode (lookup_key `per_seat_annual` makes it scriptable)"; "Give the 3 test-mode Price IDs to Max" → "Give the single test-mode Price ID `price_1ThbLNCzT2268ei9nkadS8kD` to Max for `.env.local` + the Worker's env".
- Update Step 8's status sub-line if it names tier prices.

Do not touch other steps.
  </action>
  <verify>
    <automated>cd "C:/Sites/attytraining" && grep -nE 'prod_basic|basic_annual|standard_annual|pro_annual' .planning/STATE.md .planning/NEXT-10-STEPS.md; grep -nE '\$199|\$349|\$499' .planning/STATE.md .planning/NEXT-10-STEPS.md | grep -viE 'archiv|supersed|prior|old' || echo "CLEAN: no active old-pricing refs in STATE/NEXT-10-STEPS"; grep -nq 'price_1ThbLNCzT2268ei9nkadS8kD' .planning/STATE.md && grep -nq 'price_1ThbLNCzT2268ei9nkadS8kD' .planning/NEXT-10-STEPS.md && echo "NEW PRICE ID PRESENT in both"</automated>
  </verify>
  <done>STATE.md locked-decisions has the per-seat volume bullet (old flat bullet gone) noting it supersedes both same-day models; the Price-ID open decision text names the single new Price ID; a new market/band reconciliation open-decision item exists; NEXT-10-STEPS Step 8 shows single product + volume-tiered price with old objects archived and the volume-cliff note; new Price ID appears in both files; Quick Tasks table and Session Continuity untouched.</done>
</task>

</tasks>

<verification>
Run a final repository-wide negative-verification grep that EXCLUDES the immutable historical corpora (`.planning/quick/**` and `.planning/research/**`). No ACTIVE references to the old pricing should survive in the six edited files:

```
cd "C:/Sites/attytraining" && grep -rnE '\$199|\$349|\$499|prod_basic|prod_standard|prod_pro|prod_UgyZ|basic_annual|standard_annual|pro_annual|price_1Thac|price_1Thac' \
  CLAUDE.md .planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/STATE.md .planning/NEXT-10-STEPS.md \
  | grep -viE 'archiv|supersed|do not use|avoid|old pattern|prior|inverse'
```

Expected: zero matches (or only lines explicitly marked archived/superseded/old). Any other match is a surviving active reference that must be fixed.

Positive verification — the new model is present:
```
cd "C:/Sites/attytraining" && grep -rlE 'per[_-]seat|tiers_mode=volume|\$35.*\$32.*\$28|price_1ThbLNCzT2268ei9nkadS8kD' \
  CLAUDE.md .planning/PROJECT.md .planning/REQUIREMENTS.md .planning/ROADMAP.md .planning/STATE.md .planning/NEXT-10-STEPS.md
```
Expected: all six files appear (each carries at least one marker of the new model).
</verification>

<success_criteria>
- All six target files describe per-seat volume pricing ($35/$32/$28 by 1–9 / 10–24 / 25+ bands).
- PAY-01 = quantity-based volume Checkout; PAY-04 = "purchased quantity"; RENEW-03 = single volume-tiered Price + current quantity.
- CLAUDE.md §4 = single product + single volume-tiered Price; What-NOT-to-Use row reversed; Stack Patterns rewritten for quantity-based Checkout.
- STATE.md locked decision replaced (supersedes both same-day models); Price-ID open decision updated to single ID; market/band reconciliation flagged as a new open decision.
- NEXT-10-STEPS Step 8 = single product + volume-tiered price; old objects shown only as archived; volume-cliff note present (Step 8 only).
- New Price ID `price_1ThbLNCzT2268ei9nkadS8kD` present where pricing is documented.
- No ACTIVE old-pricing references survive in the six edited files (archived/superseded/inverse-warning mentions are allowed).
- `.planning/quick/**`, `.planning/research/**`, STATE.md Quick-Tasks table, and Session Continuity left untouched.
</success_criteria>

<output>
Create `.planning/quick/260612-mdv-switch-pricing-model-to-per-seat-volume-/260612-mdv-SUMMARY.md` when done.
</output>
