# Session summary — 2026-08-06 (Max, with desktop-Claude, terminal-Claude and Codex)

**Four contributors, one git identity.** Every commit today is authored "Max Lugo". Attribution
below comes from **commit trailers** (Claude sessions add `Co-Authored-By: Claude Opus 5`; Codex does
not) and from timing against what each session was doing. Where that evidence is thin, this file says
so rather than guessing.

**Extended at wrap-up.** Parts 1–4 are the original morning record (terminal-Claude, `c23192b`) and
are unchanged in substance — the findings in Part 2 and Part 3 live nowhere else in the repo. Parts
5 onward cover the rest of the day.

**The operational state is `session_handoff.md`.** This file is the reasoning.

---

## The day, attributed

| Time | Commits | Who | What |
|---|---|---|---|
| 08:00–08:53 | `d92e75e`, `a88879c`, `6c78f5c` | Claude session (brief-archive ritual — desktop) | Retired 76 completed brief items to an archive, moved item history into per-item files, started tracking the board's own source |
| 09:00–09:02 | `3fe0ca4`, `f471415` | Claude session with Max | `ix-mig0023` — avatars-bucket removal rerouted through the Storage API |
| 09:26 | `c23192b` | terminal-Claude with Max | `ix-refundnonus` — Part 1 below |
| 10:46–11:59 | `dbb52ab`, `b297db6`, `5034401`, `825be00` | **Codex** | `ix-lookupkey` merged and deployed; handoff written |
| 12:32–12:46 | `061d099`, `4e513de` | Claude session | Board closed out for Tier 0; Tier 1 execution plan added |
| 12:51 | `09f21b3` | **terminal-Claude** | cert-worker `SUPABASE_URL` → PROD, not deployed |
| 12:53 | `6036dd0` | **Codex** | Read-only cutover verifier |
| 13:33–14:41 | `3fefbf5`, `8296855`, `242762f`, `0ad925c` | **desktop-Claude** | PROD webhook prep recorded; dev-sandbox rule; board wrap |

Max's own work today was almost entirely **outside the repo** and is the largest single piece of it:
the whole Supabase dashboard side of the cutover, plus the Cloudflare redirect rule that closed
`ix-www522`. None of it produces a commit, which is exactly why it is written down here.

---

## Part 1 · What `c23192b` changed, and why *(terminal-Claude, morning)*

`emails/checkout-non-us.tsx` told a buyer whose subscription had just been cancelled that *"your
payment is being refunded"*, and the paragraph below added *"Refunds usually take a few business days
to appear."*

Neither was true. **`refunds.create` appears zero times in this codebase, by design** — cancelling a
subscription stops future billing; it does not return the payment just captured. Whether to refund is
Rob's call, made by hand in Stripe. So the email made a written promise about someone's money that
nothing in the system kept.

Harmless while Stripe is in sandbox. Not harmless the day it isn't.

The email now states what is true — the subscription is cancelled, the payment has not been returned
yet — and gives the one action that actually moves it: write to `info@iurixaccreditation.com`.

**That instruction is its own paragraph, placed first, carrying the address itself.** The first draft
put it as a prefix on the existing paragraph, which produced *"Email us to arrange a refund…"* above a
`mailto:` link that only appeared a sentence later — an instruction to write in pointing at an address
the reader had not reached. For someone who has just been charged, the refund is the only thing on the
page needing an action from them, so it goes first and is self-contained.

The `!cancelled` branch was left alone. It already said *"please get in touch so we can stop the
subscription and refund you"*, which was correct.

### The operator alert had the same defect one line further down

`app/api/webhooks/stripe/route.ts:630` told Rob the customer *"has been told in writing that their
payment is being refunded"* and to honour that promise. With the promise gone, it now states the
outstanding work instead.

**Line 631 — the failed-cancel branch of the same ternary — made the same claim** (*"The customer has
been told their payment is being returned"*) and was reworded too. It was outside the literal ask;
leaving it would have left the alert contradicting the email directly above it in the same function.

---

## Part 2 · 🔴 The identical defect is still live on the duplicate-purchase path

**Still not fixed at wrap-up. Re-checked today: both lines are present.**

| | |
|---|---|
| `emails/checkout-email-in-use.tsx:75` | *"we've cancelled the subscription, and your payment is being refunded"* |
| `app/api/webhooks/stripe/route.ts:670` | *"the customer has been told in writing that their payment is being refunded"* |

This is the **`email_in_use`** case — someone who is already staff at another active firm buys again.
It fires for a returning domestic customer, which is a likelier path to real money than the non-US one
fixed in `c23192b`, since `/api/checkout` performs no identity check (`BACKLOG.md` #1, still open) and
cannot stop them before Stripe charges.

`OPEN-ISSUES.md` 6b describes 6b as *"the non-US path specifically, not the duplicate path"*. That
reading was right about which email said what, but the duplicate path says the same thing — it was
just never read. **The fix is the same shape as `c23192b` and takes minutes.**

---

## Part 3 · The email templates cannot be tested today, and the reason is not obvious

There is **no test anywhere covering `emails/`**. The suites are `rls-isolation`, `refund-eligibility`,
`progress-skipcascade`, `resend-recipients`, `stripe-price` and now `verify-cutover` — none of them
imports a template. So there was nothing to run for a copy change.

The reason no such test exists is a toolchain trap worth writing down:

> **Vitest 4 cannot transform any `.tsx` in this repo.** It uses **oxc**, which honours `tsconfig`'s
> `jsx: "preserve"` (correct and required for Next.js) and fails on every `.tsx` import with
> *"Failed to parse source for import analysis… make sure to not set jsx to preserve."*

Three things that do **not** work, each tried:

- `esbuild: { jsx: 'automatic' }` in the vitest config — Vitest warns *"Both esbuild and oxc options
  were set. oxc options will be used and esbuild options will be ignored"* and fails identically.
- Bundling with esbuild directly — **no esbuild binary and no resolvable `esbuild` module** under
  pnpm's strict layout. Vite vendors its own copy.
- A vitest config outside the repo — cannot resolve `vitest/config`, so it must live in the project.

**What works is one line: `oxc: { jsx: 'automatic' }`.** That is how both branches of the email were
rendered through `@react-email/render` and asserted against, via a throwaway config + test deleted
afterwards. **Adding that line to `vitest.config.ts` is the whole cost of being able to test email copy
at all** — worth doing before anyone edits a template that states something about money again, which is
exactly the class of bug `c23192b` fixed.

---

## Part 4 · Cosmetic, deliberately left

In the cancelled email `info@iurixaccreditation.com` now renders **twice in consecutive paragraphs**.
Every rewrite that removed the repetition made something worse: *"write to us at the same address"*
collides with *"if this address is wrong"* two words earlier, which is the **billing** address. Left
as-is — each paragraph is self-contained, and a repeated support address in transactional email is
normal. Noted so the next reader knows it was a decision, not an oversight.

---

## Part 5 · Tier 0 closed *(Codex, with Max)*

Four items, and the two without commits are the ones worth re-verifying rather than trusting:

- **`ix-mig0023`** (`3fe0ca4`) — migration `0023` is an intentional no-op; the destructive removal
  moved to `scripts/remove-avatars-bucket.mjs` and ran against staging. PROD never had the bucket.
- **`ix-refundnonus`** (`c23192b`) — Part 1.
- **`ix-lookupkey`** (`dbb52ab`) — deployed by Actions run `31122263372`. Re-checked at wrap-up with
  `gh run view`: `conclusion: success`.
- **`ix-www522`** — a Cloudflare Redirect Rule Max added by hand. No commit exists, so the only proof
  is a live request. Re-checked at wrap-up: `www…/pricing?redirect-check=1` → **301** → apex with the
  query preserved; apex `/login` → **200**.

`dbb52ab` is still the deployed application commit. Everything after it today is documentation, one
config change and the verifier.

---

## Part 6 · Tier 1 — Max's dashboard work, which is most of it

Recorded in `.planning/PROD-CUTOVER.md` by desktop-Claude in `3fefbf5`.

Max enabled **Database Webhooks** on IURIX PROD — the project had no `supabase_functions` schema and
no `pg_net`, so the two triggers could not have existed — then recreated both from staging's
definitions, set the Auth Site URL and `/auth/callback` allowlist, and **rotated the shared secret** to
a fresh PROD-only value in both webhook headers. PROD now shows **4** non-internal `public`-schema
triggers, matching staging on table and event.

Two things that will otherwise waste an afternoon:

**PROD's webhook triggers are named with a capital C.** Staging's are lowercase. The trigger name is a
label: nothing in the codebase references it, and the webhook fires on table + event with behaviour set
by the configured URL and headers. Verified harmless and left alone rather than spending another
dashboard pass on cosmetics. A future schema comparison **will** report it as a difference. It is not
one.

**A `pg_trigger` comparison must filter `n.nspname = 'public'`.** Unfiltered, it also returns
Supabase's own storage and realtime triggers — **9 rows, not 4**. That is precisely how the trigger
count in `PROD-CUTOVER.md`'s own table gets misread, and the misreading looks like a failed cutover.

---

## Part 7 · The cert-worker change, and why it is a commit with no deploy *(terminal-Claude)*

`09f21b3` changes one line: `workers/cert-worker/wrangler.toml`'s `SUPABASE_URL`, staging → PROD. The
comment above it had read `# fill in before first deploy` since before the worker's first deploy.

**It was deliberately not deployed, and that is the substance of the commit rather than the line.**
`SUPABASE_URL` sits in `[vars]`, so it only takes effect on `wrangler deploy`. Shipping it while the
app still runs on staging would point the `*/5` queue drain and the 09:00 daily crons at a database
nothing else is using — and **nothing would error**, because both projects carry an identical schema.
Silence would be the only symptom.

The full ordered `wrangler secret put` sequence for both Workers went **into the commit message**, not
into a planning file, so it cannot drift from the change it belongs to. It records the inventory step
first (`wrangler secret list`, because the plan says not to guess at secret names), which Worker takes
which secret, and the `--config wrangler.toml` flag — without which `wrangler deploy` walks up, finds
the root `wrangler.jsonc`, and redeploys the main app instead. That has happened before.

One thing written into that message that the plan does not state: **there is an unavoidable mismatch
window.** Between setting a PROD service-role key on the cert-worker and deploying its PROD
`SUPABASE_URL`, the worker holds a PROD key aimed at the staging URL and its crons will 401. That is
loud, transient and correct — strictly better than the reverse, which writes valid rows to the wrong
database. Keep the window short rather than trying to design it away.

---

## Part 8 · The dev-sandbox reversal *(desktop-Claude, `8296855` + `0ad925c`)*

`.planning/PROD-CUTOVER.md` originally said to point `.env.local` at PROD so local dev "represents
production." **Following that would have left zero safe environments**, and the reasoning for
reversing it is the strongest single argument in the document:

- The live site writes to PROD after the cutover. There is no "staging site" and there never was —
  one Worker, one domain, pointed at whichever project the last deployment was built with.
- **Preview URLs are not an escape.** `deploy.yml` builds preview and production from the same
  `secrets.NEXT_PUBLIC_SUPABASE_*`, so previews point at PROD too once those move.
- `.env.local` was the last one.

That directly contradicts the reason clean-PROD was chosen at all: stale test data destroys the daily
reconciliation report's credibility on the day of the first real sale — the same trap the 17 staging
test firms represent. Testing against PROD rebuilds it within a week, and cleanup is painful:
`RESTRICT` foreign keys force `training_events` → `firms` → `auth.users`, in that order.

So `.env.local` keeps **staging**, and a gitignored `.env.prod` holds PROD and must be **named
explicitly**. Naming the file is the safety mechanism; targeting production should be a deliberate act.
`.gitignore` now covers `.env*` with a `!.env.example` exception rather than listing `.env.local` by
name — which would have allowed `.env.prod`, holding the **PROD service-role key**, to be committed.

The original rationale does not survive the fact that both projects carry an **identical schema**:
staging already represents production structurally, and the only difference is the data, which is
exactly what should differ.

Verified at wrap-up: `.env.local` → `ndmzvtuywcufvkxtkjhg`, `.env.prod` → `ttqthtzdjacrhjtrcmmy`, zero
tracked `.env` files, and `pnpm test` is `dotenv -e .env.local -- vitest run` so the suite — including
`rls-isolation`, which seeds and tears down real rows — runs against staging.

> A third file, `.env.production` (51 bytes, `NEXT_PUBLIC_APP_URL=` and nothing else), exists and is
> not mentioned in `DEV-SANDBOX.md`. Gitignored, no credentials, but Next.js loads it during production
> builds. Someone should decide whether it stays.

`.planning/ENVIRONMENTS-EXPLAINED.md` (`8296855`, trimmed in `242762f`) says the same thing for Rob and
Katy without the implementation detail, including the explicit note that the cutover does **not** enable
real payments.

---

## Part 9 · The verifier *(Codex, `6036dd0`)*

`scripts/verify-cutover.mjs` + `scripts/verify-cutover-helpers.mjs` + `tests/verify-cutover.test.ts`.
Read-only: it checks the live browser bundle's inlined project ref, that `/api/certs/generate` returns
**401** to a deliberately wrong `x-webhook-secret` (never attempting a valid one), `/api/health`, and
direct PROD reachability.

The design decision worth keeping: it distinguishes **INCONCLUSIVE** from **FAIL** in the output *and*
in the exit code — `1` means something failed, `2` means nothing failed but something could not be
observed. An earlier ad-hoc grep for the project ref found neither ref and proved nothing; reporting
that as a pass is the exact failure mode this whole cutover is prone to. Absence of evidence is never
a pass.

---

## Part 10 · Three findings added to the board, and two corrections to them

`0ad925c` added `ix-quizsubset`, `ix-questionpool` (reframed) and `ix-prodseed`. Verifying them for the
handoff turned up two things.

**`ix-questionpool`'s reframing is right and is the more useful half.** The 8 questions are not junk —
`PLACEHOLDER` is in `section_tag`, not the question text — they are real Rule 5.3 items across 8
distinct topics. The problem is size: 80% threshold, pool of 8, all shown, unlimited retakes. Fail
once and you have seen the entire exam. That is memorisation, not assessment, on the only graded thing
in the product.

**🔴 `ix-quizsubset`'s central claim is false.** It says *"THERE IS NO RANDOM SUBSET SELECTION ANYWHERE
IN THE CODE."* There is — `app/dashboard/training/page.tsx:198`,
`shuffleArray(allQuestions).slice(0, QUESTIONS_PER_ATTEMPT)`, with the constant at `:16` and the
shuffle at `:18`, running in the async Server Component so unselected questions never reach the client.

The item's conclusions survive for better reasons than the one given, and one of them inverts:

- The size is a **hardcoded constant**, not config. `courses` has no `questions_per_attempt` column —
  that part was right.
- Pool (8) **equals** attempt size (8), so the slice selects nothing today; it only randomises order.
  Grow the pool to 32 and that line **starts working immediately** — the opposite of the board's
  prediction that everyone would see all 32.
- Nothing records **which** questions an attempt served. `quiz_attempts` has `answers jsonb` and no
  question-set column, so a score cannot be audited against the exam that produced it.

**🔴 And a worse one, found while checking that.** `app/api/quiz/attempt/route.ts` grades whatever the
client submits: `:96` takes the question IDs from the request, `:105` fetches only those, `:125`
computes `correct / questions.length`. The denominator is the number of **submitted** questions.
Validation at `:51` and `:63` rejects only an empty array. **A POST carrying one question the caller
knows the answer to scores 100 and issues a real certificate.** It is authenticated and seat-gated at
`:74`, so this is an enrolled employee self-certifying — precisely the failure a Rule 5.3 supervision
product exists to prevent.

Not fixed; this was a wrap-up session. It belongs with `ix-quizsubset` as one piece of work: the server
must choose the set, store it on the attempt, and grade against the stored set. Doing the subset work
without this leaves the hole open, and the board text needs correcting first — through the archive
ritual, not a drive-by edit.

**`ix-prodseed`** — Phase 4's proof needs a firm on PROD, and PROD has none: the `courses` row and the
seeded questions and nothing else. A firm only exists via Stripe checkout → the provisioning webhook,
so the proof needs a sandbox purchase against PROD first, then password set, then invite, then quiz.
Longer than the plan implies, and the cleanup question must be answered **before** the window.

---

## Status

| | |
|---|---|
| commits | 18 today across four contributors; `0ad925c` before this wrap |
| deployed | `dbb52ab` only, via Actions `31122263372`. **Nothing deployed after it, deliberately.** |
| `tsc --noEmit` | pass, exit 0 |
| `eslint .` | pass — 0 errors, 4 pre-existing `no-img-element` warnings |
| `pnpm test` | pass — 6 files, 51 tests |
| tree / `origin/main` | clean and in sync |
| Tier 1 | Supabase side **done**; code side **committed, not deployed**; blocked on Rob's two Actions secrets |

## Next

`session_handoff.md` is the operational state, and its top section — the rule that no production
deploy may happen between Rob's secrets moving and the Workers' secrets moving — is the one thing that
must be read before anything else. Beyond that: resolve `ix-prodseed` before opening the window,
correct the `ix-quizsubset` board text, and plan the quiz work as a single piece including the grading
hole above.
