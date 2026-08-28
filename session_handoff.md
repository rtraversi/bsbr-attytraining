# Session Handoff

**Date:** 2026-08-28
**Who:** Max, with terminal-Claude

> 🔴 **Deploy status is only ever answered by the workflow list**, never by commits or timestamps:
> ```bash
> gh run list --workflow=deploy.yml --limit 15 \
>   --json event,conclusion,createdAt,headSha,displayTitle
> ```
> A `push` run is a **preview**. Only an `event: workflow_dispatch` run whose "Deploy to production"
> step succeeded actually shipped. **Nothing has shipped since 2026-08-24T19:34:58Z.**

---

## What happened today

**The intake grew from 29 questions to 50, the tab strip learned to degrade, and a submitted intake
stopped being a dead end.** Six commits on `policy-intake`.

```
main
 └── policy-intake   cd2eb46  build the eight modules that were never implemented   ← pushed
                     1c3f7a6  degrade the section strip by width, not truncation    ← pushed
                     d3b7f05  seed a complete firm on staging, no Stripe or email   ← pushed
                     d188162  drop the tier column from the tool grid               ← NOT pushed
                     c0a4c0e  the roster attorney answer becomes a toggle           ← NOT pushed
                     44cc711  a submitted intake stays editable until delivery      ← NOT pushed
```

`tsc` 0 · `eslint` 0 errors / 4 pre-existing warnings · `next build` clean · **262 tests across 16
files** (was 197/15 this morning).

🔴 **Run the suite as `npx dotenv -e .env.local -- vitest run`.** Bare `npx vitest run` fails five
files on missing env and looks like a regression.

**Full detail:** `.planning/sessions/20260828-max-summary.md`.

---

## Read these four first

**1. A number in yesterday's notes was wrong, and trusting it would have deleted the desktop tab
strip.** "~4 characters at twelve sections" came from multiplying 6.1px per character. Stack Sans at
11px runs nearer 5.2, and the measured widths are Firm 23 … Marketing 52. The labels genuinely *fit*
at 1280 and 768; the break was only at 390. **Measure the face; do not multiply characters.**

**2. Katy's "10–15 questions after gating" target is unreachable, and already was.** A firm that
skips every optional module answers **29** required questions — 19 of them from the set as it stood
before today. Every module contributes at least one always-visible gate and Section 0 alone is five.
Getting to 15 means cutting the *existing* core, which is her call.

**3. Migration `0030` exists for the RECORD, not the reopening.** Flipping a submitted intake back
to open needed no schema. The columns are there because **Katy may already be drafting**, and
answers changing under her silently is worse than not allowing the edit at all. `reopened_count` is
what her export reads.

**4. The 0028 partial unique index is now load-bearing for a second reason.** It is UNIQUE on
`(firm_id) WHERE status = 'in_progress'`, and reopening moves a row **into** that state — so it is
what stops a reopen making two open sessions racing into promote. The reopen route relies on it
rather than pre-checking, and treats `23505` as "this firm already has an open intake".

---

## 🔴 Three commits were pushed by something that was not this session

The instruction all day was **do not push**, and this session did not. But
`git reflog show origin/policy-intake` records an `update by push` moving the remote to `d3b7f05`.
So the first three of today's commits are on `origin/policy-intake` and the last three are not.

Nothing was force-pushed, nothing was lost, the history is linear. Same parallel-session pattern as
2026-08-12 and 2026-08-27. Worth knowing before anyone reasons about what the remote contains.

---

## Status

| Thing | State |
|---|---|
| `policy-intake` | 6 commits today — **three pushed, three not** |
| Migration `0030` | Applied to **staging only**; types regenerated (3 columns added, 0 removed) |
| `0028` + `0029` + `0030` on PROD | ❌ **none of them** |
| `Intake-uploads` bucket on PROD | ❌ does not exist |
| Supabase CLI | linked to **staging** — left that way |
| Deployed? | ❌ no `workflow_dispatch` since 2026-08-24 |
| Today's UI in a real browser | ❌ driven headless only |
| Rise 360 content | still not authored |

---

## Next steps

1. 🔴 **`0028`, `0029` and `0030` onto PROD, in order, and create `Intake-uploads` there.**
   Unchanged and still the real blocker: the code reaches production through CI, the database it
   lands on does not. Capital I, case-sensitive, unrenameable, and no migration can create it.
   **Relink the CLI to staging in the same session.**
2. **Push the remaining three commits**, merge `policy-intake` to `main`, then run a production
   `workflow_dispatch`. A push to `main` builds a preview only.
3. **Use the intake as a real firm.** `scripts/dev-seed-firm.mjs` makes one on staging in seconds
   and prints a sign-in link — that is what it is for.
4. **Decide the two known nav-pill AA failures** with Rob (carried).
5. **`.planning/STATE.md` §3 and §5 are stale** (carried).

---

## Open questions

1. 🔴 **The 10–15 target** — cutting to it means cutting the existing core. Katy's call.
2. **The tab strip past twelve sections.** Compacting solved twelve; another four modules take the
   compact bars to ~10px. The levers are the gap and the minimum bar width in `intake-client.tsx`.
3. **Module W's one real question** — who may approve a new tool, and by what process — is unbuilt
   and belongs in Module A.
4. **`/api/invite/bulk` still discards the `name`** (carried). A certificate can still be made out
   to `paralegal@firm.com`.
5. **Nothing sends invites from the intake roster** (carried).
6. **The purge does not exist** (carried) — and the Settings read-back and the new `purged` state
   are both defined against it.
7. **Katy still owes:** `lib/intake/questions.ts` (the guessed module letters, the invented section
   grouping, and now the eight new modules' wording), the 50-question bank review, and Privacy
   §2/§5, which have no category covering intake answers.
