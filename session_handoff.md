# Session Handoff

**Date:** 2026-08-24 (wrapped just after midnight on the 25th)
**Who:** Max, with terminal-Claude — **and a second Claude session (Desktop) working the same
files in parallel.** Both sets of commits are on `main`.

> ⚠️ **Rob: nothing from 2026-08-24 has been deployed.** The live site still serves the old
> framing, the old footer disclaimer, and `[ATTORNEY TO COMPLETE]` on both legal pages. All of
> the work below exists in `main` only. **Deploying is step one.**

---

## 🟢 Two things shipped to `main` today

### 1. Rule 5.3 is no longer the product thesis

**Katy's correction, and she is adamant — a correction, not a preference.**

The product is the **firm's own written AI use policy**, personalized per firm. The training
exists to keep staff aligned to that policy; the quiz, attestations and certificates are the
evidence. **Rule 5.3 is outdated background context**, at most a supporting citation. It is not
the headline and not why anyone buys this.

It had been the framing since the earliest planning sessions, never revisited, and had spread
from `CLAUDE.md` into every planning doc, the marketing copy, the transactional emails and the
certificate face. All of that is corrected. `CLAUDE.md` and `.planning/PROJECT.md` now carry an
explicit block telling future sessions not to reintroduce it.

**The one place it deliberately stays:** the ToS §3/§11 disclaimers. Naming the rule *in order
to disclaim it* is protective.

### 2. Terms and Privacy are published

Both pages had been shipping `[ATTORNEY TO COMPLETE]` placeholders **while customers accepted
them at checkout**. They now carry Katy's reviewed drafts. No bracket note survives into either
page. Terms §16 (Dispute Resolution) was an empty drafting note and was **deleted** rather than
shipped empty or filled with inherited arbitration — everything after it is renumbered.
Governing law is **North Carolina** (Max confirmed).

`CURRENT_TERMS_VERSION` → `v1-published-2026-08-24`. Old `v1-draft-2026-08-18` acceptances are
left alone on purpose: those people agreed to the placeholder text.

---

## 🔴 Three things that need a human, not code

**1. Katy — the training content still teaches the old framing.**
`.planning/FRAMING-CORRECTION-2026-08-24.md` lists it line by line: `lib/training/lessons.ts`
Lesson 1, `lib/training/questions.ts` stem `l1q2`, and question text in migrations `0003` and
`0026`. This is authored curriculum, so it was flagged rather than rewritten. The `0026` pool
changes need a **new migration** — do not edit an applied one.

**2. Katy — three drafting questions left open rather than invented.**
Cancellation notice period (published Terms have none), refund procedure (currently just an
email address), and operational-log retention (Privacy §5 still says "a rolling short-term
basis"). None were guessed.

**3. Katy — the footer disclaimer lost two clauses.**
Her rewrite deletes *"does not provide legal advice"* and *"do not constitute bar accreditation
or a guarantee of compliance"*. The old code comment called the second one load-bearing against
the brand name. Her call, made knowingly; the disclaiming now lives in Terms §2 and §11. Do not
restore either clause without her.

---

## Notes for whoever picks this up

- **PROD certificate count is 0.** Verified live before changing the certificate text
  (`certificates` 0, `quiz_attempts` 0, `enrollments` 0, `firms` 1). Nothing to reissue.
- **The DPA has never been drafted** — not in any branch, in this repo's whole history. It is
  now removed from both checkout acceptance checkboxes and `/dpa` is `notFound()`-guarded in
  production. The guard comment lists every link to restore when it exists.
- **The AI Use Policy is drafted** (`.planning/legal/ai-use-policy.md`) but has no route, so its
  references were removed from Terms §17 and Privacy §3. Publish it and they come back.
- **The Accessibility Statement was not shipped** — not linked, claims untested.
- Two Claude sessions worked these files in parallel today. Nothing was undone; the second
  session's `/dpa` removal resolved a risk the first had flagged, by the other route.

Full detail: **`.planning/sessions/20260824-max-summary.md`**.

---

## Next steps

1. **`pnpm run deploy`**, then verify on the deployed URL: `/terms`, `/privacy`, the footer
   disclaimer, `/dpa` 404ing in prod, both checkout acceptance sentences, the share-card title.
2. Katy: training-content revision (item 1 above), then Rob ships `0026` as a new migration.
3. Katy: the three open drafting questions.
4. Re-run `tsc --noEmit` — it was clean at `2dc654a` but has not been run since the four commits
   that landed on top.
