# Session summary — 2026-08-25 (Max, desktop)

Three strands: the policy-intake mockup, the certificate redesign, and two UI batches
executed by terminal. Codex took over the mockup mid-session while this session was rate-limited;
its work has been folded back into the builder (see §4, which is the one thing here that could
have been silently lost).

> Written to `.planning/sessions/` rather than only to `session_handoff.md` **on purpose**.
> Terminal is wrapping up the same day and overwrites `session_handoff.md`. On 2026-08-05 two
> findings lived only in that file and were destroyed by exactly that collision; the recovery is
> recorded in `20260805-max-summary.md` §4. Anything here that matters is here.

---

## 1 · The policy intake mockup

Static, self-contained, no network. Built from `build_intake_mockup.py` in the desktop session's
scratchpad, which is **not in this repo** — see §5 for where it lives and why that matters.

**Katy's two directives, 2026-08-25, both implemented:**

1. **One question at a time.** *"If there are a bunch at a time it doesn't seem custom."*
   All 16 questions render; one is visible. Progress is per **module**, not per question — a
   1-of-16 counter makes the form feel long, which is the opposite of what showing one at a time
   is for.
2. **Every hedge option removed.** *"Eliminate all sometimes options. If a firm does an action
   then they need a policy for it."* Three died: "Yes, occasionally" (Q1), "It varies by matter"
   (Q7), "Only where the matter is sensitive" (Q15). Verified zero occurrences remain.

**Consequence worth watching:** with hedges gone, "I don't know" is the only soft answer left, so
it now carries all the weight. It was already made consequential — the escape answers state what
they cost at the point of choosing, not after.

**Structure:** 16 questions, 14 required / 2 optional, 7 control types (radio, checkbox with
write-in, select, textarea, number, 1–5 scale, date). Validation runs on Send: unanswered required
numerals turn red, an amber pill appears, and the form jumps to the first gap. Optional numerals
are grey with an asterisk.

**Derivation, and this needs saying to Katy directly:** the question wording is **derived from her
research, not written by her**. Every question traces to a line in her 2026-08-22 glossary or the
2026-08-20 brief — the behavioural-not-taxonomic rule, the under-reporting risk, the West Virginia
strictness switch. She never wrote a question list. If she assumes she did, she will review the
wording and skip the derivation, which is the part that actually needs her.

## 2 · The certificate

`lib/cert-pdf.ts` is `pdf-lib` + fontkit at **792×612pt (US Letter landscape)**. The new design in
`certificate design assets/` is **A4 landscape** (viewBox 3508×2481, ratio 1.4139). Not close
enough to fudge. Max confirmed A4, so the page becomes 842×595pt.

**A first print was produced and rejected — correctly.** The layout was *estimated* rather than
read out of the SVG, and it was wrong in every particular: name and firm belong on one large line
at the top, the teal line is a subtitle beneath it, score/dates/cert-number sit in dark pill chips
in a pixel face, the second teal line sits lower, the badge is large bottom-left, and there is a
signature line bottom-right. Doing this properly means resolving the 196 nested `<g transform>`
chains in the SVG to get real coordinates. **Parked, not abandoned.**

**Decided:**
- Page: **A4 landscape**
- The `"Staff Compliance with ABA rule 5.3"` line is killed and replaced with
  **"Compliance with the firm's written AI use policy"** (Max's pick). This matters — the
  certificate is the most durable surface in the product, kept seven years and never re-rendered,
  and the old line would have reinstated the framing corrected on 2026-08-24.
- QR goes **lower right**, rendered in Iurix teal rather than black
- Assets are split: `certificate design background.png` (clean plate, no text, no badge),
  `iurix badge.png`, and the full SVG as the coordinate spec

**Open:**
- **Two marks are in play.** The certificate badge is a metallic *shield*; the site, the intake
  mockup and `public/brand/iurix-mark.png` use a *circular* scales mark. Unresolved.
- A second typeface, **Pixelify Sans**, carries the dates, score and cert number. Only Stack Sans
  is embedded today; adding it needs a licence check and adds Worker bundle weight.
- **New legal text nobody has reviewed** is baked into the artwork: *"This certificate does not
  constitute legal counsel or makes IURIX liable for breach of privacy by anyone who is certified
  under their certificate."* The grammar breaks mid-sentence and it is a liability disclaimer that
  is not in the Terms. Max is taking it to Katy.
- **A date bug the proof surfaced:** `new Date('2026-08-25')` parses as UTC midnight and formats
  in local time, printing **August 24**. Whether `lib/cert-pdf.ts` has the same hole depends on its
  callers and was **not checked**. If it does, every certificate west of UTC is dated a day early.

## 3 · UI batches A and B (terminal)

Both committed and pushed. **Neither is merged to `main` and neither is deployed.** Last production
deploy is 2026-08-24T19:34:58Z, which predates both.

| Branch | Commit | Contents |
|---|---|---|
| `ui-polish-batch-a` | `6b849fb` | sign-in pills, square remember-me, heavier footer links, bare icons in Quick actions and Manage team, pills on billing + invitations, blue active nav tab, real theme switch with sun/moon |
| `ui-polish-batch-b` | `97bf6eb` (+ `692ba9a`) | CSV controls pilled, Invitations card shrunk, score-card label and 25% bands |

**Verified independently, not taken on report:**

- **The blue active tab fails contrast.** White on `#0094FF` measures **3.14:1**; AA wants 4.5:1.
  Terminal's estimate was right. Its one-line fix is `--brand-primary` with near-black text, which
  measures **10.13:1**. Not yet applied. Relevant to the palette question: white on the turquoise
  `#5CC6C3` is **2.03:1**, *worse* than the blue — so white-on-brand stops working entirely under
  the new palette, and moving to dark-text-on-light-brand now avoids doing this twice.
- **The 100% rounding bug was real.** `199/200` rendered as "100%". Guarded with an explicit
  `certifiedCount === totalCount`. Verified: 199/200 → 99, 200/200 → 100.
- **The identical defect is still live** at `certification-forecast.tsx:75`, untouched by
  instruction. Same card family, same lie.
- **The Invitations card still scrolls.** Terminal measured rather than guessed: container
  149.73px, content 248px before, **192px after — still 42px over**. Five variants tried; the only
  one that clears needs `py-2.5`, putting buttons at exactly the 40px floor. The deciding element
  is the hint line *"CSV format: name,email — one per row"* (32px plus gap, wrapping to two lines).
  Removing it is a **copy** decision, which is why terminal left it. **That call is still open.**
- Terminal wrote one new string without being asked: **"No staff invited yet"** for the score
  card's empty state.
- It argued **against** basing the score on `firms.max_seats`, with five reasons. The sharpest: a
  firm holding one spare seat could never reach 100%, which resurrects the all-or-nothing
  accreditation problem from a different direction. Its alternative — keep "invited" as the
  denominator and surface *"3 seats not yet invited"* on Billing — is the better answer.

## 4 · Codex's work, and the drift it created

Codex took over the mockup while this session was rate-limited. It **split three long module names
into six one-word ones** so the tabs sit on one line at any width:

| Tools | Data | Review | Access | Clients | Practice |
|---|---|---|---|---|---|
| Q1–3 | Q4–6 | Q7–9 | Q10–11 | Q12–14 | Q15–16 |

It also rendered the tabs from a JS table instead of baking them into the markup, tightened the
lede, dropped the label size to 11px with a 25rem breakpoint, and added `:focus-visible` outlines
the tabs had been missing.

**The danger, now closed:** Codex edited **`index.html` only**. It did not touch the builder or
either deliverable file. The next build would have destroyed all of it, silently. Everything above
has been folded back into `build_intake_mockup.py`, and the rebuild was diffed against Codex's file
— the 33 remaining differences are all positional or deliberate (same CSS reordered, the lede
re-wrapped, and `MODULES` now **emitted from the build** so the Python and JS tables can no longer
drift). Behaviour re-verified in a browser: 6 tabs all on one line, all 16 questions walk, 14 red
on an empty send, 0 red when complete, no console errors.

## 5 · ⚠️ The mockup builder is not in this repo

`build_intake_mockup.py` and its outputs live in the desktop session's scratchpad at
`/private/tmp/claude-501/…/scratchpad/`. **That is a temp directory.** The 6-module split, the
question set, the derivation from Katy's research and the validation logic exist nowhere else.

This is the same shape as the 2026-08-04 loss recorded in `project_legal_drafts_lost` — work that
was finished, was never written to a durable location, and is now unrecoverable. **Move it into the
repo before it is needed again.**

---

## Next

1. **Move the mockup builder into the repo.** Highest priority in this list, and the cheapest.
2. **Merge and deploy batches A and B**, after deciding the contrast fix and the CSV hint line.
3. **Certificate:** resolve the SVG transform chain for real coordinates, pick one mark, get the
   disclaimer to Katy, and check the date bug in `lib/cert-pdf.ts`.
4. **Tell Katy the questions are derived, not hers**, and that the six-module grouping is a guess
   at her intent.
5. **Onboarding build.** Katy's 7-step flow needs four things that do not exist: the intake, policy
   generation, e-signed attestations, and firm accreditation. A guided tour built now can only
   cover invite → track → certificates; built against the full flow, it gets built twice.
