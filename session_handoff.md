# Session Handoff

**Date:** 2026-08-26
**Who:** Max, with terminal-Claude

> 🔴 **CORRECTION, 2026-08-27: item 1 below was wrong.**
> **All of 2026-08-24 was already deployed when this was written.** Production was deployed six
> times on 08-24, the last from `2efec949` at 19:34:58Z with the workflow's own production smoke
> test passing (`gh run view 32768982427`). The live site was serving the new framing and the
> published Terms and Privacy the whole time, and `/dpa` correctly 404s in production because
> `app/dpa/page.tsx` calls `notFound()` there. The claim had been carried forward for two days.
> **Deploy status is only ever answered by `gh run list --workflow=deploy.yml`, checking for a
> `workflow_dispatch` run whose "Deploy to production" step succeeded.** See `.planning/STATE.md` §1.
>
> 🔴 **What actually blocks the intake, and was not in this list:** production runs on **IURIX PROD
> (`ttqthtzdjacrhjtrcmmy`)**, which is at migration **0025**. `0026`-`0029` and the
> `Intake-uploads` bucket exist on STAGING only. The code ships through CI; the database it lands
> on does not.
>
> ⚠️ **Genuinely unmerged:**
> 1. 2026-08-25's two UI branches (`ui-polish-batch-a` / `-b`).
> 2. Today's whole policy intake, on `policy-intake`.

---

## What happened today

**The policy intake was built end to end**, in five batches on one branch: schema, question set,
branching engine, UI, routes, promote, and the flow around it.

```
main
 └── policy-intake   fc8bce4  0028 — schema + firm_members.is_attorney
                     cd4b087  question set + branching engine
                     93e15be  intake screen + save/resume/upload/submit routes
                     3da83d5  password onboarding, promote, dashboard gate
                     51a3189  gate softened, roster capped, deliverability
```

`tsc --noEmit` clean. `eslint .` 0 errors (4 pre-existing `no-img-element` warnings, untouched
files). `next build` clean. **192 tests passing across 14 files.**

**Nothing in this branch has been seen in a browser.** It was built to Katy's approved mockup and
verified by tests, `tsc` and `next build` only.

---

## Two reversals landed mid-session — read these first

**Katy killed the hard gate at 12:11.** *"The problem is that the intake is time consuming. People
will want to explore without having to fill it all in."* Batch 4 built the gate; batch 5 removed it.
The dashboard opens for everyone and the intake is a **persistent, undismissible notice** — it has
to be undismissible, because nothing forces the intake now and it is the only thing that ever gets
it completed.

**Max reversed flag-never-block on the roster.** The old copy promised "we will sort the extra seats
out with you afterwards" and **nobody owned "afterwards"**. The roster is capped at the seats
purchased; attorneys are unlimited and never consume a seat. Known and accepted: a capped firm
cannot reach full accreditation until it buys the extra seat.

**And the buyer's path no longer touches email at all.** They set a password on `/onboarding` and are
signed straight into `/intake`. That is the only reason any of this is testable — Resend has 403'd
every send for a week (`ix-dnszoho`).

---

## Migrations — STAGING ONLY

Both on `ndmzvtuywcufvkxtkjhg`. **PROD (`ttqthtzdjacrhjtrcmmy`) untouched.** Types regenerated.

- **0028** — the intake schema. `intake_sensitive` has **RLS on and NO POLICY AT ALL**, deliberately;
  the migration carries a red-flagged comment telling future sessions not to add one.
- **0029** — email deliverability. 🔴 Do **not** reuse `auth.users.email_confirmed_at` for this: every
  creation path passes `email_confirm: true`, so it is true for everybody and means something else.

---

## Status

| Thing | State |
|---|---|
| 0028 + 0029 | staging only, not on PROD |
| `policy-intake` | 5 commits, not merged, not deployed |
| Tests / `tsc` / `eslint` / `next build` | all clean |
| 2026-08-24 Terms + Privacy | **still undeployed, 2 days old** |
| `Intake-uploads` bucket | staging only — **does not exist on PROD** |
| Rise 360 content | still not authored |

---

## Next steps

1. **Deploy 2026-08-24's work.** Still step one.
2. **`pnpm run deploy`, then look at `/intake`** as a firm admin. First browser look.
3. **Create the `Intake-uploads` bucket on PROD** — capital I, case-sensitive, cannot be renamed. A
   Storage dashboard action; a migration cannot do it, and the intake cannot ship without it.
4. **Katy reads `lib/intake/questions.ts`** — two things are guesses: the module letters for
   `doc_review_scale` / `tar` (K/K/L), and the section grouping, which was invented because the spec
   gives module letters and not sections.
5. Then: roster invites, the purge, and Katy's `.docx` export — all unbuilt.

---

## Open questions

1. **Nothing sends invites from the roster yet.** Promote creates `firm_members` rows as `invited`
   and deliberately sends nothing. The dashboard action is unbuilt.
2. **The purge does not exist.** 0028 has the columns and the backstop index; the route, the audit
   row and the 30-day cron do not.
3. **The admin's own address cannot self-clear** from the deliverability notice — they never pass
   through `/update-password`, so while Resend is down an operator has to hand them a link with
   `scripts/dev-auth.mjs verify-link`. Nuisance, not a brick.
4. **Privacy §2 and §5 still have no category covering intake answers.** Flagged since batch 1; the
   copy is Katy's to approve.
5. **`/api/*` was never covered by the (now removed) gate.** Moot today, relevant to any future one.

---

## New local tool

`scripts/dev-auth.mjs` — `link` / `password` / `users` / `verify-link`. Signs you in as anybody on
staging without email.

🔴 **It refuses to run against anything but staging.** The project ref is parsed from the URL the
environment actually loaded, not passed as an argument. No `--force`. Verified: pointed at PROD it
exits 1 before constructing a client.

**Full detail:** `.planning/sessions/20260826-max-summary.md`.
