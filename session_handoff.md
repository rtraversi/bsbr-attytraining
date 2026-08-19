# Session Handoff

**Date:** 2026-08-19
**Who:** Max, with terminal-Claude.

> **Rob — your list is at the bottom under "ROB: four things."** Everything that did not need you is
> built, tested, deployed and verified live. The product is now waiting on you and on one Resend
> click. Nothing else blocks a customer buying.

## In one paragraph

Two launch gates closed. **`ix-questionpool`** — the certification pool went from 8 questions to 50,
ten per lesson, and is live on PROD. **`ix-termsaccept`** — Terms §1 asserted that customers had
accepted the terms while nothing in the product ever asked; acceptance is now recorded at checkout
for admins and at password-set for staff, with the version pinned alongside the timestamp. Both
shipped in `cfed8bc`, deployed via Actions run 32270342849, and verified against the live site. Along
the way the Supabase CLI was relinked to staging (it had pointed at **PROD** since 08-13, so any
`db push` would have hit production), and mail was tested properly for the first time since 08-07.

## 🔴 The finding that matters most

**Resend still refuses to send. The domain is not verified.**

All four DNS records are present and correct on `iurixaccreditation.com` — the
`resend-domain-verification` TXT, the `send.` SPF, the `send.` MX return path pointing at
`feedback-smtp.us-east-1.amazonses.com`, and the `resend._domainkey` DKIM key. Zoho's MX and SPF are
intact and were not disturbed. Despite that, a real API send returns:

```
403  The iurixaccreditation.com domain is not verified.
```

So this is **no longer "Rob needs to send Max the DNS records"** — the records are in. Somebody with
Resend dashboard access has to open the domain and complete verification. It is a click, not a DNS
change. Max added the domain to Resend originally, so this may be Max's own account rather than
Rob's.

**Why it is the worst one to leave:** a firm pays, the admin invites their staff, and no invite email
is ever delivered. The purchase succeeds and the product silently does nothing. That is strictly
worse than being unable to buy.

Tested with Resend's own sink address (`delivered@resend.dev`), so no real person was emailed.

## ✅ `ix-questionpool` — CLOSED, live on PROD

Migration `0026_question_pool_v1.sql`. Retires the 8 placeholders (**deactivates, never deletes** —
`quiz_sessions.question_ids` and `quiz_attempts` reference them, and a past attempt has to keep
pointing at the text that was actually served) and inserts 50 with durable `L<n>:<topic>` tags and
lesson classification.

PROD verified after the push: **50 active, 10 per lesson, 8 retired, zero null lessons, zero
PLACEHOLDER tags still active.**

The stratified selector that shipped in `adb43f5` has had nothing to choose from until now, because
the pool (8) equalled `questions_per_attempt` (8). Verified against staging with the real selector:
**2000 simulated exams, every one 8 questions with exact 1/2/2/1/2 lesson coverage, zero quota
shortfalls, mean retake overlap 1.39 against a predicted 14/10 = 1.40.**

### Two defects found and fixed while building the bank

- **Answer position was clustered.** The first draft put the correct answer at B 24 times out of 42
  and at D zero times. Rebalanced to A11 / B12 / C13 / D14 across all 50.
- **The correct answer was the longest choice 54% of the time**, against 25% by chance. Because
  retakes are unlimited, a candidate who understood nothing and always picked the longest option
  passed roughly **1 attempt in 18**. Distractors were lengthened on 19 questions; correct answers
  were not touched. Now 18%, and brute-forcing takes about **24,000 attempts**.

Content source of truth is `.planning/question-bank.xlsx`. `0026` is generated from that file and was
round-trip verified back against it, including all 36 rows containing apostrophes. **Regenerate, do
not hand-edit the SQL.**

> ⚠️ **The 50 have NOT had Katy's legal-accuracy review.** Max approved them to ship on 08-19 with
> revision to follow. The review is now happening on live content rather than before it. `ix-certreview`
> and `ix-accreditedcopy` are unaffected and still open.

## ✅ `ix-termsaccept` — CLOSED, live on PROD

Migration `0027_terms_acceptance.sql` adds `terms_accepted_at` + `terms_version` to `firms` and
`firm_members`, CHECK-paired so a timestamp can never exist without the version that pins the
wording. **Nullable and deliberately not backfilled** — accounts predating this never accepted, and
NULL says so honestly.

- **Admins** accept at checkout. Refused **before** the Stripe session is created, so the record
  exists whether or not the card ever clears, then carried on session metadata for the webhook to
  write onto the firm row.
- **Staff** accept at password-set, recorded **before** the password changes, so a failure leaves a
  clean retry rather than an active account with no record of what it agreed to.

`lib/legal/terms.ts` holds `CURRENT_TERMS_VERSION`, currently **`v1-draft-2026-08-18`**.

> 🔴 It says `draft` because `app/terms/page.tsx` still literally reads
> `Last updated: [DATE] — [ATTORNEY TO COMPLETE]`. The mechanism is real and records consent
> properly, but it is recording consent to placeholder text. **Bump the version in the same commit
> that publishes the attorney-reviewed terms**, or every stored acceptance will point at wording
> nobody can reconstruct.

**Three components call `/api/checkout`, and all three now send acceptance.** Two were missed on the
first pass and would have shipped broken with a 400: `app/_components/checkout-form.tsx` (referenced
by nothing today, but posts to the real endpoint) and `app/mockup/_components/pricing.tsx` (404s in
production but posts to the real endpoint in dev). If a fourth caller is ever added, it must send
`termsAccepted` and `termsVersion` or it will 400.

## Verification actually performed

Not inferred, not assumed:

- `tsc --noEmit` clean; **118 tests pass** across 11 files; production build succeeds
- Checkout refuses **missing**, **false**, and **stale-version** acceptance, and still 403s non-US
  first, so the ordering did not change
- A valid request creates a **real Stripe session** carrying the acceptance metadata (confirmed by
  reading the session back from the Stripe API)
- The CTA stays disabled until **both** boxes are ticked, confirmed by driving the live DOM
- Post-deploy, against `https://iurixaccreditation.com`: apex 200, `/api/health` ok with `db: ok`,
  and a checkout without acceptance returns `400 terms_not_accepted`

## Repo + deploy state

| Thing | State |
|---|---|
| `main` | `cfed8bc`, pushed |
| Production | Deployed from `cfed8bc` via Actions run **32270342849**, all steps green including CI's own smoke test |
| PROD database | Migrations through **0027** applied |
| Staging database | Migrations through **0027** applied |
| Supabase CLI | **Relinked to staging** (`ndmzvtuywcufvkxtkjhg`) |

## What was deliberately NOT done

- **`ix-doublebill`** — a pre-charge identity check needs the buyer's email *before* Stripe collects
  it, which means restructuring the pricing page to capture email first. That is a design decision,
  not a patch, and half of it would be worse than none. Still open, still blocks `ix-stripeaudit`.
- **PROD was not seeded or purged.** No test firm was created.
- **Wrangler on Max's Mac still cannot reach the Worker's account** — the OAuth token belongs to
  `solarsaiko@gmail.com` / account `92ad73af…` while the Worker lives under `4b2a4023…`. Deploys go
  through Actions, which is unaffected, but there is **no local rollback path** from that machine.

---

# ROB: four things

Everything else is done. In the order that unblocks the most:

1. **Verify the Resend domain.** Open `iurixaccreditation.com` in Resend and complete verification.
   The DNS records are already in and correct — do **not** add or change any DNS, and do **not**
   enable Cloudflare Email Routing on the apex (it carries Zoho MX). If the domain sits in Max's
   Resend account rather than yours, say so and Max will do it. Until this is done, paying customers'
   staff receive no invite emails.
2. **Activate Stripe live mode** — bank details, LLC/EIN, merchant activation. Nothing can be
   purchased at all until this exists.
3. **Create the live Price and set `lookup_key: per_seat_annual` on it.** The code resolves the Price
   by lookup key at runtime, so this needs no redeploy — but live checkout **refuses to charge**
   without it, deliberately, rather than falling back to a Price nobody chose. While you are there,
   the product is still named "AI Staff Compliance Training — Annual Certification", which is the
   retired course name and appears on every invoice and receipt.
4. **Register the live webhook on `iurixaccreditation.com`.** Without it a customer pays and no firm,
   no seats and no admin account are ever created.

Also still yours and unchanged: `ix-entity`, `ix-assets`, `ix-featuresunbuilt`, `ix-pricecopy`,
`ix-marketing`. And the refund-policy call inside `ix-stripeaudit`: retain manual refunds, or approve
an idempotent automatic full-refund flow.

## Open questions

1. **Whose Resend account holds the domain?** The 08-07 note says Max added it but Rob's account can
   see the DNS screen. Whoever it is, it is one click.
2. **Katy's review of the 50**, now happening post-ship rather than pre-ship.
3. **`ix-doublebill`** needs a decision on capturing email before Stripe does.
4. **20 question stems still name the training material** ("Lesson 4's guidance is to use…"). On a
   certificate asserting Rule 5.3 compliance this reads like a course quiz rather than a professional
   assessment. Max cleaned three; the rest are listed in the workbook.
