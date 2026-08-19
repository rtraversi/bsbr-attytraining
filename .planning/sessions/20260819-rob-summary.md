# 2026-08-19 — Rob (evening) — Stripe went LIVE

Max's morning session (`20260819-max-summary.md`) shipped the question pool and terms acceptance.
This is the **evening** session, on a different machine. **IURIX is now taking real money.**

---

## The headline

**Stripe live mode is on, and a real card was charged and refunded end to end.**

The first live Checkout Session, the first live webhook delivery, and the first firm provisioned from
live money all happened tonight. Terms acceptance — code Max wrote this morning that had never run
against a real Stripe session — worked on its first attempt.

| | |
|---|---|
| Live account | `acct_1ThDpU5md3Gcv1Z1` ("Iurix Accreditation") |
| Live webhook endpoint | `we_1U6FJr5md3Gcv1Z1d2MEOvcY`, API version `2026-05-27.dahlia`, 5 events |
| First live firm | "Katy Chavez Law" — `cus_V6Stt…` / `sub_1U6Fxp5md3Gcv1Z1x6C6k7x8` |
| Terms recorded | `v1-draft-2026-08-18`, accepted 20:19:24 UTC; firm created 20:20:01 UTC |

---

## The LLC blocker was dropped, deliberately

Carried since 2026-06-12 as "LLC/EIN + Stripe Tax." **Rob's call tonight: activate as an
Individual / Sole proprietorship under his SSN and switch to BSBR Holdings later.**

Two consequences recorded at the time, neither resolved:

1. **Switching to the LLC later is a dashboard "change business type" flow** that keeps customers and
   subscriptions on the same account. If Stripe ever routes it to a *new* account instead, every
   `stripe_customer_id` / `stripe_subscription_id` in the database goes stale. Low probability, but
   it argues for forming the LLC sooner rather than at 200 customers.
2. **The legal pages disagree with the receipts.** The 2026-07-26 decision put "BSBR Holdings, LLC
   d/b/a Iurix" in the Terms and Privacy drafts, but the merchant of record is currently Rob
   personally. Katy is reviewing those documents anyway — decide whether the drafts name a sole
   proprietor and get amended at LLC time, or whether the discrepancy is accepted.

### Stripe Tax turned out to be ten minutes, not a CPA engagement

The docs settle it: *"Without a registration in the customer's location, the calculation returns zero
tax."* So `automatic_tax: { enabled: true }` needs only **head office address + preset tax code +
default tax behavior**. **No registrations, no filing, no CPA consult** — those become necessary when
Stripe's threshold monitoring says so, not before. Checkout showed a $0 tax line and worked.

This retires a launch blocker that had been carried for two months on a wrong premise.

---

## What was actually done, in order

1. **Account activation** — sole prop, public business name → **Iurix Accreditation**, statement
   descriptor → IURIX. (The public business name had still been the retired "AI Staff Compliance &
   Training"; it rendered in the customer portal preview.)
2. **Stripe Tax** — head office address, preset tax code, default behavior. No registrations.
3. **Live Product + Price** — product renamed off the retired course name; unit label `Seat`;
   price yearly USD, `tiers_mode=volume`, 9→$35 / 24→$32 / ∞→$28, `tax_behavior=exclusive`.
4. **`lookup_key: per_seat_annual`** set on the live Price. **This was missed on the first pass and
   is what broke the first smoke test** — see Findings.
5. **Customer portal** configured in live mode (it does not carry over from sandbox).
6. **Webhook endpoint** created in live mode, snapshot payloads, dahlia.
7. **Secrets** — `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` on `bsbr-attytraining`,
   `STRIPE_SECRET_KEY` on `bsbr-cert-worker`.
8. **PROD purged** of the day's sandbox test firm, then the real purchase, then refund.

**Custom checkout domain was declined** — $10/mo, cosmetic. For an unknown brand selling to solo
attorneys, `checkout.stripe.com` is a trust *asset*, not a liability.

---

## Findings worth keeping

### 1. `wrangler secret put` refuses when the latest version isn't deployed

```
X [ERROR] Secret edit failed. You attempted to modify a secret, but the latest
version of your Worker isn't currently deployed.
```

This is CI working as designed: pushes to `main` run `opennextjs-cloudflare upload` (new version, not
deployed); production only goes live on a manual `workflow_dispatch`. Three docs commits since the
2026-08-14 deploy left uploaded-but-undeployed versions, and wrangler refused to ship them as a side
effect of a secret change.

**Fix:** run the production deploy first (`gh workflow run deploy.yml -f target=production`), then
set secrets. `wrangler versions secret put` is the alternative but leaves the secret inert until a
separate `versions deploy`.

**Also corrected:** Worker secrets are **per-version**. There is no in-place edit on a running
version; every secret change creates and deploys a new version. Earlier notes saying "no deploy
needed" were wrong.

### 2. 🔴 `/api/portal` returns a raw 500 on any Stripe error — `ix-portal500`

Hit live tonight. Rob was signed in as the admin of a leftover test firm; `/api/checkout:137`
redirects an active firm to `/api/portal`, which called `billingPortal.sessions.create` with a live
key against a **sandbox** customer. Stripe threw "No such customer", and `app/api/portal/route.ts`
has **no try/catch**, so the browser got a Firefox error page.

Tonight it was a stale test customer. Post-launch it is a paying attorney trying to update a card.
Should catch, log, and redirect to `/dashboard` with a message.

### 3. Sandbox checkout is now broken — by design, but Max will hit it

The sandbox **product was archived** tonight. `lib/stripe-price.ts` falls back to
`SANDBOX_FALLBACK_PRICE_ID` (`price_1TjNHc…`) when a test key finds no price carrying the lookup key,
and Stripe rejects an inactive price. **Local dev and sandbox testing will fail with "price is
inactive" until a sandbox price carries `lookup_key: per_seat_annual`.** That was always the intended
end state — the fallback was written to be deleted — but nobody has done it yet.

### 4. A refund is not a cancellation

`sub_1U6Fxp5md3Gcv1Z1x6C6k7x8` was refunded but **remains active**. It renews in a year and the firm
stays `active`. Still open — see below.

### 5. My stale `main` produced a wrong claim

I told Rob the pending deploy was "docs-only" based on a local `main` that predated Max's three
morning commits. It was not: it carried the 50-question pool and terms acceptance. **No harm — Max
had already deployed the same code at 15:32 UTC**, so the 19:44 deploy added only a docs commit. But
the reasoning was wrong, and the tell was a live endpoint returning an error string
(`terms_not_accepted`) that existed nowhere in the working tree. **Fetch before reasoning about what
is deployed.**

---

## PROD database state (verified after the refund)

```
firms 1 (Katy Chavez Law) · auth.users 1 · certificates 0
courses 1 ✓ · quiz_questions 58 · questions_per_attempt 8 · pass_threshold 80
migrations at 0027 ✓ (Max's 0026 question pool + 0027 terms acceptance both applied)
```

`quiz_questions` at 58 against a subset of 8 **closes `ix-questionpool`** — retakes now draw a fresh
subset instead of reshuffling the same eight.

The day's sandbox test firm was purged with `scripts/purge-prod-test-firm.mjs` (dry run matched the
database exactly: 1 firm, 1 member, 1 enrollment, 1 seat, 1 auth user, 0 certificates, 0 storage
objects). `processed_stripe_events` was deliberately left alone — removing an id would let a replayed
webhook re-provision a deleted firm.

---

## Second track: rmtnetworks.com visitor analytics

Different repo (`C:\Sites\rmtnetworks`, Netlify), committed and deployed there.

**Verified first, and it mattered:** enabling Web Analytics in the Cloudflare dashboard had done
**nothing**. rmtnetworks.com is Netlify DNS (NS1) and Netlify-served — Cloudflare is not in the path,
so automatic beacon injection has nothing to hook into. `curl` of the homepage showed zero
`cloudflareinsights` references.

- **Beacon added to 10 public pages** (`index`, `demos`, `clients`, `ideas`, `tax`, `uscis`, `vps`,
  `proof-scan-sample`, `tracker-demo`, `demos/new-deed/index`). `tracker.html` and `portal.html`
  deliberately untracked.
- **`netlify/functions/cf-analytics.js`** — Rob-only (same `isRob` guard as `stripe-metrics`), queries
  `rumPageloadEventsAdaptiveGroups` for 24h/7d visits and pageviews.
- **"Site Traffic" tile** in `portal.html`.

### 🔴 The Cloudflare permission asymmetry — worth remembering

A token with **Account Analytics: Read** (which the GraphQL RUM datasets require and accept) gets
**"Authentication error" from the REST endpoint `/accounts/{id}/rum/site_info/list`.** Cloudflare
does not scope the two together. The site tag lookup therefore falls back to asking the analytics
dataset itself which site tags hold data — which works under the permission granted, but can only see
sites that already have pageviews. `CF_SITE_TAG` overrides both paths and should be pinned.

**Also:** the beacon token in the HTML and the site tag the API wants are **different identifiers**.

**Undercount caveat:** Firefox strict mode, VPN extensions and ad blockers all block the beacon.
Rob's own desktop visits do not register; his phone on cellular does. Expect 10–30% undercount on a
technical audience. Directionally useful, not audit-grade.

---

## Next steps (Rob's stated order for the next session)

1. **Cancel `sub_1U6Fxp5md3Gcv1Z1x6C6k7x8`** — decide first whether "Katy Chavez Law" is a throwaway
   test firm (cancel + purge with the same script, firm id `d3eab4a9-f36d-4c73-ba2d-305426dee0f8`) or
   Katy's real account (then the refunded-but-active subscription needs resolving differently).
   Cancelling fires `customer.subscription.deleted` and the webhook winds the firm down.
2. **`ix-portal500`** — wrap `/api/portal` in try/catch; redirect to `/dashboard` with a message.
3. **The rest of the rmtnetworks website changes** — tracking was the first of "a few things."

### 🔴 Inherited from Max's morning session and NOT done tonight
**Resend still refuses to send — `403 The iurixaccreditation.com domain is not verified.`** All four
DNS records are correct; somebody with Resend dashboard access has to click verify, possibly in
**Max's** account rather than Rob's. This was the top item on Max's list and it is now worse than he
described it: **money is live.** A firm can pay tonight, invite their staff, and no invite email is
ever delivered. Items 2–4 on Max's list (activate Stripe, live Price + lookup key, live webhook) were
all completed tonight — this one was not.

### Carried, unchanged
- **`ix-authoverflow`** — 390px horizontal overflow on `/login` and `/onboarding`.
- **`ix-lessongate`** — new bug or a PROD reproduction of `INTERFACE-CORRECTIONS.md` item 2.
- **`ix-certpage`** — no durable certificate page, only an expiring signed URL.
- Max's list, still Rob's: `ix-entity`, `ix-assets`, `ix-featuresunbuilt`, `ix-pricecopy`,
  `ix-marketing`, and the refund-policy call inside `ix-stripeaudit`.
- **20 question stems still name the training material** ("Lesson 4's guidance is…"), which reads as
  a course quiz rather than a professional assessment on a Rule 5.3 certificate.

> The Supabase CLI project-ref item that earlier handoffs carried is **closed** — Max relinked it to
> staging this morning. Do not re-add it.
- **The non-US refund email promises a refund no code issues** (`refunds.create` = 0 occurrences).
  Not hit tonight (US buyer), but it is live now.
- **Sandbox price needs `lookup_key: per_seat_annual`** so sandbox checkout works again (Finding 3).
- **Pin `CF_SITE_TAG`** in Netlify; retire `track-hit.js` counters once the tile is trusted.

## Open questions

1. **Is "Katy Chavez Law" a test firm or Katy's real account?** Blocks step 1.
2. **Does the Site Traffic tile's "Top page" show a path or a dash?** A dash means Cloudflare's path
   dimension is not `requestPath` and the top-pages query needs the correct field name. Totals are
   isolated from this and are unaffected either way.
3. **When does the LLC get formed**, and do the legal drafts name a sole proprietor until then?
