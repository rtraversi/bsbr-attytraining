# Session summary — 2026-08-28 (Max, with terminal-Claude)

## Headline

**Six commits on `policy-intake`: the eight missing modules, a section strip that degrades by
width, a staging seed script, and three intake changes.** The question set went from 29 questions
to 50, the tab strip from 8 sections to 12, and a submitted intake stopped being a dead end.

Three things to carry past today:

1. **A number in the 2026-08-27 notes was wrong, and it nearly cost the desktop strip.** "~4
   characters at twelve sections" came from multiplying 6.1px per character. Stack Sans at 11px
   runs nearer 5.2, and the real widths are Firm 23 … Marketing 52. Measured, the labels *fit* at
   1280 and 768; the break was only at 390. Had the guess been trusted, the strip would have
   compacted at every width and the desktop labels would have silently disappeared.
2. **Katy's "10–15 questions after gating" target is now unreachable, and already was.** A firm
   that skips every optional module answers **29** required questions — 19 of them from the set as
   it stood before today. Getting to 15 means cutting the existing core, which is Katy's call.
3. 🔴 **Three of today's six commits were pushed by something that was not this session.** See
   Status. Nothing was force-pushed and nothing was lost, but the standing "do not push"
   instruction was not honoured by whatever did it.

---

## Commits

```
main
 └── policy-intake   cd2eb46  build the eight modules that were never implemented   ← pushed
                     1c3f7a6  degrade the section strip by width, not truncation    ← pushed
                     d3b7f05  seed a complete firm on staging, no Stripe or email   ← pushed
                     d188162  drop the tier column from the tool grid               ← NOT pushed
                     c0a4c0e  the roster attorney answer becomes a toggle           ← NOT pushed
                     44cc711  a submitted intake stays editable until delivery      ← NOT pushed
```

`tsc --noEmit` 0 · `eslint .` 0 errors / 4 pre-existing `no-img-element` warnings · `next build`
clean · **262 tests across 16 files** (was 197 across 15 at the start of the day).

🔴 **Run the suite as `npx dotenv -e .env.local -- vitest run`.** Bare `npx vitest run` fails five
files on missing env and looks like a regression.

---

## 1 — The eight missing modules (`cd2eb46`)

Modules **D, E, F, I, J, Q, U and V** were in Katy's 2026-08-20 research doc and had never been
built. All eight are in, transcribed from her doc — **21 questions, 29 → 50**.

**Module W is deliberately excluded.** Her doc is explicit that it is not a question set: it is a
generated summary table pulled from A, B, C and M. The one real question buried in it — *who may
approve a new tool, and by what process* — is the only thing lost by skipping it, and is flagged in
`intake-spec.md` for Module A rather than invented.

### The section allocation

Eight modules do not fit eight sections. The rule: a section is a lane the firm recognises, and no
section runs so long that per-section progress stops meaning anything.

**Four new sections** (8 → 12): `drafting` (D — `tools` is what the firm HAS, D is what it DOES
with it) · `courts` (E, plus D's "which courts do you file with", which Katy's list marks as
feeding E; deliberately not `clients`, since she is explicit that court certification "runs to the
tribunal, not the client") · `records` (U — her words: "distinct from confidentiality") ·
`marketing` (V — her words: "a genuinely separate compliance lane").

**Four took an existing section**, each sharing its host's lane rather than merely fitting in it:
**I** and **J** into `data` (H vets a vendor before the fact and I is the same vendor after it; J's
branch turns on tier and no-training, which is H's axis), **Q** into `clients` beside P, **F** into
`staff` with hiring and discipline.

⚠️ **No existing question changed section.** `section` is display-only and never stored, so moving
one is free at the database and moves the ground under a firm for nothing.

### Three judgment calls, all in the spec

- **Module D is one multi-select where her list has three yes/nos** (form, substantive,
  boilerplate). Each stays a stable option value so the export still reads `substantive: yes`.
  Three unconditional yes/nos is the shape her own implementation note exists to prevent.
- **Her D2 offers "Always client data / Sometimes / Never".** "Sometimes" is the hedge she killed
  five days later — *"If a firm does an action then they need a policy for it."* The later ruling
  wins.
- **`filing_courts` is optional**, alone in the batch. A transactional firm files with nobody.

---

## 2 — The section strip degrades by width (`1c3f7a6`)

At twelve sections the strip truncated on a phone, and Katy is still adding modules. It now
**measures** whether the labels fit and changes shape when they do not: full (every section
labelled, every section a jump target — unchanged at full width) or compact (the current section
keeps its name and takes the width it needs, the rest are bars, and a step control moves between
them).

🔴 **A breakpoint cannot express this rule.** The width at which labels stop fitting is a function
of how many sections there are — twelve break at one width, twenty at a much larger one — so any
`md:` threshold written today is wrong the next time a module lands.

**The step control is deliberately unlike the question arrows** on every axis available: rounded
square vs circle, 28px vs 40px, filled wash vs white-with-border, double chevron vs single arrow,
above the card vs below. Reasoning sits on `SECTION_STEP` so a future restyle moves them further
apart rather than closer. Direct section jumping is given up in compact mode — Max accepted that;
twelve tap targets four characters wide were not a way of getting anywhere.

**Two things found while measuring, both in the file:**

- The strip is bounded by the **card's measure, not the viewport**, so it stops growing at 720px
  however wide the monitor is. **1280 and 768 are the same layout by construction.**
- The step control sits outside the measured element, so compact mode has ~40px less to measure
  than full mode. That gives the switch ~40px of hysteresis, which is why dragging across the
  boundary settles instead of flickering. Accidental, now documented — measuring a box that
  contains the thing whose presence depends on the measurement is how that becomes a loop.

Verified over CDP at 18 widths from 1440 to 320: **zero truncated labels at every width**, no
horizontal overflow at any, bars still visible at 13px at 320, the control steps through all twelve
sections and disables on History. Light and dark.

---

## 3 — `scripts/dev-seed-firm.mjs` (`d3b7f05`)

```
dotenv -e .env.local -- node scripts/dev-seed-firm.mjs "Byron LLP" ada@example.com \
  --seats 9 --staff 3 --attorneys 2
```

Getting a firm into the database meant a real sandbox checkout, a webhook, and a magic link Resend
has refused to send for a week. This does the provisioning directly and prints a sign-in link.

**The guard is `dev-auth.mjs`'s, copied not adapted:** ref parsed from the URL the environment
actually loaded, no `--force`, no ref override, exits before a client is constructed. Verified
against `.env.prod` — it names production and stops.

**The firm, seats row and admin member are copied from `provisionFirm`**, read rather than
remembered. Two values look wrong and are not: `status: 'invited'` is what the webhook writes, and
the admin does **not** occupy a seat, because at that point they have not said whether they are
taking the training.

**What it deliberately does not replicate**, each with its consequence, is in the file header. The
headline ones: no intake session (the point — `IntakeIntro` renders and the questions are blank);
no Stripe objects, so both id columns are **null** rather than carrying a plausible fake in the
field every billing path keys on; no terms acceptance, because writing one would be a false record
of consent.

**Two things the code guards:** the seats row goes in **before** any member (`sync_used_seats`
maintains `used_seats` with an UPDATE; with no seats row that matches zero rows and **raises
nothing**), and `--staff` above `--seats` is **refused**, not warned.

⚠️ **Seeded staff do not appear in the intake roster.** The roster is an intake answer, not a read
of `firm_members`. That is the app's own behaviour; `promote` reconciles the two at submit.

---

## 4 — The tier column is gone (`d188162`)

The grid asked Personal / Team / Enterprise, generic on the argument that vendors name tiers
differently. **Generic was the flaw:** Westlaw Edge and CoCounsel have no consumer tier at all, so
"Personal" was an option that could not be true, and a required grid gave the firm no way to say so.

Nothing is lost, because tier was only ever a **proxy** for whether the vendor may train on client
data — and the agreement column asks that outright, from the signed agreement, which is the only
place the answer lives. A consumer tier with a no-training addendum is compliant and an enterprise
tier without one is not; only the agreement column can tell them apart.

**No migration.** Answers are jsonb; `reconcileToolGrid` rebuilds each row field by field, which
sheds the stale key. Pinned by a test.

⚠️ **A live probe caught what a grep would not:** after the column was removed, the *question copy*
still read "For each tool: which tier, and…". Folded into the same commit.

---

## 5 — The roster attorney answer is a toggle (`c0a4c0e`)

The tick box's real defect was what **unticked** meant: nothing said that leaving it alone put the
person on a paid seat, so the cheap answer and the expensive one looked identical and the expensive
one was the default. Same defect the invite dialog's checkbox had, fixed there the same week.

`role="switch"` with the person's name in the accessible label, and the visible text names the
**off** state — "Staff" — because that is the one with a cost.

**Row one now defaults to attorney** (Max, 2026-08-27). It defaulted to staff, which put the buyer
on a paid seat before they had said anything, and the buyer is the attorney in most firms this is
sold to. It also lines up with what the firm already is: the Stripe webhook writes the admin's own
`firm_members` row with `occupies_seat` false for exactly this reason.

Seat cap untouched — flipping someone **to** staff still goes through `canAddTrainingSeat` and
still refuses with a message rather than a disabled control.

---

## 6 — A submitted intake stays editable until delivery (`44cc711`)

`app/intake/page.tsx` locked on `status !== 'in_progress'`, and a locked session deliberately
loaded no answers. A firm that pressed Send saw an **empty screen from then on** and could not
check or correct anything. The only remedy was to email an operator.

**Four states, decided by one function** (`intakeStateOf`) so `/intake` and Settings can never
disagree about whether a firm may edit:

| State | What the firm sees |
|---|---|
| `editable` | the intake, as before |
| `submitted` | their answers, read-only, plus **Reopen to make changes** |
| `delivered` | their answers, read-only. No reopen |
| `purged` | a plain sentence saying what was deleted and what is kept |

🔴 **Migration `0030` exists for the RECORD, not the reopening.** The flip needed no schema —
`status` already has `in_progress` in its CHECK. The columns are there because **Katy may already
be drafting**, and answers changing under her silently is worse than not allowing the edit at all.
`reopened_at`, `reopened_count`, `reopened_by`, and the screen says *"Reopened N times since it was
first sent."*

🔴 **The 0028 partial unique index is now load-bearing for a second reason.** It is UNIQUE on
`(firm_id) WHERE status = 'in_progress'`, and reopening moves a row **into** that state — so it is
what stops a reopen producing two open sessions racing into promote. The route relies on it rather
than pre-checking: one conditional UPDATE with every precondition in the WHERE clause, `23505` read
as "this firm already has an open intake". A read-then-write check would have a gap.

The route **refuses**, it does not merely hide the button: 409 for delivered, 409 for purged.

**Built once, two callers.** `lib/intake/review.ts` (pure) → `intake-review.tsx` → `/intake` and the
Settings heading spec'd on 2026-08-27. `IntakeShell` was extracted in the same pass. `IntakeClient`
lost its `locked` prop and its own "Pending attorney review" panel, which had been a second,
quietly different account of a submitted intake.

🔴 **The sensitive answers are filtered in `buildReview`, not at the call site.** `loadAnswers`
returns them on purpose — the firm typed them and must be able to correct them while the intake is
open — so "every screen must remember to drop two keys" is a rule with one failure mode and no
warning attached. Enforced off the `sensitive` flag, tested three ways.

### A date bug found while proving it

A stored `policy_delivered_at` of `2026-09-01T00:00:00Z` rendered **"August 31, 2026"**. The
delivered date is set by hand as a calendar date, so local formatting moves it back a day west of
Greenwich, **every time**. Now formatted in UTC. Same class as the certificate date bug flagged on
2026-08-25, and invisible to anyone reviewing at or east of UTC.

---

## Verification

Walked end to end on staging against a seeded firm, then purged it:

- **submitted** → 11 sections, roster / tool grid / not-decided sentinel all formatted, **no
  History section** (both its questions are sensitive), reopen offered
- **Settings** → same content under its own heading and nav link
- **reopen** → 200, `reopened_count` 1 with `reopened_at` and `reopened_by`, all 33 answers intact,
  **exactly one** open session
- **second reopen while open** → `alreadyOpen`, no double-count, no second session
- **delivered / purged** → each refuses with its own message and renders its own screen
- **zero sensitive leaks at every step**

Staging verified back to zero afterwards: firms 0, firm_members 0, seats 0, intake_sessions 0.

---

## Status

| Thing | State |
|---|---|
| `policy-intake` | 6 commits today. **Three pushed, three not** — see below |
| Migration `0030` | Applied to **staging only**. Types regenerated: 3 added columns, 0 removals |
| `0028` + `0029` + `0030` on PROD | ❌ **none of them** |
| `Intake-uploads` bucket on PROD | ❌ still does not exist |
| Supabase CLI | linked to **staging** (`ndmzvtuywcufvkxtkjhg`) — left that way |
| Deployed? | ❌ **No `workflow_dispatch` since 2026-08-24T19:34:58Z** |
| Tests / `tsc` / `eslint` / `next build` | all clean — 262 tests, 16 files |
| Rise 360 content | still not authored |

### 🔴 Three commits were pushed by something that was not this session

The instruction all day was **do not push**, and this session did not. But
`git reflog show origin/policy-intake` records an `update by push` moving the remote ref to
`d3b7f05` — the third of today's six commits. So `cd2eb46`, `1c3f7a6` and `d3b7f05` are on
`origin/policy-intake` and `d188162`, `c0a4c0e` and `44cc711` are not.

Nothing was force-pushed, nothing was lost, and the history is linear. It is the same
parallel-session pattern recorded on 2026-08-12 and 2026-08-27. Worth knowing before anyone
reasons about what the remote contains.

---

## Next steps

1. 🔴 **`0028`, `0029` and `0030` onto PROD, in order, and create `Intake-uploads` there.**
   Unchanged and still the real blocker. Capital I, case-sensitive, unrenameable, and no migration
   can create it. **Relink the CLI to staging in the same session.**
2. **Push the remaining three commits**, then merge `policy-intake` to `main` and run a production
   `workflow_dispatch`. A push to `main` builds a preview only.
3. **Look at today in a browser as a real firm.** The strip, the roster toggle and the review screen
   were all driven headless against a seeded firm, but nobody has used them.
4. **Decide the two known AA failures** on the nav pill with Rob (carried).
5. **`.planning/STATE.md` §3 and §5 are stale** (carried).

---

## Open questions

1. 🔴 **Katy's 10–15 question target.** A skipping firm now answers 29 required questions. Cutting
   to 15 means cutting the *existing* core — Section 0 alone is five — and that is her call, not a
   thing to do inside a build task.
2. **The tab strip at twelve sections on a phone.** Solved by compacting, but if Katy adds another
   four modules the compact strip's bars reach ~10px. The lever is the gap and the minimum bar
   width, both in `intake-client.tsx`.
3. **Module W's one real question** — who may approve a new tool, and by what process — is unbuilt
   and belongs in Module A.
4. **`/api/invite/bulk` still discards the `name`** (carried, unchanged). A certificate can still be
   made out to `paralegal@firm.com`.
5. **Nothing sends invites from the intake roster** (carried, unchanged).
6. **The purge does not exist** (carried). 0028 has the columns and the backstop index; the route,
   the audit row and the 30-day cron do not. It is now also what the Settings read-back and the
   `purged` state are defined against.
7. **Katy still owes:** `lib/intake/questions.ts` (the guessed K/K/L module letters, the invented
   section grouping, and now the eight new modules' wording), the 50-question bank review, and
   Privacy §2/§5, which have no category covering intake answers.
