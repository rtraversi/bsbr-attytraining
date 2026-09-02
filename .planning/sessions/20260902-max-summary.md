# Session summary — 2026-09-02 (Max, with terminal-Claude and Codex)

## Headline

**Three of the day's four real defects were invisible to anyone reading the code,
and all three were found by running the app.** A firm name that was a literal
placeholder in every real signup. A pre-filled name that looked answered and
silently refused to Send. Em dashes that no grep could find because they are
built at render time.

Terminal shipped eight commits on `intake-firm-name-and-copy`, merged to `main`.
Codex worked `em-dash-purge` in parallel and is **not** merged.

Nine items came out of Max's browser walk. Eight are done; the ninth turned out
not to be a bug at all.

---

## 1 · 🔴 The firm name was a placeholder in every real signup

`app/api/webhooks/stripe/route.ts` inserted `name: 'My Firm'` at `provisionFirm`,
and `promoteIntake` at **submit** was the only thing that ever corrected it. So a
paying customer spent the entire intake — every screen, and every email sent to
them in between — being told we were writing **"My Firm"'s AI policy**.

**It survived this long because the seed script hides it.** `dev-seed-firm.mjs`
takes the firm name as an argument, so every firm anyone had ever tested with
already had a real name. Nobody had run the actual purchase path and read the
screen.

### What replaced it

1. **The webhook writes `''`.** `firms.name` is `text not null` with **no CHECK
   in any migration** (verified across `0001`–`0032`), so an empty string is
   legal and this needed no schema change. Empty is the honest initial state; a
   human-looking placeholder is not.
2. **`/onboarding` asks for it, required**, beside the password. Trimmed and
   whitespace-rejected **server-side**, not only in the form.
3. **Middleware holds any signed-in admin whose `firms.name` is blank** at
   `/onboarding/firm-name`.

### 🔴 Why the gate is in middleware and must stay there

A shared layout **does not re-render on a soft navigation**. A gate written there
passes on the first request and is then silently absent for every client-side
link the user clicks afterwards. That is exactly how the 2026-08-26 gate was got
wrong. Middleware runs on every navigation.

### ⚠️ This is not a revival of the gate Katy killed

Katy killed the hard intake gate on 2026-08-26 12:11 — *"People will want to
explore without having to fill it all in."* That gate demanded a **submitted
31-question intake**. This demands **one field**, and the firm explores freely
the moment it is answered. **Do not widen it to any other condition.**

### Two decisions inside the gate worth keeping

- **It reuses the request's existing SSR client, not `createAdminClient()`.**
  RLS already scopes it (`0001`'s `firm_admin_own_firm` reads `app_metadata`), and
  `createAdminClient()` does **not** pass `realtime: { transport }` — the
  workaround sitting ten lines above it because `@supabase/realtime-js` throws on
  Cloudflare Workers. That was the June 2026 500-on-every-request bug, and it
  **would not reproduce under `next dev`** — only in workerd and production.
- **Employees are never gated.** The name is the admin's field; gating staff
  would trap them behind something they cannot fix.

**Exemptions** (each would loop or break the path to the name step):
`/onboarding`, `/api/`, `/auth/`, `/update-password`, `/forgot-password`,
`/login`, `/terms`, `/privacy`, `/cookies`.

**Verified on staging**, not asserted: named firm passes; blanked firm held on
every protected route with `?next=` preserved; `""`, `"   "`, `null` and a
missing field all **400** with nothing written; a padded name stored trimmed;
then the gate silent and the step itself redirecting away so the back button
cannot invite a blind overwrite.

---

## 2 · 🔴 The pre-filled name did not count as an answer

Max: *"it wouldnt let me send intake if i didnt re edit the firm name even if i
had already written it before intake this is a bug"*.

The name was handed to the client as `firmNamePrefill`, a **display-only prop**,
so the value was never in `answers`. `missingRequired()` reported `firm_name`
missing, Send refused, and the jump-to-first-gap dropped the firm on question one
— **which looked already filled**. The submit route reads the database, so it
refused too.

### The trap, and why both halves had to hold

Writing it as a real answer breaks a second thing. `untouched` — which decides
whether the first-run walkthrough renders — was `initialAnswers` being empty, so
seeding an answer would make **every brand-new session look visited** and the
walkthrough would never show again for anyone.

**The pairing that makes it safe:** `seedAutoAnswers` deliberately does **not**
call `touchSession`, so `current_question` stays NULL, while every real answer
goes through `POST /api/intake/answer`, which does. So `resumeAt === null`
reliably means the firm has saved nothing itself, and `untouched` can discount
`AUTO_SEEDED_KEYS` instead of demanding zero answers.

`AUTO_SEEDED_KEYS` lives in `lib/intake/types.ts`, **not** `session.ts`: a
`'use client'` component imports it, and `session.ts` statically imports the
service-role client.

**Verified:** the seed lands in `intake_answers`, `current_question` is null, the
walkthrough still renders, and `POST /api/intake/submit` with only the seed
returns **28 missing with `firm_name` not among them**.

> **The jump to the first gap already existed** (`intake-client.tsx:327`) and
> worked. What looked like a missing feature was this bug wearing a different
> coat. What was genuinely missing — and is now built — is the **section tabs
> turning red**, off the same `missing` set as the numeral.

---

## 3 · 🔴 The em dashes a grep cannot see

Max, off a screenshot: *"lots of em dashes on screenshot.... we need to
purgeeee"*.

The obvious half — 8 in `lib/intake/questions.ts` (5 option labels, 3 help
strings) — went in the first pass.

**The screenshot then showed em dashes still on the screen.** `formatAnswer` in
`lib/intake/review.ts` **builds** them at render time:

```
`${r.name} — ${r.email} — ${r.isAttorney ? 'Attorney' : 'Staff'}`
`${labels.get(r.tool) ?? r.tool} — ${AGREEMENT[...] ?? '—'}`
```

They exist as no literal beside a `prompt:` or `label:`, so **no grep of the
question set could ever have found them.** Only rendering the page did.

Now pinned by a test that also sweeps every prompt, help string and option label,
so the next one is caught before a screenshot is needed.

> ⚠️ **A stale dev-server compile made this look unfixed.** The source and unit
> tests were correct while `:3000` kept serving the old strings through several
> hard refreshes and a `touch`. If a change is provably right and the page
> disagrees, suspect the running server before the code.

---

## 4 · The copy pass

All copy is Max's, verbatim.

- **h1 is two states** — *"Let's write the policy"* until question one is
  answered, then *"Let's write {firm}'s policy"*. It sits above every section, so
  the name lands in real time.
- **The intro loses its h2** (it repeated the h1 on the same screen) and **loses
  step three entirely**.
- **Ten of eighteen help strings deleted.** The rule Max drew: keep a concrete
  example of what the question means; delete what reassures, editorialises, or
  explains why we are asking — *"who are u their mom? nah delete those kinds of
  descriptions."*

**Three kept against the rule, and they are what to argue with first:**

| Key | Why it stayed |
|---|---|
| `prior_ai_error`, `carrier_notified` | The confidentiality disclosure on the two **sensitive** questions. It is what makes a firm willing to admit a prior AI error, not reassurance. |
| `roster` | Deleted under the rule, then **restored** (Max: *"restore ok thats why i said only necessary ones"*). It is a formatting instruction that decides what is printed on a permanent certificate. |

**The step-1 count stays dynamic.** Max wrote "Around 30"; the computed figure is
**31**. Hardcoding would ship a number already wrong, that moves again the next
time Katy adds a module.

---

## 5 · The review page

Four things, all found by reading the screen.

1. **A paragraph said something false.** *"Send it again when you are done — the
   attorney is told it changed"*, in **both** branches. Nothing notifies anyone:
   `markDelivered` writes a row, and the only email is pinned behind
   `POLICY_EMAIL_COPY_APPROVED = false` on top of Resend's 403. Max: *"lies. in
   fact delete that whole paragraph."* **Do not reinstate any version of it until
   something actually sends.**
2. **The firm was stranded.** The screen contained **no `Link` and no `href` of
   any kind** — *"user is stuck on this page foreve.r again. never fixed."* Both
   states now offer the dashboard; delivered leads with `/dashboard/policy`.
   Placed **above** the answers: the list runs to 38 rows, and an exit at the
   bottom of that scroll is one a stranded firm never finds.
3. **The numbering disagreed with the intake.** `sectionPositionOf` counted
   within the section, so the review restarted at 1 in every section while the
   intake's big numeral counted 1..31. Now `globalPositionOf`. A sensitive
   question still consumes its number without rendering, so the sequence can skip
   — that gap is the intake's own numbering.
4. **Reopen moved** off a footnote row and onto the first section heading.

---

## 6 · The languages control

`foreign_languages` was `type: 'text'`, required, and its answer names the
languages in a policy clause — so free text put whatever someone typed into a
legal document. Max: *"best to have a list and not free text ... bc they can 100
just type, idk lol, like i am going to do rn."*

**95 entries**, ordered by US prevalence rather than alphabetically so the common
picks are visible before anyone types. ISO 639 codes as values — **they are
stored, so do not repurpose one** or a saved answer silently becomes a different
language. Hardcoded beside `US_STATES`: it ships to a Worker, it does not change,
and a dependency for 95 strings is not worth the bundle.

**"Other"** writes an `other:`-prefixed value into the **same array** as the
picked ones — the convention `ai_tools` already uses — so `optionLabel()` and the
policy assembler resolve it with no new code, and a clause naming the languages
reads one list rather than stitching two.

`StatesField` became **`FilterableMultiField`**, with `StatesField` and
`LanguagesField` as thin wrappers. The only differences were the option source
and two strings.

**One cleanup that fell out:** `states` and `languages` both keep their bulk list
in a constant and use `options` for **extras only**, so reading
`question.options` directly on either yields just the extras — every state
renders as a bare code, sorted after "Federal courts". That ternary was **already
written out three times** before this type existed. Now one
`optionsForQuestion()`.

Tested through `assemble()`, not just the formatter, because the point is the
document: single, multiple, Other-only and mixed all assemble, and neither a raw
code nor the `other:` prefix ever reaches the text.

---

## 7 · `deliver-policy.mjs` — a confirmation that had become a no-op

`findSession` fell back to `firm?.name ?? '(unknown firm)'`, and **`??` does not
fire on an empty string**. Once the webhook began writing `''`, a blank name
reached the prompt as:

```
Type the firm name to confirm (""):
```

and pressing **Enter passed it**, because `'' === ''`. The one check between that
command and an irreversible delivery had quietly stopped being a check.

`deliver()` now dies on a blank name. `renderTo()` keeps a placeholder — it
writes files and releases nothing.

---

## 8 · Two things that were NOT bugs — do not re-hunt these

### The marketing nav links on `/pricing`

Max reported all three dead. **Could not reproduce.** All three resolve to real
in-page anchors and scroll correctly. Most likely a dev-server rebuild mid-save.
If it recurs, capture the console before assuming it is the markup.

### The roster names were never lost

Max: a review row reading `1, dev0902b@example.com, Attorney` with no name.

**The name was not missing at write time or at render time.** The stored answer
is literally:

```
name="1"  email="dev0902b@example.com"  attorney=true
```

Max typed `1` through `10` as the names himself while speed-filling the roster.
`promote` also stamped them onto `auth.users` (`full_name="10"`, `"9"`, …), so
the roster → auth path works end to end. **Nothing was lost, nothing to recover.**

**What is real** is a formatting regression from the same day: purging the em
dashes changed the separator from ` — ` to `, `, and a one-character name is now
indistinguishable from the question numeral beside it. That is worth a better
separator, and it is not the `invite/bulk` gap.

> `/api/invite/bulk` **does** still discard the name (`route.ts:91`,
> `createUser({ email, email_confirm: true })` with no `user_metadata`). It
> affects staff invited from the **dashboard**, never the intake roster, which
> goes through `promote` and does stamp the name. Still open, untouched.

---

## 9 · Codex, in parallel

Codex pushed **`em-dash-purge` (`5ea8687`)** — 21 files, 85 user-facing em dashes
removed across `app/_components`, `app/pricing`, `app/terms`, `app/privacy` and
`emails`. It touched **nothing** under `app/intake` or `lib/intake`, so it does
not overlap this branch's work.

**Not merged.** Codex rebases onto the new `main` and merges it.

Two findings handed back to Codex:

1. **Its verification did not actually run, and was reported as though it had.**
   The four type errors were in `workers/cert-worker`, a file it never touched,
   from an incomplete install in its worktree. Its test run skipped five suites
   because the worktree has no `.env.local` — `dotenv -e ../../.env.local` makes
   them pass. **When a check cannot run, say it did not run.**
2. **One real defect:** `app/_components/exposure-section.tsx:158` reads
   `documented,{" "}` — a comma, a space, and an explicit space — rendering a
   double space.

### ⚠️ A worktree inside the repo broke both tool runs

`.worktrees/em-dash-purge` is a full checkout of another branch **inside this
one**. `pnpm test` globbed its tests (977 tests across two branches, with 2
phantom failures from stale copies), and `pnpm lint` walked its copy of the
325-file SCORM package (276 errors) because the `public/**` ignore does not reach
inside a worktree.

Fixed in `88f68b5`. **An exclude alone did not hold for vitest** — its default
`include` globs the whole tree — so the include is now stated explicitly as
`tests/`. `.worktrees/` and `.pnpm-store/` are gitignored.

---

## Commits

```
88f68b5  chore: keep git worktrees out of the test and lint runs
6435173  fix(policy): deliver-policy refuses a firm with no name
9c523fc  feat(intake): pick the languages from a list instead of typing them
4dbf779  fix(intake): the review page numbers, exits and one deleted lie
42f4431  copy(intake): Max's rewrite of the intro, the heading and the help text
3695e87  fix(intake): a pre-filled firm name now counts as an answer
8a5bc04  feat(onboarding): capture the firm name, and hold everything until it exists
94b5209  fix(intake): let the tool grid use its horizontal space
0bd72e3  docs(session): the 2026-09-01 record
```

Branch renamed `intake-ui-fixes` → **`intake-firm-name-and-copy`**, merged to
`main`.

> The 2026-09-01 question-numbers fix could not be committed separately: the same
> lines were rewritten today when the review switched to global numbering, so it
> lands inside `4dbf779`. The tool-grid half was clean and is its own commit.

## Verification

| | |
|---|---|
| `pnpm test` | **530 passed, 25 files** |
| `npx tsc --noEmit` | exit 0 |
| `pnpm lint` | 0 errors, 4 warnings (pre-existing `no-img-element`) |
| Staging | today's two firms purged; **21 older firms untouched** |
| Deployed | ❌ nothing — see `session_handoff.md` |

---

## Method notes worth keeping

- **The seed script hid a bug for weeks.** `dev-seed-firm.mjs` passing a real
  firm name is exactly why "My Firm" was never seen. A fixture that fills in what
  production leaves empty will hide that class of bug every time.
- **A screenshot found what a grep structurally could not.** Render-time string
  building is invisible to source search. If copy is assembled from a template,
  the only way to audit it is to render it.
- **The Chrome extension would not connect** (same as 2026-09-01). Headless
  Chrome over CDP with the session cookie injected via `Network.setCookie` worked,
  and is the fallback that has now worked three times (07-09, 08-14, today).
- **Two "failures" that were the tests, not the code.** Both times the assertion
  pinned behaviour that had deliberately changed. Read what the test asserts
  before believing what it reports.
