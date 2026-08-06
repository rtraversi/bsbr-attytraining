# `ix-claudemd`

**Owner:** Terminal · **State:** To do · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **546 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

CLAUDE.md has drifted in two places: it says Postgres 15 (both projects run 17.6.1) and it says the price ID is hardcoded at checkout/route.ts:17, which stops being true when ix-lookupkey merges. Minor alone, but CLAUDE.md is what every fresh session reads as ground truth.

---

## Full text, captured 2026-08-06

CLAUDE.md HAS DRIFTED FROM REALITY IN TWO PLACES, both found 2026-08-05. (1) It says Postgres 15; both Supabase projects actually run 17.6.1. (2) It says the price ID is hardcoded at app/api/checkout/route.ts:17, which was true until the stripe-lookup-key branch and stops being true the moment that merges (see ix-lookupkey). Minor on their own, but CLAUDE.md is what every fresh session reads as ground truth, so wrong lines there propagate into decisions. Same class of problem as 0007’s comment claiming an invariant the code did not enforce.
