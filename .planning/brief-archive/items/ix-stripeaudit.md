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

## Audit decision — 2026-08-07

The Stripe audit confirmed that an email-in-use checkout cancels the new
subscription but sends a customer email saying the payment *is being refunded*.
No code calls Stripe's refund API. That promise is therefore false.

**Max's interim decision:** retain a **manual refund** for now. The immediate
code fix is to soften the customer email: say the subscription has been
cancelled and the payment needs review; never state or imply that a refund is
already in motion. The existing provisioning-failure ledger and operator alert
remain the operational record.

**Notification rule:** this case must alert **both Max and Rob** through the
comma-separated `OPERATOR_ALERT_EMAIL` configuration, then they issue the
manual refund in Stripe. The alert is not currently deliverable because Resend
returns 403 until `iurixaccreditation.com` is verified (see `ix-dnszoho`).

**Rob's final decision before live mode:** confirm that refunds remain manual,
or explicitly approve an idempotent automatic full-refund flow. This is a
policy decision, not a wording tweak. Until Rob decides, the customer-facing
copy must stay conservative and the manual workflow is the only approved path.

Also verified in Stripe test mode on this date: the hosted Checkout product is
now named **IURIX Annual Accreditation**. The same title must be used on the
separate live-mode product.

---

## Manual-refund copy shipped — 2026-08-07

The email-in-use customer email and its paired operator alert were changed to
match Max's interim manual-refund decision. A cancelled subscription now tells
the buyer that it will not renew and asks them to contact IURIX so the payment
can be reviewed; a failed cancellation says the subscription needs attention.
Neither state says a refund has been issued or is already under way.

The operator alert now directs **Max and Rob** to manually review the payment
and issue any refund in Stripe. `tests/checkout-email-in-use.test.ts` renders
both states and rejects the old false-refund wording. The existing
comma-separated `OPERATOR_ALERT_EMAIL` support remains the delivery mechanism.
Until Resend verifies `iurixaccreditation.com`, that alert cannot be delivered;
until Rob makes the final policy call, no automatic refund flow is approved.

---

## Full text, captured 2026-08-06

🔴🔴 LAUNCH GATE — FULL STRIPE VERIFICATION BEFORE LIVE MODE. LOGGED 2026-07-31 13:51 MST (Max), verbatim: “stripe verification before launch. need to know all code regarding the stripe api is FULLY functionaly the way we planned it. its REAL money. we must be sure. this is a deal breaker and must be given maximum attention before it ever goes live.” THIS IS A HARD GATE, NOT A CHECKLIST ITEM. Nothing about Stripe has ever run against real money — everything to date is sandbox acct_1ThDpr6ZCSojEKRr. SURFACE TO AUDIT (every file that touches the Stripe API): app/api/checkout/route.ts (volume pricing, adjustable_quantity, automatic_tax, the active-firm guard), app/api/webhooks/stripe/route.ts (~373 lines, raw-body signature verify, processed_stripe_events idempotency, FIVE handlers incl. grace-vs-lapsed renewal re-enrollment), app/api/portal/route.ts, app/api/billing/summary + auto-renew (NEW, Batch 3), app/api/onboarding/complete + status. KNOWN ISSUES THAT MUST BE CLOSED FIRST: ix-doublebill (a customer can be charged and provisioned nothing — pinned Monday), automatic_tax is already enabled so LIVE CHECKOUT HARD-FAILS until Stripe Tax is on, and the PRICE_ID is hardcoded at checkout/route.ts:17 and must be swapped for the live-mode object. Also confirm the live webhook is registered ONCE, on the NEW domain, and that the statement descriptor reads Iurix
