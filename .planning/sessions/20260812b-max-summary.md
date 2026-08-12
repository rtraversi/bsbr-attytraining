# Session summary — 2026-08-12 (desktop, Max + desktop-Claude)

Companion to `20260812-max-summary.md` (terminal's). Three sessions ran in parallel today:
desktop planned and verified, terminal restructured the board, Codex wrote the quiz code.

## The finding that drove the day

Four board rows were reported stale. They were not. Each already recorded its fix, but the board
clipped at `EXPAND_AT=170`, so the only text a scan ever saw was the original bug report, with the
correction thousands of characters below the fold. `ix-quizforge` displayed "AN ENROLLED EMPLOYEE
CAN SELF-CERTIFY IN ONE REQUEST… NOT FIXED" while "✅✅ FIXED in `3745d49`" sat ~3,000 chars down.

The first report of those rows as stale was itself made off a 400-char truncation. So the board's
shape produced the same error twice in one hour, once in a person and once in a model. That is what
motivated the restructure.

Fixed in `b51d015` by prepending truthful leads sized to survive the clip, plus one hard error:
`ix-quizforge` claimed the fix was NOT PUSHED. `3745d49` and `10de458` are both on `origin/main`.

## Cutover runbook, and a correction to my own work

`29053ca` added `0025` to the runbook. It also offered an escape hatch: if the cutover runs first,
push `0024` alone, since stratification is a no-op while pool == attempt size.

`2dd1488` removed that. The reasoning holds for `quiz_questions.lesson` and fails for
`courses.questions_per_attempt`, which `lib/training/assessment.ts:301` reads on every quiz start.
A PROD without `0025` fails at Phase 4 step 5 exactly as hard as a PROD without `0024`.

## Judging the GPT plan for ix-quizsubset

A plan written on a phone was reviewed against the repo. Structurally strong, and its blueprint was
lifted from a real project doc rather than invented. Three defects:

1. **Fail-closed would have killed certification.** Blueprint wants L2=2, L4=1; the bank holds L2=1,
   L4=**0**. `/api/quiz/start` would have refused 100% of attempts, on the only graded thing in the
   product. The plan explicitly forbade degrading.
2. **Its classification did not exist.** No lesson column in any migration; `section_tag` holds eight
   `PLACEHOLDER:topic` strings. Its own stop-condition would have fired at step 2.
3. **It was not `ix-quizsubset`.** It put attempt size out of scope, which is the part the board
   tracks.

Reshaped into the brief Codex executed: add the classification first, make the selector inert while
`pool <= attemptSize`, fold in the configurable attempt size. The no-op rule replaced fail-closed and
needs no policy debate, because at pool 8 every learner already sees all five lessons.

## Verification of both agents

Neither report was taken at face value; both held.

| Claim | Result |
|---|---|
| `0025` on staging only | `0025\|0025\|0025`; CLI linked to `ndmzvtuywcufvkxtkjhg` |
| Backfill 1/1/4/0/2 | Matches `QUESTION-POOL.md:53-158` |
| No-op rule real | `assessment.ts:116` |
| `tsc` / eslint / tests | exit 0 · 0 errors, 4 warnings · **11 files / 118** |
| 68 old row texts preserved | **68 of 68 verbatim** vs `git show 29053ca` |
| Amend incident recovered | `c69b046` + `2dd1488` on `origin/main`, linear, no force-push |

One self-inflicted false alarm: `npx vitest` showed 3 failures. That was bypassing the
`dotenv -e .env.local` wrapper, not a real failure.

Codex added one thing unprompted and it was right: largest-remainder blueprint scaling
(`assessment.ts:74-83`), because a hardcoded 1/2/2/1/2 is wrong at any attempt size but 8.

## Decisions

- **Fail-closed rejected deliberately.** Recorded on the board so nobody restores it.
- **Keep the `<meta charset="utf-8">`** terminal added. Curly quotes are mandatory now.
- **`ix-quizsubset` TODAY flag cleared**, status stays `wip`. Fixed is not shipped.
- **Corrections belong at the FRONT of a row**, never appended. The restructure makes this
  structural rather than a convention to remember.

## Next

The cutover, unchanged and still the only critical item. `0024` **and** `0025`, then the ordered
steps in `ix-prodcutover`. Rob still owns `ix-dnszoho`, which post-cutover means no invites and no
certificates. Katy's `ix-questionpool` should start with **lesson 4**, which has zero questions.
