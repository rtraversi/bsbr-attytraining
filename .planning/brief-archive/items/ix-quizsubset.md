# `ix-quizsubset`

**Owner:** Terminal · **State:** In progress · **Section:** Iurix

> Captured 2026-08-12, when the board moved to a one-sentence-per-row schema. The board now
> carries the action only (`t`), with the problem, the fix and any blocker in `p` / `x` / `n`.
> Everything below is the record: the full text as it stood, verbatim, losing nothing.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-12

⚠ CORRECTED 2026-08-06 — THE ORIGINAL CLAIM ON THIS BOARD WAS FALSE. Random subset selection DOES exist: app/dashboard/training/page.tsx:198, shuffleArray(allQuestions).slice(0, QUESTIONS_PER_ATTEMPT), in the server component. Desktop asserted ‘no randomisation anywhere in the code’ after reading only the question fetch and the scoring route, never line 198, and put it on the board and in a commit message. Terminal caught it. THE CONCLUSION INVERTS: the slice already works, so growing the pool to 24-32 makes it START selecting properly, rather than showing everyone all 32 as this item previously predicted. WHAT ACTUALLY REMAINS: QUESTIONS_PER_ATTEMPT is hardcoded at 8 rather than config, and nothing records WHICH questions an attempt served — an audit gap, and the missing half of the fix for ix-quizforge. ✅ THE AUDIT HALF IS DONE 2026-08-07 in 3745d49: quiz_attempts.question_ids now records which questions an attempt served, so a score can be audited against the exam that produced it. Committed, NOT deployed. ⚠ WHAT REMAINS AND IS NOT DONE: QUESTIONS_PER_ATTEMPT is still a hardcoded constant (now in lib/training/assessment.ts, not page.tsx) rather than config on courses. That only starts to matter when ix-questionpool grows the pool past 8.

---

## 2026-08-12 — code-complete in `adb43f5` (Codex). Not deployed.

Both remaining halves landed together, plus a third nobody had assigned.

**Migration `0025_quiz_lesson_classification.sql`**, applied to **staging only**
(`migration list --linked` reaches `0025` on local, remote and time; PROD untouched).
It adds **two** columns, which matters more than it sounds:

- `quiz_questions.lesson` smallint, `check (lesson between 1 and 5)`, nullable so new
  questions may stay unclassified until content review.
- `courses.questions_per_attempt` smallint not null default 8. **This is the one that
  bites.** `lib/training/assessment.ts:301` selects it on every quiz start, so a PROD
  missing `0025` fails at Phase 4 step 5 exactly as hard as a PROD missing `0024`,
  even though stratification itself would be a no-op there.

Backfill verified **L1=1, L2=1, L3=4, L4=0, L5=2**, matching
`.planning/QUESTION-POOL.md:53-158` keyed on `section_tag`. Lesson 4's zero is real and
deliberate, not a backfill miss.

**The selector is inert until it can help.** `lib/training/assessment.ts:116`:
`if (uniquePool.length <= attemptSize)` serves the whole pool shuffled and does not
stratify. This was a deliberate reversal of the planning draft, which specified
fail-closed. Fail-closed against today's bank would have **broken certification for
every learner on day one**: the blueprint wants L2=2 and L4=1 while the bank holds
L2=1 and L4=0, so `/api/quiz/start` would have refused 100% of attempts on the only
graded thing in the product. Pool 8 == attempt 8 means every learner already sees every
question, so there is nothing to protect and everything to lose. Stratification switches
itself on when `ix-questionpool` grows the pool past the attempt size.

**Unrequested and kept:** `assessment.ts:74-83` scales the 1/2/2/1/2 blueprint by
largest-remainder for any attempt size other than 8. Correct call. Once attempt size is
configurable, a hardcoded blueprint is wrong at every other value.

Shortfall behaviour when a lesson cannot meet quota: fill from lessons that can, and
record that it happened rather than pretend coverage was met (`assessment.ts:136`).

**Verified independently by desktop, not taken from the report:** `tsc --noEmit` exit 0;
`eslint .` 0 errors / 4 pre-existing `no-img-element` warnings; `pnpm test` **11 files /
118 tests passing** against staging (`.env.local` → `ndmzvtuywcufvkxtkjhg`), up from
10 / 111. App deploy still `2026-08-06T17:18Z`.

🔴 **Stays open until deployed.** Fixed is not shipped. It rides the cutover with `0024`,
`0025` and the rest of the 08-07 batch. TODAY flag cleared, since no action remains on it.
