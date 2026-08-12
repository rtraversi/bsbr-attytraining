# `ix-questionpool`

**Owner:** Katy · **State:** To do · **Section:** Iurix

> Captured 2026-08-12, when the board moved to a one-sentence-per-row schema. The board now
> carries the action only (`t`), with the problem, the fix and any blocker in `p` / `x` / `n`.
> Everything below is the record: the full text as it stood, verbatim, losing nothing.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-12

🔴 KATY. Re-examined against the live DB 2026-08-06 and the framing was wrong in a useful way. The 8 questions are NOT junk: PLACEHOLDER lives in section_tag, not the text. They are real, well-formed Rule 5.3 items covering 8 distinct topics. So the ask is REVIEW AND EXPAND, not write from scratch. 🔴 THE REAL PROBLEM IS THE SIZE, and it is worse than variety: pass_threshold is 80%, the pool is 8, and the page fetches ALL active questions with unlimited retakes. Every candidate sees the identical 8, needs 7 right, and can fail, learn which they missed, and retake. That is memorisation, not assessment, on the only graded thing in the product. CLAUDE.md says retakes should draw a fresh randomised subset — impossible when pool equals attempt size. 24-32 is what makes randomisation start working. See ix-quizsubset: the pool alone does not fix it. ✅ KATY IS NOW UNBLOCKED — Codex built the drafting workspace 2026-08-07 in ef16e29: .planning/QUESTION-POOL.md, mapping the existing 8 against the five SCORM lessons and setting a target of 30 (six per lesson). The gap is quantified: 22 NEW QUESTIONS, and it is very uneven — lesson 3 needs 2, lesson 4 needs SIX because it has zero reusable today, lessons 1 and 2 need 5 each. The file changes nothing live; it is a workspace. 🔴 A SECOND PIECE OF WORK FELL OUT OF IT, not yet on anyone's list: the doc proposes a STRATIFIED blueprint (1/2/2/1/2 per lesson) so every attempt covers all five lessons. The code does not do that — lib/training/assessment.ts selects uniformly at random across the whole pool, so at 30 questions an attempt could miss a lesson entirely. Stratified selection is a CODE change on top of the pool, and it belongs with ix-quizsubset. ⚠ Note the doc calls the existing 8 ‘good starting material, not presumed launch-ready’, which is slightly more conservative than this row's earlier reframing. Both hold: the PLACEHOLDER tag is in section_tag rather than the question text, and they still need Katy's review.
