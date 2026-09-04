# Session Handoff

**Date:** 2026-09-02
**Who:** Max, with terminal-Claude and Codex
**Written for:** someone who has never seen this repository

---

## 🔴 Added 2026-09-03 (Max, desktop) — policy review in progress

Max and desktop worked the policy document section by section against Katy's source.
**Sections 1 to 5 are settled and approved; Section 6 is mid-discussion.** Every approved
sentence is recorded in **`.planning/POLICY-REVIEW-2026-09-03.md`** with the reasoning and
Max's own instruction quoted. **None of it is built** — the approved text still has to be
written into `lib/policy/blocks/` by terminal.

Katy's definitive intake list of 2026-09-02, which is the sole authority behind retiring 22
intake questions, existed nowhere in the repo and was cited only in two code comments. It is
now saved verbatim at **`.planning/KATY-INTAKE-LIST-2026-09-02.md`** with a gap analysis
against what is built.

**The one defect from that pass is RESOLVED (2026-09-04) and was misdiagnosed.** Katy's core
no-training rule was missing from the rendered policy, and 09-03 blamed the condition evaluator.
The real cause was the `maximal` fixture setting `tool_grid` without `ai_tools`, which `isAnswered`
derives the grid's rows from. A real firm could never reach that state. One line in
`lib/policy/fixtures.ts`; the renderer now shows 55 verbatim clauses instead of 54.

---

## What this is

**IURIX** — a self-serve platform where a small law firm pays once a year and
gets a **written AI use policy personalised to that firm**. The policy is the
product. The staff training exists to hold people to it; the quiz, the
attestations and the certificates are the evidence they are.

> ⚠️ **ABA Model Rule 5.3 is NOT the thesis.** Katy corrected this on 2026-08-24
> and it is a correction, not a preference. The rule is background context and at
> most a fine-print citation. Do not reintroduce it as the pitch. The one
> deliberate exception is the legal disclaimers in `.planning/legal/terms-of-service.md`
> §3 and §11, which name it in order to disclaim it.

Stack: Next.js 15.5 App Router on **Cloudflare Workers** (via `@opennextjs/cloudflare`),
Supabase (auth + Postgres + storage), Stripe, Resend. Never add
`export const runtime = 'edge'` anywhere.

---

## 🔴 Read these five before you touch anything

### 1. Deploy status is answered by ONE command, and nothing else

```bash
gh run list --workflow=deploy.yml --limit 15 \
  --json event,conclusion,createdAt,headSha,displayTitle
```

A run with `"event": "push"` is a **preview**. It ships nothing. Only a
`workflow_dispatch` whose "Deploy to production" step succeeded actually went
live:

```bash
gh workflow run deploy.yml --ref main -f target=production
```

**Nothing has reached production since 2026-08-24T19:34:58Z.** Do not infer
otherwise from commit dates, branch names or a green checkmark — every one of
those has misled a previous session.

### 2. Staging and production are different databases, and production is behind

| | Project ref | State |
|---|---|---|
| **STAGING** | `ndmzvtuywcufvkxtkjhg` | migrations current; 21 test firms; **this is what `.env.local` points at** |
| **PRODUCTION** | `ttqthtzdjacrhjtrcmmy` | **missing `0028`–`0032`**; 0 firms |

**Production cannot run the policy intake today.** It is missing the schema
(`0028`–`0032`) *and* the **`Intake-uploads`** storage bucket — capital I,
case-sensitive, cannot be renamed, and **no migration can create it** (it is a
Storage dashboard action). Code reaches production through CI; the database it
lands on does not follow automatically.

Before any migration work:

```bash
npx supabase link --project-ref ndmzvtuywcufvkxtkjhg   # staging
```

The CLI sat pointed at **production** for six days once already. Whatever you
link it to, **relink it to staging in the same session**.

### 3. Standing traps that have each cost someone a day

- **`enrollments` has no `created_at`.** The column is **`enrolled_at`**. A
  comment in `0007` claimed otherwise for weeks.
- **Never run `wrangler deploy` from inside `workers/cert-worker/`.** Without
  `--config wrangler.toml` wrangler walks up, finds the root `wrangler.jsonc`,
  and **redeploys the main app over itself while reporting success.**
- **The cert-worker does not generate certificates.** Its `fetch` handler is a
  stub that returns 200 and does nothing (`src/index.ts`, `// TODO`). The live
  path is the Supabase webhook `Cert-queue-generate` → the app's
  `/api/certs/generate`. Its **cron** handler is real and load-bearing (queue
  drain, expiry reminders) — the inertness is the HTTP handler only.
- **A stored certificate PDF is never re-rendered.** Changing `lib/cert-pdf.ts`
  affects only certificates issued afterwards. To see a new design you need a
  **new employee** — the `already_exists` short-circuit plus the unique
  constraint on `enrollment_id` mean re-running training regenerates nothing.
- **A worker secret silently overrides a `vars` entry**, and `NEXT_PUBLIC_*` is
  **inlined into the client bundle at build time** from `.env.local` /
  `.env.production`. Changing it in `wrangler.jsonc` alone does nothing to
  already-built assets and presents as a caching bug.
- **`??` does not fire on an empty string.** Firms are now created with
  `name: ''`, so every `firm?.name ?? 'fallback'` in the codebase renders blank
  rather than its fallback. Deliberately left alone (a name is now always
  captured), but it is why `deliver-policy.mjs` needed fixing today.

### 4. 🔴 Max writes all user-facing copy

Do not write, improve, soften or "clarify" any string a customer reads. Propose
it and let him write it. Copy already in the tree marked as his is verbatim and
is not yours to edit.

### 5. 🔴 Spaced em dashes are never acceptable in shipped text

Not in prompts, help text, option labels, buttons, emails, legal pages or
anything built at render time. Use a colon or a comma. **Code comments may keep
them.**

Note that a grep of source literals is **not** sufficient: `formatAnswer` in
`lib/intake/review.ts` was *building* em dashes at render time, invisible to
search, and they were only caught in a screenshot. There is now a test that
sweeps every prompt, help string and option label.

---

## Where the code is right now

`main` carries everything below. **None of it is deployed.**

```
main
 └── intake-firm-name-and-copy   MERGED today (9 commits)
 └── em-dash-purge  5ea8687      NOT merged — Codex's, see below
```

| | |
|---|---|
| `pnpm test` | **530 passed, 25 files** |
| `npx tsc --noEmit` | exit 0 |
| `pnpm lint` | 0 errors, 4 warnings (pre-existing `no-img-element`) |

### What landed today

- **The firm name is captured at `/onboarding`, required**, and a **middleware
  gate** holds any signed-in admin whose `firms.name` is blank at
  `/onboarding/firm-name`. The Stripe webhook writes `''` instead of the literal
  `'My Firm'` it used to show every real buyer for the whole intake.
- **The pre-filled name now counts as an answer** — it was a display-only prop,
  so Send refused until the firm retyped it.
- **`foreign_languages` is a 95-entry picker** with an "Other" write-in, not free
  text.
- **The intake copy is Max's rewrite** — new h1, shorter intro, ten of eighteen
  help strings deleted.
- **The review page** numbers 1..N matching the intake, has exits (it had none),
  and lost a paragraph that claimed an attorney is notified when answers change.
  **Nothing notifies anyone.**

Full reasoning: **`.planning/sessions/20260902-max-summary.md`**. Read it before
touching the intake.

### ⚠️ The gate is one field, not the intake

Katy killed the hard intake gate on 2026-08-26 — *"People will want to explore
without having to fill it all in."* Today's gate demands **one field** and the
firm explores freely once it is answered. **Do not widen it.** And it must stay
in middleware: a shared layout does not re-render on soft navigation, which is
how the earlier gate was got wrong.

---

## The other branch — `em-dash-purge`, Codex's, do not merge

`5ea8687`. 21 files, 85 user-facing em dashes removed across `app/_components`,
`app/pricing`, `app/terms`, `app/privacy` and `emails`. It touches **nothing**
under `app/intake` or `lib/intake`.

**Codex rebases it onto the new `main` and merges it.** Its worktree at
`.worktrees/em-dash-purge` can stay — `.gitignore`, `vitest.config.ts` and
`eslint.config.mjs` now exclude worktrees, because both tools were walking into
it and reporting two branches' results added together.

One defect handed back to Codex, not fixed here:
`app/_components/exposure-section.tsx:158` renders a double space.

---

## Unfinished, with enough to pick up cold

### Blocked on Katy

1. **Nine policy clauses need real prose.** `lib/policy/blocks/` has 51 verbatim
   and 18 TODO. Of the 18: **nine need new writing** (source lines 268, 276, 278,
   312, 316, 318, 320, 330, 342 in `AI-Policy-Research-2026-08-20.md`), **five are
   structural** (bare headings whose sub-bullets are already transcribed), **three
   are intake questions not clauses**, and one is a deliberate hold. The most
   important is **342** — *"Professional level of data protection: API, Claude
   Enterpirse, ..[finish this list]"*. §5, §9 and §10 all turn on that term.
2. **`lib/policy/vendor-block.ts` is unreviewed and is on `main`.** It is the only
   *generated* rather than transcribed text in `lib/policy`. For the 15 vendors
   whose terms are unclear it bars client-confidential information from the
   platform's AI features until the firm holds written no-training confirmation.
   That follows from Katy's rule but **is a reading of it, not her words.** Fine
   only while nothing deploys. Known problems: about half of it is action items
   (which D2 says is a separate deliverable), "written confirmation" is not the
   term §22 will define (her rule says *express agreement*), and the DPA is
   bundled into the training sentence though a DPA is not a no-training agreement.
3. **D3's count of nine missing intake questions is wrong — there are about
   fifteen.** Cross-referencing Katy's Section 0 and Modules A–W against the built
   question keys turns up: practice areas (Section 0 Q3), research verification
   step (B Q2), onboarding process (G Q1), attestation cadence (G Q3), vendor
   diligence beyond no-training (G-Q6), who approves a new tool (G-Q8), who trains
   staff and how often (G-Q9), local-vs-cloud storage (H Q5), TAR methodology (L
   Q2), notetaker states (M Q3), citation-verification step (O Q1), engagement
   letter (P Q2), malpractice AI exclusions (R Q2), employee handbook (S Q1),
   client "safe question" examples (T Q3). **Reconcile before taking anything to
   her.**
4. **Privacy §2 and §5 have no category covering intake answers**, and now also
   owe the **three-day retention rule** (Max, 2026-09-01: a lapsed subscription
   keeps answers for three days, then they are permanently removed). Open since
   the intake's first batch.

### Blocked on infrastructure

5. **Resend returns `403 The iurixaccreditation.com domain is not verified.`** All
   four DNS records are present and correct — someone with Resend dashboard access
   has to click verify, possibly in **Max's** account. **Money is live**, so a firm
   can pay tonight, invite staff, and no invite email is ever delivered.
6. **`0028`–`0032` are not on production, and `Intake-uploads` does not exist
   there.** See trap #2. This is the real blocker on shipping the intake.
7. **The delivery email is locked twice.** Resend's 403 is one. The other, and the
   important one, is `POLICY_EMAIL_COPY_APPROVED = false` in
   `lib/policy/delivery-email.ts:41`, pinned by a test. Without it, the day
   someone fixes DNS every delivery would email firms a message reading
   `[TODO(copy) — headline]`. **Copy is Max's to write, and it has to land before
   or with the DNS fix, never after.** The intake intro now promises *"We email
   you when it is ready"* to every buyer.

### Code, open

8. **`/api/invite/bulk` discards the name** (`route.ts:91` —
   `createUser({ email, email_confirm: true })`, no `user_metadata`). Staff
   invited from the dashboard get a certificate made out to their email address.
   Does **not** affect the intake roster, which goes through `promote` and does
   stamp the name.
9. **The translations clause does not name the languages.** `p19-translations` in
   `lib/policy/blocks/s09-drafting.ts` is verbatim and does not interpolate
   `foreign_languages`. The new control collects them cleanly — including "Other"
   and multiple selections, tested through `assemble()` — but no clause reads them
   yet.
10. **The roster line reads ambiguously for a short name.** `1, x@y.com, Attorney`
    — the comma separator (from today's em-dash purge) makes a one-character name
    indistinguishable from the question numeral beside it. Needs a better
    separator. **This is not a lost name** — see #12.
11. **Two known AA contrast failures on the nav pill**, accepted by Max with the
    numbers in front of him: white on `#0094FF` is 3.14:1, and `#0094FF` on
    `#EAF6FF` is 2.86:1. Do not "fix" by moving the brand token. The compliant
    near-miss is a deeper ground on that pill only.

### 📌 Do NOT re-hunt these two

12. **The roster names were never lost.** A review row reading
    `1, dev0902b@example.com, Attorney` is Max having typed `1` through `10` as
    the names himself. They are intact in `intake_answers` and were stamped onto
    `auth.users` by `promote`. Nothing to recover.
13. **The marketing nav links on `/pricing` are not dead.** Reported, could not be
    reproduced — all three resolve and scroll. Almost certainly a dev-server
    rebuild mid-save.

---

## How to work here

- **Verification is `pnpm run deploy` or a real browser**, not `pnpm dev` alone.
  Max runs `pnpm` / `stripe` / CLI commands himself; git add/commit/push are the
  agent's — **but only after Max's explicit go-ahead.**
- **Sessions run in parallel.** Another agent may commit and push to the same
  branch mid-task. Re-check `HEAD` before any amend or reset, stage explicit
  paths, never force-push.
- **Two scripts refuse to run against production**, by parsing the project ref out
  of the environment actually loaded: `scripts/dev-auth.mjs` and
  `scripts/dev-seed-firm.mjs`. There is no `--force`. Keep it that way.
- **`dev-seed-firm.mjs` passes a real firm name**, which is exactly why the
  `'My Firm'` placeholder went unseen for weeks. A fixture that fills in what
  production leaves empty hides that class of bug every time.
- **Run the suite as `pnpm test`.** Bare `npx vitest run` fails five suites on
  missing env and looks like a regression.
- At session start: `git pull`, read this file, then read **every** file in
  `.planning/sessions/` oldest first. Rob and Max work on different machines and
  may each be unaware of the other's work.
