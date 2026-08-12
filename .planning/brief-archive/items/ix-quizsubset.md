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
