# Session summary — 2026-08-24 (Max, terminal)

**Who:** Max, with terminal-Claude. Wrapped just after midnight on the 25th.
**Two pieces of work:** the Rule 5.3 framing correction, then publishing the reviewed
Terms and Privacy pages.

> ⚠️ **A second Claude session (Desktop) worked the same files in parallel** and pushed four
> commits on top of mine. One of them **reverses an instruction this session was given** about
> `/dpa`. That is recorded below under "What the other session changed" — read it before
> assuming this summary describes the current state of `main`.

---

## Part 1 — Rule 5.3 is not the north star (`d7061fb`)

Katy's correction, relayed by Max: **a correction, not a preference.**

The product is the **firm's own written AI use policy**, generated and personalized per firm.
The training exists to keep staff aligned to that policy; the quiz, attestations and
certificates are the evidence. Rule 5.3 is outdated background context and at most a
supporting citation.

The framing had been set by the earliest planning sessions, was never revisited, and had
spread from `CLAUDE.md` into every doc, the marketing copy, the transactional emails and the
certificate face.

**Killed at the source.** `CLAUDE.md` and `.planning/PROJECT.md` — product paragraph, Core
Value, and the framing constraint rewritten to lead with the policy. Both now carry a
**⚠️ Framing correction — 2026-08-24** block stating that future sessions must not reintroduce
Rule 5.3 as the thesis, with the ToS §3/§11 disclaimers named as the deliberate exception. In
`CLAUDE.md` the block sits inside the `GSD:project` markers so a regeneration keeps it.

`REQUIREMENTS.md` / `ROADMAP.md` — correction note at the top of each, plus the specs that had
baked the rule into deliverables (CERT-04 cert contents, DASH-07 attestation wording, DASH-08
explainer title, AUDIT-03 retention rationale, two roadmap success criteria).

`MARKETING.md` — the worst of them; its whole spine was the rule, down to the old
`rule53-cert.com` working title. Front half rewritten policy-first. The case-law and bar-opinion
research is **kept but demoted** to explicitly-labelled supporting evidence.

**Customer-facing strings reframed:** site meta description, the stub course description written
at onboarding, landing-page fine print, both employee emails, four cert-worker templates, plus
two beyond the original list that were the same class — the lapsed-firm expiry notice
(`cert-worker/src/index.ts:244`) and the Stripe renewal re-enrollment email.

**Certificate face:** `lib/cert-pdf.ts` no longer prints "demonstrating required competency in
AI usage under ABA Model Rule 5.3". It now reads *"trained and assessed on their firm's written
AI use policy"*.

> **PROD certificate count was 0** — verified live against `ttqthtzdjacrhjtrcmmy` before
> changing the string (`certificates` 0, `quiz_attempts` 0, `enrollments` 0, `firms` 1). No
> certificate has ever been issued in production, so there is nothing to reissue and no stored
> PDF carrying the old line. Stored PDFs are never re-rendered.

### 🔶 Flagged for Katy + Rob — NOT done

**`.planning/FRAMING-CORRECTION-2026-08-24.md`** lists, line by line, the authored content that
still argues the old thesis. This is curriculum, not copy, so it was left alone deliberately:

- `lib/training/lessons.ts:39,43` — Lesson 1 summary and key takeaway both give Rule 5.3 as the
  *reason* the training exists
- `lib/training/questions.ts:48` — quiz stem `l1q2` opens "Under ABA Model Rule 5.3…"
- `supabase/migrations/0003` (7 lines) and `0026` (4 lines — the live 50-question pool). Text
  changes here need a **new migration**, not edits to applied ones. `0025`'s
  `PLACEHOLDER:rule-5.3-basics` is an identifier, not prose — recommend leaving it.

**Until these are revised, the training itself still teaches the corrected framing.**

---

## Part 2 — Terms and Privacy published (`2dc654a`)

Both pages had been shipping `[ATTORNEY TO COMPLETE]` placeholders **while customers were
accepting them at checkout**. Both now carry the reviewed drafts from `.planning/legal/`,
transcribed into the shared `LegalPage` template. No clause was reworded.

This pass also established the first real usages of `LegalSubheading`, `LegalCallout`,
`LegalDisclaimer` and `LegalTable` — none existed before.

**Terms §16 "Dispute Resolution" deleted.** It was an empty `[CONFIRM]` asking counsel to choose
between inherited AAA arbitration and something else. Shipping an empty heading or inheriting an
arbitration clause nobody chose were both worse than silence, which means default law applies.
§17–19 renumbered to 16–18, and §14's survival list corrected from "15 through 18" to
**"15 through 17"**.

**Governing law fixed as North Carolina** — Max confirmed. `.planning/legal/README.md` item 5 had
it as presumed-but-unconfirmed.

**The false Articulate paragraph is gone.** Privacy §4 claimed we self-host the Rise course and
that Articulate observes nothing. `courses.rise_embed_url` is a `share.articulate.com` URL, so
that was false and carried a `[PUBLICATION GATE]` saying so. Publishing it would have put a
false statement in a legally operative document. **Articulate Global, LLC is now listed as a
sub-processor** instead — true today. When self-hosting lands, drop the row and restore the
paragraph in the same commit as the routing change.

**No bracket note survives into either rendered page.** Effective date 2026-08-24, every contact
slot resolves to `info@iurixaccreditation.com`, postal-address rows omitted rather than printed
as `[TBD]`, `[CONFIRM]` notes under finished text dropped with the text kept.

**Footer disclaimer replaced with Katy's wording, verbatim.** ⚠️ That rewrite **deletes two
clauses**: *"does not provide legal advice"* and *"do not constitute bar accreditation or a
guarantee of compliance"*. The code comment above that block had called the second one
load-bearing — the sentence keeping the marketing copy's use of "accreditation" from reading as
a bar-accreditation claim, on a product literally named *Iurix Accreditation*. Katy is the
reviewing attorney and made the call knowing that. The disclaiming work now sits in **Terms §2**
("Certificates are not accreditation") and **§11**. Do not restore either clause without going
back to her.

**`CURRENT_TERMS_VERSION` bumped to `v1-published-2026-08-24`** in the same commit, as its own
comment instructed. Acceptances stored against `v1-draft-2026-08-18` are **left alone** — those
people agreed to the placeholder text, and rewriting their version would be a false record. The
file now records what differs between the two versions.

---

## What the other session (Desktop) changed on top

Four commits, all after mine, all on `main` and already pushed.

| Commit | What it did |
|---|---|
| `0d3ac7a` | **Unlinked the DPA and the AI Use Policy.** Reverses the `/dpa` instruction this session was given. |
| `cd55e9d` | Repaired the checkout acceptance sentence — removing the DPA left a dangling serial comma |
| `788b4d7` | Katy's review: British → American spellings across both pages (`enrol`→`enroll` ×4, `authorised`→`authorized` ×2, `licence`, `defence`, `organisational`, `unauthorised` ×2), and Privacy §1 now reads "policy, training and certification services" |
| `fd7ad9f` | `og:title`/`twitter:title` reframed to lead with governance; back-ported all page fixes into `.planning/legal/*` so the drafts and the live pages agree again |

**On the DPA reversal.** This session was told explicitly *"Do NOT guard or unlink /dpa"*,
because it was named inside both checkout acceptance checkboxes and 404-ing it would have a
paying customer accept a document that does not resolve. I raised that same risk earlier in the
session and offered removing the DPA from the acceptance line as the alternative. Max's later
call went that way: the DPA has **never been drafted, in any branch, in this repo's whole
history**, so it was removed from the acceptance sentence entirely and `app/dpa/page.tsx` is now
`notFound()`-guarded in production. That is a coherent resolution of the problem, not a
contradiction of it — the two instructions were issued against different information. **Nothing
was undone.**

Side effect: the three mislabelled dashboard "Cookies" links that this session relabelled
(Task 7) were subsequently **deleted** rather than relabelled, which supersedes that fix.

---

## Status

| | |
|---|---|
| `main` | see `git log`; a Desktop session was still pushing as this was written (`2efec94` landed mid-wrap) |
| tsc / eslint | clean as of `2dc654a`; not re-run after the other session's four commits |
| Deployed? | ❌ **No.** Nothing from 2026-08-24 has been deployed. |

**The live site still serves the pre-2026-08-24 code** — old framing, old meta description, old
footer disclaimer, and `[ATTORNEY TO COMPLETE]` on both legal pages. Everything above exists in
`main` only.

---

## Next steps

1. **Deploy.** `pnpm run deploy`. This is the whole point of the session and none of it is live.
   Verify on the deployed URL: `/terms`, `/privacy`, the footer disclaimer, `/dpa` 404s in prod,
   both checkout acceptance sentences, and the share-card title.
2. **Katy — training content.** Revise the items in
   `.planning/FRAMING-CORRECTION-2026-08-24.md`. The `0026` question-pool changes need a new
   migration.
3. **Katy — three open drafting questions** left unresolved rather than invented:
   - **Cancellation notice period.** The `[TBD]` was dropped and the published text has none.
     §5 says renewal happens "unless cancelled beforehand"; §14 gives the mechanic (portal, any
     time, effective at term end). If she wants a notice period it must be added.
   - **Refund procedure.** `[TBD]` resolved to a single sentence pointing at
     `info@iurixaccreditation.com`. If a real procedure is wanted (form, deadline, evidence),
     it is still open.
   - **Operational log retention.** Privacy §5 still reads "a rolling short-term basis" with no
     period. Deliberately not invented — it is a fact about infrastructure, not a drafting choice.
4. **The DPA and the AI Use Policy remain unwritten/unrouted.** The AI Use Policy *is* drafted
   (`.planning/legal/ai-use-policy.md`, 149 lines) but has no route. The guard comment in
   `app/dpa/page.tsx` lists every link that has to come back when each document exists.
5. **Accessibility Statement was not shipped** — not linked, claims untested. Unchanged.

## Open questions

- Does Katy want Rule 5.3 cited *at all* in the revised training content, or dropped entirely in
  favour of testing behaviour against the firm's own policy? `questions.ts:181,196` already test
  firm policy and are the model.
- Is `BSBR Holdings, LLC d/b/a Iurix` final? It is now in both published legal pages and the
  footer copyright line. `.planning/legal/README.md` item 3 still lists entity structure as open.
