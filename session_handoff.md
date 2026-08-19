# Session Handoff

**Date:** 2026-08-19 (evening)
**Who:** Rob, with terminal-Claude.

> ⚠️ **Max also worked 2026-08-19, in the morning.** That session shipped the 50-question pool and
> terms acceptance; its handoff has been replaced by this one and lives at
> `.planning/sessions/20260819-max-summary.md`. **Max: three of your four items for Rob are done.
> The Resend one is not — see below.**

---

## 🟢 IURIX IS LIVE. Real money moved tonight.

Stripe live mode is on. A real card was charged $35, provisioned a real firm, and was refunded.
First live Checkout Session, first live webhook delivery, first firm from live money.

Max's terms-acceptance code — written this morning, never run against a real Stripe session — worked
on its first live attempt: `terms_accepted_at` and `terms_version` are stamped on the firm row.

| | |
|---|---|
| Live Stripe account | `acct_1ThDpU5md3Gcv1Z1` ("Iurix Accreditation") |
| Live webhook | `we_1U6FJr5md3Gcv1Z1d2MEOvcY` — dahlia, snapshot payloads, 5 events |
| Live Price | volume 9→$35 / 24→$32 / ∞→$28, `lookup_key: per_seat_annual`, `tax_behavior=exclusive` |
| First live firm | "Katy Chavez Law" — `sub_1U6Fxp5md3Gcv1Z1x6C6k7x8` |

Full detail: **`.planning/sessions/20260819-rob-summary.md`**.

---

## 🔴 The one that got worse tonight, not better

**Resend still refuses to send: `403 The iurixaccreditation.com domain is not verified.`**

Max flagged this at the top of his morning list and it was not touched tonight. All four DNS records
are present and correct — it is a **click in the Resend dashboard**, possibly in *Max's* account
rather than Rob's, not a DNS change.

Max called it "strictly worse than being unable to buy." **That is now literal.** People can buy
tonight. A firm pays, invites their staff, and no invite email is ever delivered — the purchase
succeeds and the product silently does nothing. **This is the highest-priority item in the project.**

Max's other three (activate Stripe, live Price + lookup key, live webhook on the domain) are all
**done**.

---

## Two blockers removed by decision, not by work

**The LLC was dropped.** Stripe was activated as an **Individual / Sole proprietorship** under Rob's
SSN; business type changes to BSBR Holdings later, which keeps customers and subscriptions on the
same account. Unresolved consequence: the legal drafts say "BSBR Holdings, LLC d/b/a Iurix" while the
merchant of record is Rob personally. Katy is reviewing those documents anyway — someone must decide
which name they carry.

**Stripe Tax was never a CPA-sized blocker.** Per Stripe's docs, *"without a registration in the
customer's location, the calculation returns zero tax."* Head office address + preset tax code +
default tax behavior is all `automatic_tax` needs; registrations and filing become necessary when
Stripe's threshold monitoring says so. Carried since 2026-06-12 on a wrong premise.

---

## ⚠️ Three things that will bite whoever picks this up

**1. Sandbox checkout is broken.** The sandbox product was archived tonight, and
`lib/stripe-price.ts` falls back to `SANDBOX_FALLBACK_PRICE_ID` (`price_1TjNHc…`), now inactive.
**Local dev and sandbox testing fail with "price is inactive"** until a sandbox price carries
`lookup_key: per_seat_annual`. Always the intended end state; nobody has done it yet.

**2. `wrangler secret put` refuses when the latest Worker version isn't deployed.** Pushes to `main`
only *upload* a version; production needs a manual `workflow_dispatch`. Deploy first
(`gh workflow run deploy.yml -f target=production`), then set secrets. Related correction: Worker
secrets are **per-version** — every secret change creates and deploys a new version. Earlier notes
saying "no deploy needed" were wrong.

**3. `/api/portal` throws a raw 500 on any Stripe error — `ix-portal500`.** Hit for real tonight (live
key against a sandbox customer, no try/catch in `app/api/portal/route.ts`). Today a stale test firm;
post-launch a paying attorney seeing a browser error page.

---

## PROD state, verified after the refund

```
firms 1 (Katy Chavez Law) · auth.users 1 · certificates 0 · courses 1 ✓
quiz_questions 58 · questions_per_attempt 8 · migrations at 0027 ✓
```

The day's sandbox test firm was purged before the live purchase, so the first real customer is the
only row. `processed_stripe_events` deliberately left alone.

---

## Second track: rmtnetworks.com visitor analytics

Different repo (`C:\Sites\rmtnetworks`), committed and deployed there. Working end to end.

Enabling Web Analytics in the Cloudflare dashboard had done **nothing** — rmtnetworks.com is Netlify
DNS and Netlify-served, so there was no proxy to inject the beacon. Added it to 10 public pages, plus
`netlify/functions/cf-analytics.js` and a "Site Traffic" tile in `portal.html`.

**Keep this one:** a Cloudflare token with **Account Analytics: Read** is accepted by the GraphQL RUM
datasets but **rejected by the REST endpoint `/rum/site_info/list`** — the two are not scoped
together. The function falls back to discovering the site tag through GraphQL. Also: the beacon token
in the HTML and the API's site tag are **different identifiers**. Beacon is blocked by Firefox strict
mode and ad blockers, so expect a 10–30% undercount.

---

## Next steps — Rob's stated order for the next session

0. **Resend domain verification** — not on Rob's list but it outranks everything above. See 🔴.
1. **Cancel `sub_1U6Fxp5md3Gcv1Z1x6C6k7x8`** (refunded but still active; renews in a year). Decide
   first whether "Katy Chavez Law" is a test firm — if so, purge with
   `scripts/purge-prod-test-firm.mjs --firm d3eab4a9-f36d-4c73-ba2d-305426dee0f8`. Cancelling fires
   `customer.subscription.deleted` and the webhook winds the firm down.
2. **`ix-portal500`** — try/catch on `/api/portal`, redirect to `/dashboard` with a message.
3. **The rest of the rmtnetworks changes** — tracking was the first of "a few things."

### Carried
- `ix-authoverflow` · `ix-lessongate` · `ix-certpage`
- Still Rob's from Max's list: `ix-entity`, `ix-assets`, `ix-featuresunbuilt`, `ix-pricecopy`,
  `ix-marketing`, and the refund-policy call inside `ix-stripeaudit`
- The **non-US refund email promises a refund no code issues** — live now, though not hit tonight
- Sandbox price needs the lookup key (⚠️ 1); pin `CF_SITE_TAG`; retire `track-hit.js`
- **20 question stems still name the training material** ("Lesson 4's guidance is…")

> The Supabase CLI project-ref item earlier handoffs carried is **closed** — Max relinked it to
> staging this morning. Do not re-add it.

## Open questions

1. **Is "Katy Chavez Law" a test firm or Katy's real account?** Blocks step 1.
2. **Whose Resend account holds `iurixaccreditation.com`?** Max's or Rob's — it is one click either
   way, but only one person can make it.
3. **Does the Site Traffic tile's "Top page" show a path or a dash?** A dash means Cloudflare's path
   dimension isn't `requestPath`. Totals are unaffected either way.
4. **When does the LLC get formed**, and do the legal drafts name a sole proprietor until then?
5. **Katy's review of the 50 questions**, still happening post-ship.
