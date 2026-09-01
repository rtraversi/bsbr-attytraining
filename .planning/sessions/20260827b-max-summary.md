# Session summary — 2026-08-27, second session (Max, with terminal-Claude)

## Headline

**The seat cap's failure mode was inverted, the post-payment path got a walkthrough, and the
Invitations card was emptied into two dialogs.** Four commits on `policy-intake`.

Three things to carry past today:

1. **`seatsPurchased()` answered `0` for "the read failed" and `0` for "they bought none", and both
   callers read `0` as "no cap".** So the one condition under which the cap could not check a roster
   was the one condition under which it waved everything through. Fixed by distinguishing the two,
   not by flipping the default — the right answer to "unknown" is different on the client than on
   the server.
2. **A dismissible checklist and an undismissible chip cannot both prompt the same task.**
   `onboarding-checklist.tsx` was replaced rather than revived, and the reasoning is recorded so
   nobody rebuilds it.
3. **The Invitations card scrolled permanently, at rest, with nothing in it.** Two separate causes —
   too much content, then controls sized past the track — fixed in two commits.

---

## Commits

```
main
 └── policy-intake   6be0bee  tell an unknown seat count apart from a seat count of zero
                     3bab062  walk the buyer from payment to a submitted intake
                     074d414  move the Invitations explanations into dialogs
                     ef38348  size the Invitations controls to the row track
                     820432f  docs(intake-spec): read your intake back from Settings  ← other session
```

⚠️ **`820432f` is not from this session.** A parallel Claude session committed a spec addition to
`.planning/intake-spec.md` mid-work — a firm reading its own intake back under Settings. Noted so it
is not misattributed here; it is documentation only, no code.

`tsc --noEmit` 0. `eslint .` 0 errors / 4 warnings — all four the pre-existing `no-img-element` ones
in `closing-cta.tsx`, `hero-section.tsx`, `iurix-lockup.tsx`, untouched. `next build` clean.
**197 tests across 15 files**, up from 195.

🔴 **`npx vitest run` on its own fails five files on missing env.** The real command is
`npx dotenv -e .env.local -- vitest run` — what `pnpm test` wraps. Worth knowing before anyone
reports a false regression.

---

## 1 — The seat cap hole (`6be0bee`)

`lib/intake/session.ts` returned `data?.max_seats ?? 0`, and `branching.ts:419`/`:431` treated
`seatsPurchased <= 0` as "unknown, so no cap". A missing seats row, a slow read and an outright
failed one were therefore indistinguishable from each other **and** from a firm that genuinely
bought nothing — and all four switched the cap off, letting a firm roster unlimited staff, submit,
and promote past its seat count. Precisely what the cap exists to prevent (Max, 2026-08-26: *"THIS
IS NOW A CAP, NOT A FLAG"*).

**Three states now, not two:**

| | meaning |
|---|---|
| `null` | no seats row, or the read errored. **Not known.** |
| `0` | the row is there and says zero. **A real cap of zero** — this used to be invisible. |
| `n` | the row says `n`. |

**The two callers deliberately disagree about `null`**, which is the whole point:

- **The roster screen stays permissive.** The existing reasoning holds — nobody should get a dead
  form because a query was slow.
- **`POST /api/intake/submit` refuses**, with **503** and its own message. It is what writes the
  auth users and the `firm_members` rows, so it must not promote a roster it cannot check.
  Deliberately **not** the over-seats copy, which would tell a firm inside its seats to go and spend
  money it did not need to.

`seatsPurchased()` also reads `error` now, so a genuine failure cannot pass as a real answer.

`tests/intake-branching.test.ts` covers the three states separately. The old "reports the shortfall"
test was folded in — it was fully subsumed.

---

## 2 — The onboarding walkthrough (`3bab062`)

`/onboarding` took a password and dropped the buyer on question one of a long form with nothing
saying what it was for, how long it ran, whether it saved, or what they got at the end. The intake
**is** the product, so arriving unannounced made the deliverable look like paperwork standing
between the firm and the thing they bought.

- **`app/intake/_components/intake-intro.tsx`** takes the place of question one: three steps (*you
  answer these* → *an attorney assembles and reviews your policy* → *your staff are held to it*),
  the question and section counts, and "it saves as you go".
- **A one-line bridge on `/onboarding`**, so "continue" names its destination.
- **A resume line for the returning firm** — *Welcome back, picking up in Tools, 9 of 34 answered* —
  which clears on the first move.

🔴 **Guidance, never a gate.** Katy killed the hard gate on 2026-08-26 12:11. The introduction
carries an explicit, **equal-weight** way out — *Look around the dashboard first*. The nav-pill
intake chip is untouched and remains the persistent nudge; this is the layer above it.

**Shown by STATE, not by a dismissal flag.** It renders only when the session has no
`current_question` and no saved answers. `getOrCreateOpenSession` inserts `current_question` as
NULL, so "untouched" is unambiguous, and somebody back three days later has both and never sees it.
No cookie, no column, nothing that can drift out of step with the session it describes.

### `onboarding-checklist.tsx` was REPLACED, not revived

Deleted with its only caller, `POST /api/firm/onboarding/dismiss`. Three reasons, all structural:

1. **Its steps are the pre-intake product model** — *purchased → invite your team → they complete
   training*. The intake is not on the list at all, and "invite your team" is an action nobody has
   built.
2. **It is dismissible**, on a persisted `firms.onboarding_dismissed`. The intake prompt is
   deliberately undismissible because it is the only route to the written policy; a dismissible
   checklist beside it is two prompts for the same task disagreeing about whether it matters.
3. **It celebrates "You're compliant!"** — the Rule 5.3 framing corrected on 2026-08-24.

⚠️ `firms.onboarding_dismissed` (migration `0008`) is now read by nothing. Left in place: a column
drop is a migration against two databases for no benefit, and PROD is behind on `0028`/`0029`
already.

Recorded in `.planning/intake-spec.md` under "Where it sits in the flow".

---

## 3 — The Invitations card (`074d414`, `ef38348`)

Max: everything was *"clunked in there"* — field, attorney checkbox, two buttons, a CSV format hint
and an out-of-seats disclosure, in one small tile. It is now **three controls**, and both
explanations moved into dialogs opened by the buttons they belong to.

### 🔴 The checkbox's real defect was not that it was ugly

**Unchecked was an answer, and it was the expensive one.** Not ticking "This person is an attorney"
spent a seat, on a firm capped at the seats it bought — a control whose default has a billing
consequence, on the one screen where that consequence is capped. **The dialog preselects nothing**
and keeps Send disabled until the firm says.

It also has room for the consequence the checkbox could not fit: an attorney uses no seat **and is
issued no certificate** (the gate added in `93a92eb`), which is the half an admin would want before
choosing.

### The CSV guide

Two lines of 12px grey was everything a firm was ever told about the only feature here that touches
a file on their computer. The dialog says what a `.csv` is and how to get one out of Excel or
Sheets, gives the three columns with a copyable example and what each is for, and states plainly
that Send emails everyone in the file at once, that staff spend seats and attorneys do not, and that
existing members are skipped. The picker lives inside it, so the explanation is unavoidable rather
than optional. The preview names the staff/attorney split and warns **before** Send when the file
holds more staff than the firm has seats for.

### Two judgment calls worth revisiting

1. **`out-of-seats-notice.tsx` is deleted, not merely unrendered.** Max's list of what stays was
   three things and this was a conditional fourth. Its text is now on the staff option in the invite
   dialog — shown at the moment somebody is choosing staff, with the same `/api/portal` link — which
   is better placement than a disclosure on a card. But it was a component Max had made specific
   calls on (*"deliberately NOT styled as a warning at rest"*), so it is a revert away if he
   disagrees.
2. **`modal.tsx` is new** — the backdrop-and-card shell, once. **Not the start of a component
   library**; the repo deliberately has none. It exists because these two dialogs would have taken
   the count of hand-rolled backdrops in that folder to four, and the existing copies had already
   drifted: only one closed on Escape, and none announced itself as a dialog. `cert-preview-modal`
   and `resend-invite-modal` can adopt it when either is next touched.

### The permanent scrollbar (`ef38348`)

Three `py-3` controls plus `gap-2` measured **~148px against a track of ~140**, so the card scrolled
at rest with nothing in it — on a dashboard whose whole layout exists to fit the viewport without
scrolling (`dashboard-shell.tsx`'s measured 880px floor). A scrollbar that is always there also says
"there is more below" when there is not, so it costs the affordance as well as the pixels.

`py-3 → py-2`, `text-sm → text-[13px]/[18px]`, `gap-2 → gap-1.5`, heading `mb-3 → mb-2`. ~148px →
~116px. The picker inside the CSV dialog keeps its full size.

⚠️ **The line-height is pinned on purpose.** An arbitrary Tailwind `text-[13px]` sets *only*
font-size, and the `normal` that fills in resolves differently on an `<input>` than a `<button>` —
the three controls would have come out at subtly different heights for no visible reason.

**This card is now a fixed budget.** Anything added back comes out of the same ~140px, which is the
reason both explanations live in dialogs rather than on the card.

---

## Status

| Thing | State |
|---|---|
| `policy-intake` | 4 commits from this session (+1 from a parallel session), **pushed** |
| Tests / `tsc` / `eslint` / `next build` | all clean — 197 tests, 15 files |
| Deployed? | ❌ **No `workflow_dispatch` since 2026-08-24** |
| Any of today's UI in a browser | ❌ **never rendered** — intro, both dialogs, the resized card |
| 0028 + 0029 on PROD | ❌ still staging only |
| `Intake-uploads` bucket on PROD | ❌ still does not exist |
| Rise 360 content | still not authored |

---

## Next steps

1. 🔴 **`0028` and `0029` onto PROD, and create `Intake-uploads` there.** Unchanged and still the
   real blocker: the code reaches production through CI, the database it lands on does not. Capital
   I, case-sensitive, unrenameable, and no migration can create it. **Relink the CLI to staging in
   the same session.**
2. **Merge `policy-intake` to `main`, then run a production `workflow_dispatch`.** A push to `main`
   builds a preview only.
3. **Look at all of today in a browser.** Four surfaces have never rendered anywhere: the intake
   introduction, the invite dialog, the CSV dialog, and the resized Invitations card. The card fit
   in particular has only been measured on paper — it is the whole point of `ef38348`.
4. **Decide the two known AA failures** on the nav pill with Rob (carried from the first session).
5. **`.planning/STATE.md` §3 and §5 are stale** — carried from the first session and still true.

---

## Open questions

1. 🔴 **`/api/invite/bulk` still discards the `name`.** The CSV dialog now tells firms how to write
   the name column, and the route creates the auth user from the email alone and never writes
   `user_metadata.full_name`. `app/api/certs/generate/route.ts:102` falls back to the email address,
   so a certificate can still be made out to `paralegal@firm.com`. The copy stops short of promising
   the name reaches the certificate, but **the gap is real** and it is the batch-4 obligation
   already recorded in `intake-spec.md` under "The roster wins on names".
2. **Nothing sends invites from the intake roster.** Promote creates `firm_members` rows as
   `invited` and deliberately sends nothing. Unchanged.
3. **The purge does not exist.** 0028 has the columns and the backstop index; the route, the audit
   row and the 30-day cron do not. Now also load-bearing for the Settings read-back spec'd in
   `820432f`, which is defined as being available *until* the purge.
4. **Was deleting `out-of-seats-notice.tsx` the right call?** See §3 above.
5. **Katy still owes:** `lib/intake/questions.ts` (guessed K/K/L module letters, invented section
   grouping), the 50-question bank review, and Privacy §2/§5, which have no category covering intake
   answers.
