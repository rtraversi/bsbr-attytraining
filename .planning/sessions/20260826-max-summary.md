# Session summary — 2026-08-26 (Max, with terminal-Claude)

## Headline

**The policy intake was built end to end today, in five batches, on one branch.** Schema, question
set, branching engine, UI, routes, promote, and the surrounding flow changes.

Two things to carry past today, and both are reversals that happened *during* the session:

1. **Katy killed the hard gate at 12:11** — *"The problem is that the intake is time consuming.
   People will want to explore without having to fill it all in."* Batch 4 had just built it. Batch
   5 removed it. The dashboard now opens for everyone and the intake is a persistent, undismissible
   notice.
2. **Max reversed flag-never-block on the roster.** The old copy promised "we will sort the extra
   seats out with you afterwards" and **nobody owned "afterwards"** — no process, no queue, no
   person. The roster is now capped at the seats purchased.

The third thing worth knowing: **the buyer's path no longer touches email at all**, which is the
only reason any of this is testable right now. Resend has 403'd every send for a week
(`ix-dnszoho`).

---

## Branch

```
main
 └── policy-intake   fc8bce4  0028 — schema + firm_members.is_attorney
                     cd4b087  question set + branching engine
                     93e15be  intake screen + save/resume/upload/submit routes
                     3da83d5  password onboarding, promote, dashboard gate
                     51a3189  gate softened, roster capped, deliverability
```

**Not merged. Not deployed.** `tsc --noEmit` exits 0, `eslint .` is 0 errors / 4 warnings (all four
are the pre-existing `no-img-element` ones in `closing-cta.tsx`, `hero-section.tsx`,
`iurix-lockup.tsx` — untouched), `next build` clean, **192 tests passing across 14 files**.

⚠️ **2026-08-24's work is still undeployed** and is now two days old — Terms, Privacy, the framing
correction. The live site still serves the old framing and `[ATTORNEY TO COMPLETE]` on both legal
pages. That was step one yesterday and it still is.

---

## Migrations — STAGING ONLY

Both pushed to `ndmzvtuywcufvkxtkjhg` (staging). PROD (`ttqthtzdjacrhjtrcmmy`) untouched. Types
regenerated from staging after each.

**0028 — the intake schema.** `firm_members.is_attorney`; `intake_sessions` (partial unique index on
`(firm_id) where status = 'in_progress'` — a renewal legitimately runs the intake again, what must
never happen is two OPEN intakes racing into promote); `intake_answers`; `intake_uploads`; and
`intake_sensitive`, which has **RLS on and NO POLICY AT ALL**, deliberately. Only service-role
routes read it. There is a red-flagged comment in the migration telling future sessions not to add
one.

**0029 — email deliverability.** `firm_members.email_verified_at`, `email_verification_token`,
`email_verification_sent_at`. All nullable, no constraint: NULL means *not proven*, never *bad*.

🔴 **`auth.users.email_confirmed_at` is NOT this signal.** Every creation path — the Stripe webhook,
both invite routes, promote — passes `email_confirm: true`, so it is true for everybody and means
something else entirely. Reading it as deliverability would report 100% reachable for a roster that
is 100% unproven. There is a test that fails if anyone tries.

---

## What got built, batch by batch

### 1 — Schema (`fc8bce4`)

Above. `lib/seats.ts` and the `sync_used_seats` trigger from 0015 deliberately untouched.

### 2 — Question set + branching engine (`cd4b087`)

`lib/intake/{types,questions,branching}.ts`. All 26 questions plus the two sensitive ones, keyed as
the spec keys them. One `US_STATES` constant (50 + DC + 5 territories) shared by `jurisdictions` and
`hiring_states`, which append their own extras rather than forking the list.

The condition language is **data, not predicate functions**, so the tree can be diffed in review and
`pruneOrphans` can ask what an answer governs without executing anything.

Two things that are easy to get wrong and are pinned by tests:

- **`{key, not}` requires the key to be ANSWERED.** Without that half, an unanswered question
  satisfies every `not` vacuously and `case_mgmt_ai` appears before the firm has said which platform
  they use — asking whether the AI features of nothing are switched on.
- **`isComplete` counts VISIBLE required questions only.** A required question the firm can never
  see must not be able to block their submission.

Sections are contiguous in the question order and asserted so at module load, because the tab strip
renders progress per section.

### 3 — The screen (`93e15be`)

`app/intake/` + four routes under `app/api/intake/`. Built to
`.planning/intake-mockup/iurix-intake-mockup-light.html`, which Katy approved: one question per
screen, section tab strip, progress per section and **never** a running total, and nothing marked
required until Send — then only what is missing turns red and the form jumps to the first gap.

Also shipped here: `none_yet` on `ai_tools`. A firm that has just bought an AI policy *because* it
is about to start could not get past question 6 — the question was required and had no "none" while
three other multi-selects did.

Resume lands on `intake_sessions.current_question`, **not** `nextUnanswered()`. The two disagree on
an optional question the firm chose to skip, and sending them backwards reads as the form losing
their place.

### 4 — Onboarding, promote, gate (`3da83d5`)

**The buyer sets a password instead of getting a magic link.** They are signed in from the same
request and land on `/intake`.

🔴 **The email field CONFIRMS, it does not choose.** Read-only in the form and re-checked
server-side against the Stripe session. Not typo-politeness: the duplicate / `email_in_use` /
`provisioning_failures` machinery from 0018 and 0022 **all keys on the paying email**, so an
editable address would let a buyer who was refused simply type a different one and take the account
anyway.

**Promote** (`lib/intake/promote.ts`) — `firm_name` → `firms.name`, roster → auth users +
`firm_members`, non-attorney count → the seat count via `occupies_seat = !isAttorney` and the
existing 0015 trigger. `seats.max_seats` is **not** rewritten: it is what Stripe sold.

🔴 **Promote is not one transaction and cannot be** — auth users go through GoTrue's admin API and no
`BEGIN` encloses an HTTP call. Instead every step is idempotent and **the status flip happens
LAST**, so a half-finished promote leaves the intake open and pressing Send again completes it.

The name field came out of `update-password` in the same commit. `invite/bulk` accepts `{name, email}`
and **discards the name**; cert generation falls back to the raw email address. The roster is
authoritative now.

### 5 — The reversals (`51a3189`)

- **Gate removed** — query and redirect both out of middleware, replaced by one read in
  `app/dashboard/page.tsx` driving `IntakeNotice`. **Not dismissible**, because it is now the only
  thing that ever gets the intake completed.
- **Promote reconciles** — a firm can invite three people, explore, then roster five. Rows match on
  the resolved auth user id, so an existing member is updated in place. No invite-route guard was
  added; refusing to invite while exploring would contradict Katy directly.
- **Roster capped** at the seats purchased. Attorneys unlimited. Two buttons (*Add staff* / *Add
  attorney*) rather than one that silently refuses every other click. Enforced in the submit route
  too.
- **Deliverability notice** merging 0029's `email_verified_at` with 0016's `invite_email_failed`.
- **Pricing** bands say "non-attorney staff", and the seat-count-covers-every-non-attorney line is
  said **at purchase** — by the time somebody is typing names, the cap has already bitten.
- **`scripts/dev-auth.mjs`**.

---

## `scripts/dev-auth.mjs` — read this before using it

```
dotenv -e .env.local -- node scripts/dev-auth.mjs link <email> [--next /path]
dotenv -e .env.local -- node scripts/dev-auth.mjs password <email> <password>
dotenv -e .env.local -- node scripts/dev-auth.mjs users [--firm <name>]
dotenv -e .env.local -- node scripts/dev-auth.mjs verify-link <email>
```

**A script and not a dev-mode route because a route ships.** The `devLink` in the invite routes was
flagged for removal on 2026-06-18 and ran in production for two months handing out working magic
links in an API response.

🔴 **It refuses to run against anything but staging.** The project ref is parsed from the URL the
environment actually loaded — not passed as an argument, which would state an intention rather than
read the truth. No `--force`, no ref override. Verified by hand: pointed at `ttqthtzdjacrhjtrcmmy`
it exits 1 with a message naming production, before a single client is constructed.

---

## Status

| Thing | State |
|---|---|
| 0028 + 0029 | Applied to **staging only**. Not on PROD. |
| `policy-intake` branch | 5 commits, **not merged, not deployed** |
| Tests | 192 passing, 14 files |
| `tsc` / `eslint` / `next build` | clean |
| 2026-08-24's Terms + Privacy | **still undeployed, now 2 days old** |
| Rise 360 content | still not authored — Katy's revision outstanding |

---

## Next steps

1. **Deploy 2026-08-24's work.** Still step one, still not done.
2. **Look at the intake on staging.** `pnpm run deploy`, then `/intake` as a firm admin. Nothing in
   this branch has been seen in a browser — the whole thing was built to the mockup and verified by
   tests, `tsc` and `next build` only.
3. **Create the `Intake-uploads` bucket on PROD.** It exists on staging, capital I, case-sensitive,
   cannot be renamed. It is a Storage dashboard action — a migration cannot do it — and the intake
   cannot ship without it.
4. **Katy reads the question set.** `lib/intake/questions.ts` is the authored copy. Two things need
   her specifically: the module letters for `doc_review_scale` and `tar` (guessed K/K/L), and the
   section grouping, which was invented — the spec gives module letters, not sections.
5. **Decide on API-level gating.** See open questions.
6. **`emails/admin-magic-link.tsx` is now orphaned** — zero importers. Left in place; deleting it is
   a call to make alongside whatever happens to `ix-dnszoho`.

---

## Open questions

**1. `/api/*` is not gated, and never was.** The middleware matcher excludes it, so the (now removed)
gate covered where a firm *landed*, not what the dashboard's routes would answer. Moot for the
intake now that nothing is gated — but the same hole applies to any future gate, and the fix is a
per-route check, not a matcher change (adding `api/` would put a `getUser()` round-trip in front of
the Stripe webhook).

**2. The admin's own address can only be verified two ways.** They never pass through
`/update-password`, so `markVerifiedByActivation` never fires for them. While Resend 403s, every firm
admin sees their own name in the deliverability notice until an operator hands them a link with
`dev-auth.mjs verify-link`. Nuisance, not a brick — nothing is blocked — but it is the one row that
cannot self-clear.

**3. Nothing sends invites from the roster yet.** Promote creates the `firm_members` rows as
`invited` and deliberately sends nothing. The dashboard action that fires the bulk-invite path minus
the send does not exist.

**4. The purge does not exist.** 0028 has the columns and the backstop index; the route, the audit
row and the 30-day cron are unbuilt. Katy's export (`.docx`) is unbuilt too.

**5. Privacy §2 and §5 still have no category covering intake answers.** Flagged since batch 1. The
retention story this schema implements — wiped at delivery, 30-day backstop — is documented nowhere
customer-facing, and the copy is Katy's to approve.

**6. Two guesses in the question set** that only Katy can settle: the module letters above, and
whether `ai_tools` should have had a plain "none" as well as "none yet".
