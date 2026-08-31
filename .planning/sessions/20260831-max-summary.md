# Session summary — 2026-08-31 (Max, desktop)

## Headline

**The policy generator went from an idea to a tested engine in one day.** Katy's policy was
dissected clause by clause, mapped to the intake, ratified as a 22-section spine, and built by
terminal. All 20 vendor platforms were researched. Eight decisions are locked.

Three things to carry:

1. 🔴 **Katy reversed three things at 06:12–06:47 and none of them are built** (D8). Answers are
   kept not purged, editable **indefinitely** including after delivery, retained for the life of
   the paid subscription. Output is `.docx`. Three of these contradict shipped code.
2. 🔴 **`lib/policy/vendor-block.ts` needs Katy's eyes before it ships.** It is the only generated
   rather than transcribed text in `lib/policy`, and for 15 vendors it bars client-confidential
   information until the firm has written no-training confirmation. That follows from her baseline
   but it is a reading of her rule, not her words.
3. **Slack trains models on customer messages by default**, verified against slack.com. Opting out
   is an email from an Org Owner, not a setting. A firm on stock Slack is offside Katy's baseline.

---

## What was built

| Branch | State |
|---|---|
| `main` | all planning docs, D1–D8. Pushed. |
| `policy-assembler` | the engine. **371 tests**, clean `tsc` and `eslint`. Pushed. |
| `policy-intake` | its 4 local commits are on the remote inside `policy-assembler` |

`lib/policy/` — `types.ts`, `spine.ts` (22 sections + `assertSpineInvariants`), `blocks/s01…s22`,
`platform-block.ts` (generic fallback), `vendor-block.ts` (composer), `action-items.ts`,
`assemble.ts`. Plus `scripts/build-policy-vendors.mjs` → `vendor-data.ts`, with a drift test that
fails if the generated file and the CSV part company.

**Sections §5–§22 are TODO by scope.** Terminal split them usefully: most need **transcription
only** (source text exists at a named line), while **P3, P7, P8, P24, P26, P27, P28 need actual
drafting** because Katy wrote an instruction rather than a clause. That split is the unit of work.

---

## The dissection

`.planning/POLICY-ENGINE-MAP.md` is the artifact. Katy's document is **two documents**: Part 1, the
operative `[FIRM NAME]` draft with bracketed slots, and Part 2, "Sections:", unconditional reference
prose. The engine interleaves Part 2's standing language into Part 1's spine and resolves the
brackets from answers.

**The spine compresses the source rather than adding to it.** Part 2 has 21 named headings; Part 1
adds four topics with no Part 2 heading. 25 natural sections became 22 by three merges. **21 of the
22 are a heading Katy wrote.**

⚠️ **The committed `.txt` was missing the operative draft entirely** — it had the modules, the prose,
the ethics catalogue and the full 16-term glossary, and zero hits for `ARTIFICIAL INTELLIGENCE
POLICY FOR`. The complete `.md` is now committed. It had existed only in `~/Downloads`.

---

## Decisions locked

| | Decision |
|---|---|
| D1 | module text lives in **versioned repo files**, not a database table |
| D2 | the **action item list is a separate deliverable**, not an appendix |
| D3 | **all nine** missing questions get built (required floor 29 → 32) |
| D4 | benchmark against published model policies before locking the order |
| D5 | ⏸ **no per-state jurisdiction guidance in v1** |
| D6 | ⏸ the benchmark's additive gaps go to the **guidance layer**, deferred |
| D7 | the **glossary is an authoring aid**, not policy and not a deliverable. §22 Definitions is a rule plus non-exhaustive examples |
| D8 | 🔴 **Katy's 08-31 reversals. Authoritative. Not built.** |

**Also settled:** the disclosure list is **five** situations, all sourced from Katy — substantive
delegation, billing for AI costs, tribunal requirement, a discovered error, and a vendor breach
involving client data. The last two were already in her document, in other sections.

---

## The vendor research

`.planning/POLICY-BLOCKS-RESEARCH.md` + `policy-blocks.csv`. All 20 rows carry a vendor-domain
source URL, a verbatim quoted sentence, and a date.

| `trains_on_customer_data` | count |
|---|---|
| `unclear` | **15** |
| `no` | 4 — monday, cocounsel, ask_practical_law, teams |
| `yes` | 1 — **slack** |

**That 15 is a finding, not sloppy work.** Vendors publish no-training claims on marketing and trust
pages and keep them out of the governing terms. The blocks were reframed to deliver facts rather
than verdicts: the feature's real name, whether it is on by default, where the opt-out lives, and
what the terms do **not** address.

---

## Corrections made in-session

- Two section **names** were smuggling deferred benchmark material back in (`Purpose`, `Scope and
  Governing Authority`). Both stripped after Max challenged the spine for inflating the source.
- Old §10 was a section built around **one clause**. Folded into §9.
- Claimed the 16-term glossary supplied §22's content. **Withdrawn** — it is an authoring aid Max
  wrote so he and Katy share vocabulary.
- Read a mid-merge tree as "terminal is stuck". It was mid-merge, not stopped. Inference, not a check.
- Reported the CSV empty one minute before Codex wrote to it.

---

## Open

1. **Katy reviews `vendor-block.ts`** — the 15-unclear restriction clause especially.
2. **Build D8.** `canReopen` locks a delivered intake forever; the `purged` state tells firms their
   answers were deleted; no retention clock; no `.docx` renderer. See map §13.1.
3. **Privacy §2 and §5** still have no category covering intake answers, and now must carry the
   retention rule. Katy's copy. Open since the intake's first batch.
4. `policy-assembler` is not merged to `main`.
5. Carried and unchanged: `0028`/`0029`/`0030` are not on PROD, the `Intake-uploads` bucket does not
   exist there, Resend still returns 403, and nothing has shipped since 2026-08-24T19:34:58Z.
