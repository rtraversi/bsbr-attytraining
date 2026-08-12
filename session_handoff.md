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

2. **Uncommitted work is sitting in the tree and it is not from this session.** The tree was
   clean at session start. At the end there were modifications to `lib/training/assessment.ts`,
   `tests/quiz-session.test.ts` and `types/supabase.ts`, plus an **untracked**
   `supabase/migrations/0025_quiz_lesson_classification.sql`. None of it was touched or
   committed here; the commit was scoped to `.planning/brief-archive`. **Whose is it, and is it
   finished?** An untracked migration is the part worth looking at first — a migration that
   exists only on one machine is the kind of thing that gets discovered during a cutover.

---

## Next steps

1. Desktop republishes the brief artifact from `main`.
2. Resolve the stray `lib/` + migration `0025` changes above.
3. The cutover sequence itself is unchanged and still gated — see `ix-prodcutover` on the board
   for the ordered steps, and `.planning/PROD-CUTOVER.md` for the runbook.

## Open questions

- The `<meta charset="utf-8">` added to the brief file: keep or revert? It fixes reading the file
  directly (curly quotes are now mandatory in every string value, and without a charset the
  browser sniffs windows-1252). The artifact wrapper supplies UTF-8 regardless.
- New rows from here on should use the new schema and get an `items/<id>.md` written at the same
  time. Worth confirming Rob and desktop are both writing rows that way.
