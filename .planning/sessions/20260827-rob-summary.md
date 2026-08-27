# Session summary — 2026-08-27 (Rob, with terminal-Claude)

Entity, EIN and Stripe. **No application code was touched at any point.** Everything below is
either a live-service change, a database deletion, or a document correction.

---

## 1. The headline: the docs were a release behind on Stripe

Every planning document said Stripe was sandbox-only and that live-mode object creation was
"deferred pending Stripe Tax". **It had been live since 2026-08-19**, and had already taken and
refunded a real card payment.

Read from the Stripe API on 2026-08-27:

| | Live |
|---|---|
| Account | `acct_1ThDpU5md3Gcv1Z1` — charges and payouts enabled |
| Product | `prod_V6NwTwWVBDkz7R` — "Iurix Accreditation — Annual Certification", already renamed |
| Price | `price_1U6BAj5md3Gcv1Z13Rx9qQll` — `lookup_key: per_seat_annual`, tiers verified $35 / $32 / $28 |
| Tax | Stripe Tax **active**; head office Garner NC; registration `taxreg_1U6B2M5md3Gcv1Z1r6EWlpt2` (NC `state_sales_tax`) |
| Webhook | `we_1U6FJr5md3Gcv1Z1d2MEOvcY` → `https://iurixaccreditation.com/api/webhooks/stripe`, enabled |

Three of the four "config deltas" tracked as `ix-stripeaudit` were already closed. The docs had
none of this.

### Applied this session

- Product `tax_code`: `txcd_10000000` ("General – Electronically Supplied Services") →
  **`txcd_20060058`** ("Training Services – Self-study Web-based"). Reversible.
- Price `tax_behavior`: `unspecified` → **`exclusive`**. ⚠️ **One-way — it cannot be changed
  again**, only superseded by a new Price. In practice a no-op: the account default is
  `inferred_by_currency`, which already inferred exclusive for USD, and the 2026-08-19 charge
  collected $2.54 NC tax on $35.00 correctly. The change made it explicit rather than implicit.

`ix-stripeaudit` is now closed. Product `metadata` is still empty and nothing reads it.

---

## 2. Proving prod holds live Stripe keys — and why inspection cannot do it

**Cloudflare never returns secret values.** `wrangler secret list` returns names only; the
Cloudflare MCP has no secrets tool at all (`workers_get_worker` returns name and id). No amount of
re-authing changes this. Do not spend time on it again.

Established behaviourally instead:

1. Live session `cs_live_b1ryl…` **paid $37.54** on 2026-08-19 — $35.00 + $2.54 NC tax — with
   `success_url` on `iurixaccreditation.com`.
2. The prod Supabase firm "Katy Chavez Law" was provisioned **37 seconds later**, carrying
   `sub_1U6Fxp5md3Gcv1Z1x6C6k7x8`.
3. Cancelling that subscription today fired `customer.subscription.deleted`; prod processed it
   **2 seconds later** (`evt_1U99KS5md3Gcv1Z15goDQ6tO`).

Steps 2 and 3 only happen if the deployed Worker holds the **live** `STRIPE_WEBHOOK_SECRET`.

---

## 3. A live subscription was still running after the refund

Rob refunded the 08-19 test charge at the time, and understood that to have ended it. **It had
not.** Refunds and subscriptions are separate objects in Stripe, and the dashboard's refund flow
does not offer to cancel. `sub_1U6Fxp…` was `status: active`, `canceled_at: null`, **renewing
2027-08-19**.

Cancelled 2026-08-27 19:51:16 UTC. Charge `ch_3U6Fxn…` confirmed fully refunded, $37.54 of $37.54.

**Order mattered:** cancel first, then purge. Purging the firm first would have left a live
subscription with no firm behind it.

---

## 4. Prod test firm purged

Firm `d3eab4a9-f36d-4c73-ba2d-305426dee0f8` ("Katy Chavez Law"), Rob's own live smoke test, purged
with `scripts/purge-prod-test-firm.mjs --confirm`. Baseline taken first, per `PROD-CUTOVER.md`.

Dry run, live run and an independent database read all matched: 0 storage objects, 0
`training_events`, then the firm cascade of **1 seat, 1 firm_member, 1 firm**, then **1 auth.user**.
Everything else was already zero — the firm never got past provisioning.

Verified after: `firms`, `firm_members`, `seats`, `enrollments`, `quiz_sessions`, `quiz_attempts`,
`certificates`, `cert_generation_queue`, `training_events`, `auth.users`, `storage.objects` — all
**0**. `courses` 1 and `quiz_questions` **58** untouched.

> 📌 **`processed_stripe_events` went 7 → 8, and that is correct.** The cancellation in §3 fired a
> webhook that prod processed two seconds before the purge — which is also why the purge script read
> the firm as `status=cancelled` rather than `active`. Expect 8. The row is retained deliberately;
> removing it would let a replayed webhook re-provision the deleted firm.

**Prod now holds zero firms.** The "17 firms" the docs worried about are in **staging**.

---

## 5. Entity: BSBR Holdings, LLC

Approved, EIN issued, both landing today. Registered on Stripe as **Company / multi-member LLC —
Rob and Katy** — which is why Stripe's ownership requirements applied. Requirements completed;
`charges_enabled` and `payouts_enabled` remained true throughout.

This resolves **open question #3 in `.planning/legal/README.md`**: the entity is
**"BSBR Holdings, LLC d/b/a Iurix"**, and Iurix is *not* becoming its own LLC. The app and legal
docs already carry that exact wording in seven places — **no code change needed.**

It also corrects `STATE.md` §6, which said Stripe would activate on an *existing* EIN, "no new
entity, no new EIN". Both halves were wrong.

### ⚠️ Two traps found the hard way

- **`GET /v1/account` cannot verify entity state on a standard non-Connect account.** It still
  returns `business_type: individual`, `company.name: "Robert M Traversi"` and `requirements: null`
  regardless of the truth — legacy data, not live state. This was misdiagnosed **twice** today: once
  as far as claiming the change had never been submitted, and once as a probable duplicate Stripe
  account. The dashboard's **Account status** tab is the only authority.
- The EIN is **not written into any file.** The repo is public on GitHub. Only "EIN on file" appears.

### 🟠 New, and customer-visible

The entity change **overwrote the statement descriptor** with `BSBR HOLDINGS LLC`. It read
`IURIX ACCREDITATION`. Buyers recognise the brand, not the holding company, and an unrecognised
descriptor is a common chargeback trigger. **Set it back** — Settings → Business → Statement
descriptor.

---

## 6. Cloudflare auth — still wrong, and it matters less than it looked

The wrangler OAuth session is on account `2809122619f6ccd79e32edeb6e98504c`; the Workers live in
`4b2a402334decc9259d7317aaf9782f0` (`DEPLOY-RUNBOOK.md:52`). `wrangler secret list` returns
`Authentication error [code: 10000]`.

The **Cloudflare MCP is on the right account** and lists all four Workers, so it is a usable
read-only stand-in. Neither can reveal a secret value — see §2.

Fix: `wrangler logout && wrangler login` selecting the `4b2a…` account, or export the CI token with
`CLOUDFLARE_ACCOUNT_ID=4b2a402334decc9259d7317aaf9782f0`.

---

## 7. Documents corrected

`CLAUDE.md` §4 rewritten; `OPEN-ISSUES.md` #6 and #7 closed, **#6b escalated**, #7b added;
`PROD-CUTOVER.md`'s premise superseded and the purge recorded; `NEXT-10-STEPS.md` (now in
`archive/`), `STATE.md`, `BACKLOG.md`, `REQUIREMENTS.md`, `legal/README.md`.

Commits: `172d09b` (corrections), `d2100a9` (merge of Max's 08-26 reorg + the STATE corrections).

**The merge is worth noting.** Max's reorg rewrote `STATE.md`, which declares itself the document
that wins. His new copy carried the *same* stale Stripe premise, so left alone it would have
outranked the correction from day one. Corrected inside the merge: §5.4 (Stripe), §6 (entity),
§5.3 (wrangler), §3 (the `main` pointer), and the Blocked-on-Rob CPA item — NC registration is
done, so that consult is now about **multi-state**, not NC.

---

## Open, and deliberately not done

1. 🔴 **`app/api/webhooks/stripe/route.ts:630`** — emails a non-US buyer that their payment is being
   refunded. `refunds.create` appears **zero times** in the codebase. Harmless on sandbox money;
   live money now. Either soften the wording or actually issue the refund.
2. **Payout bank account** → the LLC's business account. A company-type account paying out to a
   personal account is a mismatch Stripe eventually flags.
3. **Statement descriptor** → back to `IURIX ACCREDITATION`.
4. `lib/stripe-price.ts:52` `SANDBOX_FALLBACK_PRICE_ID` is now unreachable in production. Its own
   header says to delete it once the live Price carries the key — but the **sandbox** Price still
   has no lookup key, so deleting it would break sandbox checkout. Left in place; it is
   self-retiring by design.
5. Product `metadata` still empty. Cosmetic.
