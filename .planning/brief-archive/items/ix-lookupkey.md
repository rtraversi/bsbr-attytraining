# `ix-lookupkey`

**Owner:** Terminal · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,475 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

Branch stripe-lookup-key, built and preview-verified 08-05, NOT merged. main still carries the hardcoded sandbox price ID at checkout/route.ts:17. Merging removes a source edit and redeploy from the middle of the live-key cutover. Then create the live Price with lookup_key: per_seat_annual.

---

## Full text, captured 2026-08-06

✅ BUILT AND PREVIEW-VERIFIED 2026-08-05, ❌ NOT MERGED, NOT DEPLOYED. Branch stripe-lookup-key, one commit (0d5e180), preview 5e7c5507-bsbr-attytraining.aistaffcompliance.workers.dev. Confirmed 2026-08-06 that main still carries the hardcoded price_1TjNHc6ZCSojEKRrKs79ToJ0 at app/api/checkout/route.ts:17. WHY IT MATTERS: that ID is livemode:false, so going live currently means editing source, rebuilding and redeploying IN THE MIDDLE OF THE KEY-AND-WEBHOOK CUTOVER, which is the worst possible moment to need a deploy and an easy step to forget until a real customer hits a card error. The branch resolves the Price by lookup_key at runtime instead. THE DESIGN IS THE GOOD PART: the fallback to the sandbox ID is gated on the secret key being a TEST key, so in live mode the fallback is unreachable and the code REFUSES rather than charging against a price nobody chose. It fails at the operator’s first test purchase, not at a customer’s. Self-retiring: inert the moment the live key is in place, with nobody needing to remember to delete it. Decision is a pure function in lib/stripe-price.ts with 12 tests; the network round trip is deliberately untested rather than mocked. Verified on the deployed preview against real sandbox Stripe sessions at 1 seat and at the 10-seat band boundary, with the non-US guard still returning 403. WHAT REMAINS IS A DASHBOARD ACTION: create the LIVE price with lookup_key: per_seat_annual. Removes the price-ID swap from ix-stripeaudit.
