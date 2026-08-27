# Session Handoff

**Date:** 2026-08-27 (second session)
**Who:** Max, with terminal-Claude

> 🔴 **Deploy status is only ever answered by the workflow list**, never by commits or timestamps:
> ```bash
> gh run list --workflow=deploy.yml --limit 15 \
>   --json event,conclusion,createdAt,headSha,displayTitle
> ```
> A `push` run is a **preview**. Only an `event: workflow_dispatch` run whose "Deploy to production"
> step succeeded actually shipped. **Nothing has shipped since 2026-08-24 19:34:58Z.** See
> `.planning/STATE.md` §1.

---

## What happened today

**The seat cap's failure mode was inverted, the post-payment path got a walkthrough, and the
Invitations card was emptied into two dialogs.**

```
main
 └── policy-intake   6be0bee  tell an unknown seat count apart from a seat count of zero
                     3bab062  walk the buyer from payment to a submitted intake
                     074d414  move the Invitations explanations into dialogs
                     ef38348  size the Invitations controls to the row track
                     820432f  docs(intake-spec): read your intake back from Settings  ← other session
```

⚠️ **`820432f` came from a parallel Claude session**, not this one — a spec addition only, no code.

All pushed. `tsc` 0, `eslint` 0 errors (4 pre-existing `no-img-element` warnings), `next build`
clean, **197 tests across 15 files** (was 195).

🔴 **Run the suite as `npx dotenv -e .env.local -- vitest run`** (what `pnpm test` wraps). Bare
`npx vitest run` fails five files on missing env and looks like a regression.

---

## Read these three first

**1. `seatsPurchased()` used to answer `0` for "the read failed" AND for "they bought none", and
both callers read `0` as "no cap".** The one condition under which the cap could not check a roster
was the one condition under which it waved everything through — a firm could roster unlimited staff,
submit, and promote past its seat count.

It now returns `number | null`, and the two callers **deliberately disagree** about `null`: the
roster screen stays permissive (nobody gets a dead form because a query was slow), and
`POST /api/intake/submit` **refuses with 503** because it is what writes the auth users and the
`firm_members` rows. The refusal has its own message — not the over-seats copy, which would tell a
firm inside its seats to go and spend money it did not need to.

**A known `0` is now a real cap.** That case used to be invisible.

**2. The attorney checkbox's real defect was not that it was ugly — unchecked was an answer, and it
was the expensive one.** Not ticking it spent a seat, on a firm capped at the seats it bought. The
replacement dialog **preselects nothing** and keeps Send disabled until the firm says. It also has
room to say the half the checkbox could not: an attorney uses no seat **and is issued no
certificate**.

**3. The Invitations card is now a fixed ~140px budget.** It scrolled permanently at rest because
three `py-3` controls plus `gap-2` came to ~148px. Now ~116px. **Anything added back comes out of
the same budget** — that is why both explanations live in dialogs and not on the card. The
line-height is pinned (`text-[13px]/[18px]`) because an arbitrary Tailwind font size sets only
font-size and the `normal` that fills in differs between an `<input>` and a `<button>`.

---

## Status

| Thing | State |
|---|---|
| `policy-intake` | 4 commits this session, **pushed**, in sync |
| Tests / `tsc` / `eslint` / `next build` | all clean — 197 tests, 15 files |
| Deployed? | ❌ **No `workflow_dispatch` since 2026-08-24** |
| Any of today's UI in a browser | ❌ **never rendered** |
| 0028 + 0029 on PROD | ❌ staging only |
| `Intake-uploads` bucket on PROD | ❌ does not exist |
| Rise 360 content | still not authored |

---

## Next steps

1. 🔴 **`0028` and `0029` onto PROD, and create `Intake-uploads` there.** Still the real blocker:
   the code reaches production through CI, the database it lands on does not. Capital I,
   case-sensitive, unrenameable, and no migration can create it. **Relink the CLI to staging in the
   same session.**
2. **Merge `policy-intake` to `main`, then run a production `workflow_dispatch`.** Pushing to `main`
   builds a preview only.
3. **Open all of today in a browser.** Four surfaces have never rendered: the intake introduction,
   the invite dialog, the CSV dialog, and the resized Invitations card. The card fit has only been
   measured on paper, and it is the whole point of `ef38348`.
4. **Decide the two known nav-pill AA failures** with Rob.
5. **`.planning/STATE.md` §3 and §5 are stale.**

---

## Open questions

1. 🔴 **`/api/invite/bulk` still discards the `name`.** The new CSV dialog tells firms how to write
   the name column; the route creates the auth user from the email alone and never writes
   `user_metadata.full_name`, and cert generation falls back to the email address. A certificate can
   still be made out to `paralegal@firm.com`. The copy stops short of promising the name reaches the
   certificate, but the gap is real — it is the batch-4 obligation in `intake-spec.md` under "The
   roster wins on names".
2. **Was deleting `out-of-seats-notice.tsx` right?** Its text moved onto the staff option in the
   invite dialog, which is better placement, but it was a component Max had made specific calls on
   ("deliberately NOT styled as a warning at rest"). One revert away.
3. **Nothing sends invites from the intake roster.** Promote creates `firm_members` rows as
   `invited` and deliberately sends nothing.
4. **The purge does not exist**, and the Settings read-back spec'd in `820432f` is defined as being
   available *until* the purge — so it now has a second thing depending on it.
5. **`firms.onboarding_dismissed` (0008) is read by nothing** since the checklist was deleted. Left
   in place on purpose; a column drop is a migration against two databases for no benefit.
6. **Katy still owes:** `lib/intake/questions.ts`, the 50-question bank, Privacy §2/§5.

**Full detail:** `.planning/sessions/20260827b-max-summary.md`.
