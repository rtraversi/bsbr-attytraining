# `ix-stripeaudit`

**Owner:** Max · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,374 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

🔴🔴 LAUNCH GATE, Max's words: ‘its REAL money. we must be sure.’ Nothing about Stripe has ever run against real money. Audit every file touching the Stripe API: checkout, the ~373-line webhook, portal, billing summary and auto-renew, onboarding complete and status. Must close first: ix-doublebill, ix-refundnonus, ix-lookupkey, and Stripe Tax, since automatic_tax is already on so live checkout hard-fails without it. Confirm the live webhook is registered ONCE, on the new domain.

---

## Full text, captured 2026-08-06

🔴🔴 LAUNCH GATE — FULL STRIPE VERIFICATION BEFORE LIVE MODE. LOGGED 2026-07-31 13:51 MST (Max), verbatim: “stripe verification before launch. need to know all code regarding the stripe api is FULLY functionaly the way we planned it. its REAL money. we must be sure. this is a deal breaker and must be given maximum attention before it ever goes live.” THIS IS A HARD GATE, NOT A CHECKLIST ITEM. Nothing about Stripe has ever run against real money — everything to date is sandbox acct_1ThDpr6ZCSojEKRr. SURFACE TO AUDIT (every file that touches the Stripe API): app/api/checkout/route.ts (volume pricing, adjustable_quantity, automatic_tax, the active-firm guard), app/api/webhooks/stripe/route.ts (~373 lines, raw-body signature verify, processed_stripe_events idempotency, FIVE handlers incl. grace-vs-lapsed renewal re-enrollment), app/api/portal/route.ts, app/api/billing/summary + auto-renew (NEW, Batch 3), app/api/onboarding/complete + status. KNOWN ISSUES THAT MUST BE CLOSED FIRST: ix-doublebill (a customer can be charged and provisioned nothing — pinned Monday), automatic_tax is already enabled so LIVE CHECKOUT HARD-FAILS until Stripe Tax is on, and the PRICE_ID is hardcoded at checkout/route.ts:17 and must be swapped for the live-mode object. Also confirm the live webhook is registered ONCE, on the NEW domain, and that the statement descriptor reads Iurix
