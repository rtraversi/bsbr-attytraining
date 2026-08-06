# `ix-winbackflow`

**Owner:** Max · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **853 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

📌 Same problem as ix-doublebill seen from the other end. Checkout deliberately lets a cancelled firm's owner through, and the webhook then fails on createUser because their auth account already exists. So the win-back path is not merely unbuilt, it is the exact path that charges a returning customer and gives them nothing. Order: ix-doublebill case B first, then the destination.

---

## Full text, captured 2026-08-06

📌 MONDAY, with ix-doublebill — they are the same problem seen from two ends. Max wanted a lapsed admin taken somewhere useful: “elapsed admin should be taken to the marketing page no? like the pricing one. or even billing with renewal. this part might need more work than i am thinking.” He was right that it is bigger. THE STRESS TEST FOUND WHY: checkout deliberately lets a cancelled firm's owner through (the active-firm guard does not fire on status=cancelled), and the webhook then fails on createUser because their auth account already exists. So the win-back path is not merely unbuilt — it is the precise path that charges a returning customer and gives them nothing. ORDER STILL HOLDS: ix-doublebill case B first, then the win-back destination. ix-billingpage softens it independently, since resuming auto-renewal never touches checkout at all
