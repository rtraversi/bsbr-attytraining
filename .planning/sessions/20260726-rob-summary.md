# Session — 2026-07-26 (Rob, terminal)

> **Scoping session. No code was changed.** Working tree was clean at start; the only new file is
> `.planning/RENAME-IURIX.md` plus these session records.

## Why this session happened

Rob returned to the project after a gap believing "the only thing we haven't completed is the
payment backend." **That premise was wrong and is worth correcting loudly**, because it has now
misled the entry point into two separate sessions.

## Finding: the payment backend is built, deployed, and substantially complete

Verified by reading the code, not the notes:

- `app/api/checkout/route.ts` — Checkout Session, `quantity` = seats, `adjustable_quantity`,
  `automatic_tax`, `tax_id_collection`, plus the double-purchase guard (active-firm admin gets
  redirected to `/api/portal`).
- `app/api/webhooks/stripe/route.ts` — 373 lines. Raw-body signature verification, idempotency via
  `processed_stripe_events`, and five real handlers: `checkout.session.completed` (auth user → firm
  → seats → `firm_members`, stamps `firm_id`/`role` into `app_metadata`), `subscription.updated`,
  `subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded` (with grace-vs-lapsed
  renewal re-enrollment and notification emails).
- `app/api/portal/route.ts` — Billing Portal session.

**What is actually missing is not code — it's Stripe live mode.** Everything runs on sandbox
`acct_1ThDpr6ZCSojEKRr`.

## Decisions locked this session (Rob)

1. **Name: "Iurix Accreditation"**, or **"Iurix"** for the company. Replaces "Athena".
2. **Corporate structure:** BSBR Holdings, LLC is the parent. **Iurix, IurisIQ, and Built Smart by
   Rob are three separate companies under it.**
3. **Therefore "Built Smart by Rob" must be removed from this product entirely** — it is a sibling
   brand, not the publisher. It currently sits on the cert PDF, email footers, legal pages, cert
   Worker, and site footer.
4. **Legal entity = BSBR Holdings, LLC; Iurix is a DBA.** Legal pages → "BSBR Holdings, LLC d/b/a Iurix".
5. **Domain moves to an Iurix domain** (specific domain NOT yet chosen — this is the top blocker).

### Consequence worth flagging: the Stripe live-mode blocker is half dead

It has been carried since 2026-06-12 as "LLC/EIN + Stripe Tax." Decision #4 resolves the LLC/EIN
half — Stripe activates under BSBR Holdings, LLC's **existing** EIN with Iurix as the trade name.
No new entity, no new EIN, no waiting. Remaining: head-office address → Stripe Tax activation →
state registration / CPA consult.

## Deliverable

**`.planning/RENAME-IURIX.md`** — full 7-layer scoping doc with per-file/per-line inventory,
blockers, sequencing, and suggested order. Max works from that file, not from this summary.

Layer summary: (1) Athena→Iurix wordmark, 16 files ~42 refs. (2) Remove Built Smart by Rob, 9 files
15 refs. (3) "AI Staff Compliance Training" — decision needed, recommend keeping. (4) Domain move —
blocked on Rob. (5) Logo assets — blocked on Rob. (6) Stripe live mode. (7) Records risk.

## Corrections to repo docs found while scoping

- **CLAUDE.md Stripe IDs are stale.** It names `price_1ThbLNCzT2268ei9nkadS8kD` /
  `prod_UgzKT3NrGNAvDA`. The code actually uses **`price_1TjNHc6ZCSojEKRrKs79ToJ0`** hardcoded at
  `app/api/checkout/route.ts:17`, on sandbox account `acct_1ThDpr6ZCSojEKRr`.
- **`.planning/STATE.md` is badly stale** — still reports "Phase 0, 0% complete" as of 2026-06-12.
  Phases 1–5 are done and deployed. The 07-24 session already flagged this and it still hasn't been
  fixed. It has now misled the start of two sessions. **Refresh it or delete it.**
- **`cloudflare_stream_video_id` is NOT a real gap.** The 07-24 session flagged the
  `'stub-not-yet-uploaded'` write at `app/api/onboarding/complete/route.ts:82` as a confirmed hole
  needing design. Grepped it: the column is only ever **written**, never read by any app code
  (`grep` hits are the write, the migration, a test fixture, and generated types). It's a vestigial
  `NOT NULL` from the pre-Rise Cloudflare Stream era. Training content is static SCORM under
  `public/training-content/scorm-v1/`, identical for every firm. Downgrade to "drop the column
  someday," not a blocker.

## Sequencing traps recorded for Max

- Do the **domain cutover before registering the Stripe live webhook**, or it gets registered twice
  and you chase a stale `whsec_`.
- `app/api/checkout/route.ts:68` already sets `automatic_tax: { enabled: true }` — **live checkout
  hard-fails until Stripe Tax is actually enabled.**
- Resend domain verification was already an open blocker. Verify the **new** domain — this session
  caught it before anyone burned the work on `aistaffcompliance.com`.
