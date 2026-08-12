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

---

## Board text as of 2026-08-12

> The board text moved on after the capture above. Recorded here verbatim before the row was
> reduced to a single imperative sentence.

⚠ RESCOPED 2026-08-07 — half of this is already stale and half got WORSE this morning. ✅ The price-ID half is DONE: ix-lookupkey merged and CLAUDE.md:150 now reads ‘No longer hardcoded’. 🔴 STILL WRONG: CLAUDE.md:42 says Postgres 15; both projects run 17.6.1. 🔴 NEW AND MORE SERIOUS: §6 (Custom React quiz) now describes the PRE-3745d49 architecture, i.e. the exact hole we closed this morning, written up as if it were the design. It needs quiz_sessions, /api/quiz/start, the server-chosen question set, and the fact that the denominator is the served set. ⚠ Note §6's line about a ‘fresh randomised question subset each time’ is TRUE NOW and was effectively inert before, since pool size still equals attempt size until ix-questionpool lands. This file is what every fresh session reads as ground truth, which is why it is in the batch rather than parked. ✅ DONE 2026-08-07 in 10de458, committed and PUSHED. Postgres now reads 17.6.1 with a note that it was never 15 for these projects, and §6 is rewritten off the post-3745d49 architecture with the old text quoted as what it was: a description of the hole, not a design.
