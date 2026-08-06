# `ix-refundnonus`

**Owner:** Rob · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **847 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

🔴 Live right now. webhooks/stripe/route.ts:630 tells a non-US buyer in writing that their payment is being refunded. refunds.create appears ZERO times in the codebase, by design. Harmless on sandbox money; the day Stripe goes live it is a written promise nobody keeps. Soften the wording or actually issue it. Blocks ix-stripeaudit.

---

## Full text, captured 2026-08-06

🔴 WE TELL A CUSTOMER IN WRITING THAT MONEY IS COMING BACK, AND NOTHING SENDS IT. app/api/webhooks/stripe/route.ts:630 emails a NON-US buyer saying their payment is being refunded. refunds.create appears ZERO times in the codebase, by design: cancelling a subscription stops future billing, it does not return the payment just captured. Harmless on sandbox money. The day Stripe goes live, a non-US buyer who slips past the checkout guard is charged, cancelled, told a refund is coming, and nothing issues it unless Rob acts on the operator alert. FIX IS ONE OF TWO: soften the wording, or actually call refunds.create. ⚠ THIS IS SPECIFICALLY THE NON-US PATH, not the duplicate path, which only alerts the operator to decide. Carried unresolved from Max’s 08-03 handoff, deferred during the 08-05 deploy, and it is now LIVE. Blocks ix-stripeaudit.
