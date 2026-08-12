# Session Handoff

**Date:** 2026-08-12
**Who:** Max, with terminal-Claude.

## Status in one paragraph

The weekly brief's data model was restructured so the board is scannable. Every row is now one
imperative sentence with the problem, fix and blocker in separate typed fields, and the full
pre-restructure text of all 68 rows is preserved verbatim in `.planning/brief-archive/items/`.
No app code was opened. Nothing was deployed. The cutover freeze is intact and untouched.
Commit `865cfff`, pushed to `main`.

---

## 🔴 The rule that is still not broken

Rob's two Actions secrets moved **2026-08-06 21:07Z**, so the cutover mismatch window is **OPEN**.

- **No `target: production` dispatch.** Not for an unrelated fix, not to test the pipeline.
- **No `pnpm run deploy`.**
- **Preview URLs are not a sandbox.** `deploy.yml` builds preview and production from the same
  `NEXT_PUBLIC_SUPABASE_*`, so previews point at PROD. `localhost:3000` (`.env.local` → staging
  `ndmzvtuywcufvkxtkjhg`) is the only safe place to click.
- Committing and pushing are fine.

Five items still sit **committed-not-deployed** from 2026-08-07 (`ix-quizforge`,
`ix-maybesingle`, `ix-lessoncounter`, `ix-cookiesecure`, `ix-typesregen`). They close on the
cutover deploy. Fixed is not shipped.

---

## What changed this session

**`.planning/brief-archive/weekly-brief.html`** — the board is now a data model, not a text blob.

| Field | Holds | Constraint |
|---|---|---|
| `t` | ONE imperative sentence — the action, nothing else | ≤ 90 chars |
| `p` | The problem | 1–2 sentences |
| `x` | The fix, or what done looks like | 1–2 sentences |
| `n` | Optional: blocker, decision, gotcha | — |

`id`, `s`, `o`, `f` unchanged. `h` still means "an archive file exists" — and now every row has
one. Collapsed board: **34,747 chars → 4,830**, 86% smaller.

**`.planning/brief-archive/items/`** — 41 new files, 7 appended. All 68 written and verified on
disk *before* any row was shortened. 118,795 characters; every row's old text is there verbatim.
This is what to read before touching the code for an item.

**Two rows were lying:** `ix-questionpool` and `ix-quizsubset` claimed `h:1` with no file. Fixed.

**Nothing was retired, deleted, or re-id-ed.** 68 rows in, 68 rows out, same ids.

---

## ⚠ Two things needing a decision

1. **The artifact has NOT been republished.** Desktop does that from the pushed file. Until it
   does, the live artifact still shows the old unreadable board — the work is on `main` but not
   yet in front of anyone.

2. **A second session was working this repo in parallel, and it has landed.** Mid-wrap-up,
   `adb43f5` (stratified question selection, migration `0025`) and `2dd1488` (cutover doc
   correction) appeared on `main` from Codex. What looked like stray uncommitted work in
   `lib/training/assessment.ts`, `tests/quiz-session.test.ts`, `types/supabase.ts` and an
   untracked `supabase/migrations/0025_...sql` was that session mid-flight; it is all committed
   now. Nothing here touched it. **The one thing to carry:** `2dd1488` establishes that
   **`0025` is not optional at cutover** — `courses.questions_per_attempt` is read by
   `assessment.ts:301` on every quiz start, so a PROD without `0025` fails exactly like a PROD
   without `0024`. The earlier "push 0024 alone and strike 0025" escape hatch is gone.

   That session is also still editing the board: `weekly-brief.html` and
   `items/ix-quizsubset.md` were modified in the working tree after this session's commit, in
   the new schema. Those edits are **deliberately left uncommitted here** — they are not mine to
   land.

---

## Next steps

1. Desktop republishes the brief artifact from `main` — but let the parallel session's board
   edits land first, or they will be lost on republish.
2. The cutover sequence is unchanged and still gated — see `ix-prodcutover` on the board for the
   ordered steps, and `.planning/PROD-CUTOVER.md` for the runbook. **Both `0024` and `0025` must
   reach PROD before the Phase 4 quiz step.**

## Open questions

- The `<meta charset="utf-8">` added to the brief file: keep or revert? It fixes reading the file
  directly (curly quotes are now mandatory in every string value, and without a charset the
  browser sniffs windows-1252). The artifact wrapper supplies UTF-8 regardless.
- New rows from here on should use the new schema and get an `items/<id>.md` written at the same
  time. Worth confirming Rob and desktop are both writing rows that way.

---

# Desktop addendum — 2026-08-12 (Max + desktop-Claude)

Written after the section above. **It corrects two things that section says**, both of which
were true when written and stopped being true minutes later. Three sessions ran in parallel
today (desktop, terminal, Codex), which is the root of every crossed wire below.

## ✅ Corrections to "Two things needing a decision"

1. **The artifact IS republished.** Twice, in fact: once at `865cfff` and again at `c69b046`,
   both to the same URL. The live board carries the new schema *and* today's row updates.
   https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075
2. **The board edits are committed.** They landed as `c69b046`. Nothing is sitting uncommitted.
   Terminal was right not to touch them; they were simply mid-flight at the moment it looked.

## What desktop did

| Commit | |
|---|---|
| `1665f8d` | `iq-n400` added: N-400 template, gated on Katy's OK before it is committed |
| `b51d015` | Four rows whose *collapsed* view still described a fixed bug |
| `29053ca` | Cutover runbook carries `0025` alongside `0024` |
| `2dd1488` | Correction: `0025` is NOT optional at cutover |
| `c69b046` | `ix-quizsubset` code-complete; `ix-questionpool` unstuck |

**The `b51d015` finding is worth keeping.** Four rows were reported stale, then found *not*
stale — each already recorded its fix. The board clipped at 170 chars, so the only text a scan
ever saw was the original bug report, with the correction thousands of characters below the
fold. `ix-quizforge` displayed "AN ENROLLED EMPLOYEE CAN SELF-CERTIFY" while "FIXED in
`3745d49`" sat far out of view. **A correction appended to the end of a row is invisible.**
That is what motivated the restructure terminal then built.

**`2dd1488` is the one to carry.** I wrote `29053ca` saying that if the cutover ran before
`0025`, you could push `0024` alone, because stratification is a no-op while pool == attempt.
That is true of `quiz_questions.lesson` and **false** of `courses.questions_per_attempt`, which
`lib/training/assessment.ts:301` reads on every quiz start. A PROD without `0025` dies exactly
like a PROD without `0024`. The escape hatch is gone.

## Verified independently, not taken from reports

Both agents' claims were checked rather than trusted, and both held:

- **Codex `adb43f5`:** `0025` on staging only (`0025|0025|0025`); backfill 1/1/4/0/2 matching
  `QUESTION-POOL.md:53-158`; the no-op rule real at `assessment.ts:116`. Reproduced `tsc` exit 0,
  eslint 0 errors / 4 pre-existing warnings, `pnpm test` **11 files / 118 passing** on staging.
- **Terminal `865cfff`:** 68 items, max `t` 86 chars, `h:1` on all, 0 straight quotes, every
  `items/<id>.md` present. **All 68 old row texts confirmed verbatim** against
  `git show 29053ca` — zero data loss, which was the whole safety rule.
- **The amend incident recovered cleanly.** `c69b046` and `2dd1488` are both on `origin/main`,
  history linear, no force-push, and every desktop edit is present at HEAD. Checked, not assumed.

## Decisions taken

- **Fail-closed selection was REJECTED, deliberately.** GPT's plan specified it. Against today's
  bank it would have refused 100% of quiz attempts on day one: the blueprint wants L2=2 and L4=1
  while the bank holds L2=1 and L4=0. The selector is a no-op until the pool exceeds the attempt
  size instead. Do not "fix" this back.
- **Keep the `<meta charset="utf-8">`.** Answering terminal's open question. Curly quotes are now
  mandatory in every string value, so the file cannot rely on the artifact wrapper when opened
  directly.
- **`ix-quizsubset` TODAY flag cleared**, code being done. Three cutover flags remain. Status
  stays `wip`: fixed is not shipped.

## Still true

Nothing deployed. App remains **2026-08-06T17:18Z**. The cutover carries `0024`, `0025` and the
whole 08-07 batch. The freeze is intact and was not touched by any of the three sessions.
