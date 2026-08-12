# `ix-typesregen`

**Owner:** Terminal · **State:** To do · **Section:** Iurix

> Captured 2026-08-12, when the board moved to a one-sentence-per-row schema. The board now
> carries the action only (`t`), with the problem, the fix and any blocker in `p` / `x` / `n`.
> Everything below is the record: the full text as it stood, verbatim, losing nothing.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-12

Debt created 2026-08-07 by 3745d49 and recorded the same day rather than discovered later. types/supabase.ts was NOT regenerated after migration 0024, so quiz_sessions is reached through two narrow named casts in lib/training/assessment.ts with the regeneration command sitting in the comment. Staging has 0024 and the CLI is linked to staging, so this is a one-command fix. Regenerate, drop both casts, confirm tsc stays clean. ⚠ While regenerating, check whether the PRE-EXISTING quiz_questions cast in app/api/quiz/attempt/route.ts (the ‘isn't in generated types yet’ comment that survived the rewrite) also becomes unnecessary; if so remove it in the same commit. Do this BEFORE the cutover deploy so the code that ships is the cast-free version. ✅ DONE 2026-08-07 in 10de458, committed and PUSHED. Types regenerated, casts gone, tsc clean. 🔴 Stays open only until deployed.
