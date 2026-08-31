# Policy Engine Map — the policy, the modules, and the questions

**Written 2026-08-31 (Max, desktop).** Source of the policy text: Katy's drafted template, pasted
by Max 2026-08-31, which is the same document as the "ACTUAL POLICY Elements required" section of
`.planning/AI-Policy-Research-2026-08-20.docx` **plus a full operative draft that the committed
`.txt` does not contain**. ⚠️ The committed copy in `.planning/` is therefore **not** the latest
version of the policy. See G-B0.

**What this document is for.** The assembler (Katy, 2026-08-26, reversing her own "no generator"
line) is deterministic: intake answers select prepared module text and fill fixed slots. Before any
of it can be written, three things have to line up — the **policy clauses**, the **modules**, and
the **question keys**. This file is that alignment, and it is where the missing pieces are named.

**Authority.** `.planning/intake-spec.md` is the authority for the question set;
`lib/intake/questions.ts` is its implementation. Every key below was read out of that file on
2026-08-31, not remembered. Where the policy needs something the question set does not carry, it is
listed as a gap rather than assumed.

🔴 **The rule that does not move: intake answers are never sent to a model.** The assembler is
mechanical. Everything in here is a lookup, a branch, or a string substitution.

---

## 1. The single most important structural finding

**Katy's document is two documents, and only one of them is a template.**

| | **Part 1 — the operative draft** | **Part 2 — "Sections:"** |
|---|---|---|
| Starts at | `ARTIFICIAL INTELLIGENCE POLICY FOR [FIRM NAME]` | `Preamble: Under the prevailing law…` |
| What it is | The policy a firm receives, with bracketed slots | Reference prose: rationale, source rules, and standing language |
| Conditional? | Yes — roughly half its clauses are bracketed instructions | No — almost none of it is branched |
| Engine role | **The spine.** Clause order, slots, conditions | **The library.** Where prepared module text is drawn from |

Part 2 carries **substantive requirements that never made it into Part 1**: the Preamble, Competency,
Staff Competency, the third-party vendor evaluation factors, shrinkwrap/clickwrap, Hallucinations,
Automations, the approved-vs-non-approved tools distinction, and the "OK to ask in chat" examples.

**Consequence for the build:** Part 1 is not yet a complete policy. It is the conditional half of
one. The engine's output = **unconditional Part 2 language, interleaved into the Part 1 spine, with
Part 1's brackets resolved from answers.** That interleave order does not exist yet and is a
decision Katy has to make, not one the engine can infer.

---

## 2. The dissection — Part 1, clause by clause

`P#` is a working ID for the clause. **Trigger** is the condition under which the clause appears;
"always" means it is in every policy. **Varies** is what the answer actually changes.

### 2.1 Header and scope

| P# | Clause | Module | Question key(s) | Trigger | Varies |
|---|---|---|---|---|---|
| P1 | `POLICY FOR [FIRM NAME]` | — | `firm_name` | always | slot fill |
| P2 | Comply with Federal Courts, Agencies, Circuits, and `[STATES OR JURISDICTIONS LISTED]` | 0 | `jurisdictions` | always | slot fill (list) **+ per-state guidance, see G-B1** |
| P3 | `[IF additional regulatory regime → comply with the most restrictive]` | H | `regulatory_regimes` | any value ≠ `none` | clause present/absent; names the regimes |
| P4 | All non-attorney staff complete Iurix training, certify, sign attestations; renew annually | G | `roster` | always | text scales when the firm has **zero** non-attorney staff (Katy 2026-08-25: a solo with no staff needs no non-attorney training) |
| P5 | Contract, of-counsel and co-counsel supervised for compliance | G | `contract_attorneys` | `yes` | clause present/absent |
| P6 | `[IF technology/confidentiality policy YES → incorporate it]` | 0 | `existing_policy`, `existing_policy_file` | `yes` | clause present/absent; the upload is Katy's to reconcile by hand |
| P7 | `[IF a tool is prohibited → state it]` | A | `prohibited_tools` | non-empty | slot fill (list) |
| P8 | `[IF personal devices permitted → strict compliance, never client PII]` | A | `personal_devices` | `yes` | clause present/absent |

### 2.2 Tools, research, and platforms

| P# | Clause | Module | Question key(s) | Trigger | Varies |
|---|---|---|---|---|---|
| P9 | `[legal research specific tool → insert relevant policies for the selected tool]` | B | `research_tools` | per selected value | **one prepared block per tool.** 6 values: `cocounsel`, `lexis_plus_ai`, `vincent_ai`, `ask_practical_law`, `westlaw_edge`, `general_llms`. 🔴 **None of these blocks exist — G-A1** |
| P10 | Case management platforms contractually bound, training on data disabled | C | `case_mgmt` | any value ≠ `none` | clause present/absent |
| P11 | `[IF UNSURE → ACTION ITEM to research training permission + platform-specific instructions]` | C | `case_mgmt_ai` = `not_sure` | conditional | writes to the **action list**, not the policy. 🔴 **The action list is not a thing yet — G-C1** |
| P12 | General-purpose LLMs: prompts general enough that the matter is unidentifiable, **or** professional-level data protection | A, B | `research_tools` includes `general_llms`; `ai_tools`; `tool_grid` | conditional | clause present/absent; depends on the **Definitions** entry (G-B4) |
| P13 | LEGAL RESEARCH — every case confirmed against the source reporter, existence *and* holding | B, O | `research_tools` | ≠ `none` | always present when the firm does AI research; wording unvaried |
| P14 | `[CHECK CASE MANAGEMENT SELECTED — e.g. if Clio, insert the AI part of Clio]` | C | `case_mgmt` | per selected value | **one prepared block per platform.** 11 values incl. `clio`, `mycase`, `practicepanther`, `smokeball`, `filevine`, `actionstep`, `litify`, `rocket_matter`, `cosmolex`, `neos`, `monday`. 🔴 **None exist — G-A2** |
| P15 | All AI-run conflicts checks independently verified | C | 🔴 **no question exists** | — | Katy's Module C Q5 asked this and was never built. **G-Q1** |
| P16 | `[research the specific interoffice communication tool and list its policy]` | H | `comms_platforms` | per selected value | **one prepared block per platform.** 5 values: `teams`, `slack`, `telegram`, `signal`, `email_only`. 🔴 **None exist — G-A3** |

### 2.3 Drafting, translation, filings

| P# | Clause | Module | Question key(s) | Trigger | Varies |
|---|---|---|---|---|---|
| P17 | Consumer or pro tier permitted for template drafting — form only, no client PII | D | `drafting_uses` (`form` / `boilerplate`), `drafting_client_data` | `drafting_uses` ≠ `none` | clause present/absent |
| P18 | Professional-level security required wherever drafting touches client data | D | `drafting_client_data` = `client_data` | conditional | clause present/absent; the stricter branch |
| P19 | Translations reviewed by a competent speaker, always professional-level security | D | `drafting_foreign_language`, `foreign_language_content`, `foreign_languages` | `drafting_foreign_language` = `yes` | clause present/absent; language list is a slot fill |
| P20 | Attorney responsible for local filing rules — format, margins, font, content elements | D | `filing_courts` | always | courts list is an optional slot fill (a transactional firm files with nobody) |
| P21 | Firm complies with court/judge-specific affirmative AI disclosure requirements | E | `court_ai_orders`, `standing_order_check`, `court_cert_template` | `court_ai_orders` ≠ `no` | three-way: `yes` → the duty; `not_sure` → the duty **plus** a check-before-filing instruction; `court_cert_template` = `yes` adds a certification statement template |
| P22 | No attorney practises in an area they would not be competent in without AI | F | — (universal) | always | unvaried. `ai_practice_expansion` = `yes` is a **flag for Katy**, not a clause change |

### 2.4 Review, meetings, people

| P# | Clause | Module | Question key(s) | Trigger | Varies |
|---|---|---|---|---|---|
| P23 | DISCOVERY REVIEW — compliance and independent review | K | `doc_review`, `doc_review_scale` | `doc_review` = `yes` | clause present/absent. `doc_review_scale` currently changes nothing; Katy's note said heavier language at `ediscovery`. **Decision, see §5** |
| P24 | NOTETAKING — insert the firm's choice; `[if UNSURE → action list]` | M | `notetaker_stance`, `notetaker_scope`, `notetaker_tools` | always | three stances → three blocks. 🔴 **There is no `unsure` option on `notetaker_stance`** (`not_permitted` / `all_consent` / `state_law` only), so the bracketed unsure path is unreachable. **G-Q2** |
| P25 | EMPLOYMENT AND HIRING — conforms to local regulation, else engage specific counsel | N | `hiring_ai`, `hiring_states` | always (stronger if `hiring_ai` = `yes`) | states list is a slot fill; Katy's own rule is "we cannot provide a standard policy", so this routes to counsel |
| P26 | DISCIPLINE — `[insert discipline actions]` `[insert person in charge]` | S | `discipline` | always | 🔴 **Two slots, one question.** `discipline` is a single longtext. Katy's Module S had two questions and the second (who has enforcement authority) was never built. **G-Q3** |
| P27 | CLIENT USE OF AI — insert the firm's stated response | T | `client_ai`, `client_ai_approach` | `client_ai` = `yes` | slot fill from the longtext. Katy's Module T also had tone/stance and "include safe example questions"; neither built. **G-Q4** |
| P28 | CLIENT BILLING — `[if billing for AI → disclose scope and cost at hiring]` | P | `bill_ai_costs` | `yes` | clause present/absent |
| P29 | VENDOR BREACH — `[STAFF IDENTIFIED IN INTAKE]` notified immediately | I | `vendor_security_contact`, `vendor_incident_protocol` | always | slot fill. `vendor_incident_protocol` = `no` is the **gap Katy said to flag rather than paper over** |

### 2.5 Method, money, records

| P# | Clause | Module | Question key(s) | Trigger | Varies |
|---|---|---|---|---|---|
| P30 | BRAINSTORMING — professional-level security only | J | `brainstorming`, `brainstorming_tier` | `brainstorming` = `yes` | clause present/absent. `brainstorming_tier` = `consumer_tier` is a **compliance gap to flag**, per Katy's own note |
| P31 | SUMMARIZING / DOCUMENT REVIEW — supplement, never a replacement | K | `doc_review` | `yes` | clause present/absent. Overlaps P23 — see §5 |
| P32 | TECHNOLOGY ASSISTED REVIEW — methodology documented, disclosed if required | L | `tar` | `yes` | clause present/absent |
| P33 | DISCLOSURE TO CLIENTS — required if `[research the situations]` | P, D | `bill_ai_costs`, `drafting_uses` includes `substantive` | conditional | 🔴 **The situations list is unwritten.** Part 2's Disclosure prose is the raw material. **G-B3** |
| P34 | Firm never bills for hours not actually spent | Q | `billing_models`, `ai_time_adjustment` | always | `ai_time_adjustment` = `no` is a **policy gap requiring a firm decision** (Katy's words), not boilerplate |
| P35 | MALPRACTICE INSURANCE — `[action list: check carrier requirements]` + comply with disclosure duties | R | `carrier_notified` | always | `not_sure` → action list. Katy's Module R Q2 (AI-specific exclusions or riders) was never built. **G-Q5** |
| P36 | RECORDKEEPING — substantive case-specific research preserved in the client file as work product | U | `retain_prompts`, `retention_schedule` | always | schedule is a slot fill when `retain_prompts` = `yes` |
| P37 | ADVERTISING — AI-generated advertising independently reviewed for compliance | V | `ai_marketing`, `marketing_review` | `ai_marketing` = `yes` | clause present/absent; `marketing_review` = `no` is a flag |
| P38 | DEFINITIONS — "Professional level of data protection: API, Claude Enterprise, ..[finish this list]" | — | — | always | 🔴 **Katy left it unfinished in the source.** P12, P18, P19 and P30 all depend on it. **G-B4** |

---

## 3. Part 2 — the library, and where each block lands

Part 2 is prose. Most of it is unconditional and belongs in the spine at a position Katy has to
choose. Listed here with the clause it sits nearest and whether an answer touches it.

| Part 2 block | Nearest spine position | Conditional? |
|---|---|---|
| Preamble ("AI is a tool, in some cases treated like a staff member") | before P1 body | no |
| Competency (firm cannot take a matter it could not handle without AI) | P22 | no |
| Every attorney personally reviews every filing before signing | P20 | no |
| STAFF COMPETENCY (training + attestation) | P4 | scales on non-attorney headcount |
| Confidentiality (reasonable efforts; cloud is not prohibited) | before P9 | no |
| No-training requirement for every tool touching client data | P10/P12 | reads `tool_grid.noTraining` |
| Third-party vendor factors (experience, reputation, stability, TOS, termination) | P10 | 🔴 only `noTraining` is asked — **G-Q6** |
| Shrinkwrap / clickwrap caution | with the above | no |
| Interoffice communications | P16 | per `comms_platforms` |
| Drafting — form / content / boilerplate | P17 | per `drafting_uses` |
| "Attorney may not use a tool they do not understand" | P17 | no |
| Brainstorming — local, API or commercial licence, no training | P30 | per `brainstorming_tier` |
| Summarizing — can be wrong, can miss items | P31 | no |
| AI Notetakers + the Iurix non-assurance note | P24 | per `notetaker_stance` |
| Employment decisions ("we cannot provide a standard policy") | P25 | per `hiring_ai` |
| **AUTOMATIONS** (firm-built and third-party, local execution, API only) | 🔴 **no P# — absent from Part 1** | **G-Q7: no question asks about automations at all** |
| **Hallucinations** (verify from source; no defence in relying on another; duty to correct) | 🔴 near P13, but Part 1 has only the research half | no |
| Disclosure to clients (the full reasoning) | P33 | source for G-B3 |
| Legal research is a distinct class; firm admin approves the platform | P9/P13 | 🔴 "firm admin approves" has no question — part of **G-Q8** |
| Billing | P34 | per `billing_models` |
| Discipline | P26 | slot fill |
| Client use of AI | P27 | slot fill |
| **Approved vs non-approved tools** | 🔴 **no P# — absent from Part 1.** This is Module W | **G-Q8** |
| Advertising and marketing (artwork, AI-directed marketing, social posts) | P37 | per `ai_marketing` |
| Malpractice insurance | P35 | per `carrier_notified` |
| **Foreign language output** | P19 | present in both, consistent |
| "Give examples" — safe chat questions | P27 or P12 | Katy's Module T Q3 wanted this optional. **G-Q4** |

---

## 4. Questions that are built and have no clause to feed

Not defects. Recorded so nobody hunts for a slot that was never meant to exist.

| Key | Module | Why it exists |
|---|---|---|
| `ai_practice_expansion` | F | Katy: "flag for a human conversation". Goes to her review, not the policy |
| `cle_process` | F | Tailors the Staff Competency block; no dedicated clause |
| `prior_ai_error` | O | Katy: "handled separately from the template" |
| `doc_review_scale` | K | Intended to weight P23/P31 language; currently changes nothing |
| `notetaker_scope` | M | Narrows P24's language; no separate clause |
| `existing_policy_file` | 0 | Human input to P6; Katy reconciles by hand |
| `foreign_languages` | D | Slot fill inside P19 |
| `standing_order_check` | E | Modifies P21 rather than adding a clause |
| `roster` | 0 | Drives P4's scaling, and everything outside the policy |

---

## 5. Overlaps and duplications to resolve before writing the engine

1. **P23 and P31 are the same subject.** "DISCOVERY REVIEW" and "SUMMARIZING AND DOCUMENT REVIEW"
   both fire on `doc_review` = `yes` and both say human review is not replaced. One clause, or two
   with a stated difference.
2. **P13 and Part 2's LEGAL RESEARCH and Part 2's Hallucinations all say "verify from the source
   reporter."** Three statements of one rule. Pick the canonical one; the others cross-reference.
3. **P12 and P18/P30 all invoke "professional level of data protection"** and all three break if
   G-B4 stays unfinished.
4. **P2 lists jurisdictions but cites no jurisdiction-specific guidance.** Katy's Section 0 note
   said jurisdiction "drives which state bar AI ethics guidance to cite". Today it is a slot fill
   only. See G-B1.

---

## 6. GAPS — what is missing, grouped by who can close it

### Group A — prepared text keyed to an option list (Katy, or research)

| ID | What is missing | Volume |
|---|---|---|
| **G-A1** | A policy block per **legal research tool** (P9) | 6 blocks |
| **G-A2** | A policy block per **case management platform** and its AI feature (P14) | 11 blocks |
| **G-A3** | A policy block per **interoffice communication tool** (P16) | 5 blocks |

These are the assembler's whole reason to exist and it cannot ship without them. Each of Katy's
brackets literally says "research the specifics".

### Group B — content Katy left unfinished in her own draft

| ID | What is missing | Blocks which clause |
|---|---|---|
| **G-B0** | 🔴 **The operative policy draft is not in the committed copy.** Verified 2026-08-31 by diffing `.planning/AI-Policy-Research-2026-08-20.txt` (on `main`) against Katy's full `.md`: the committed `.txt` carries the module list, the reference prose, the ethics-opinion catalogue **and the complete 16-term glossary** — it is missing **exactly one thing**, the `[FIRM NAME]` operative draft with the bracketed slots (`ARTIFICIAL INTELLIGENCE POLICY FOR`, `STATES OR JURISDICTIONS LISTED`, `VENDOR BREACH` all return 0 hits). That draft lives only in Max's 2026-08-31 paste and in `~/Downloads/AI-Policy-Research-2026-08-20.md`. Given the 2026-08-04 legal drafts that never reached disk and are gone, commit the `.md` | the spine is a document the repo does not hold |
| **G-B1** | ⏸ **DEFERRED to post-v1 (Max, 2026-08-31).** Per-jurisdiction bar guidance. See §7 D5 for what this costs and why it costs little | nothing in v1. P2 stays a slot fill |
| **G-B2** | **The interleave order** — where each Part 2 block sits in the Part 1 spine | the entire output structure |
| **G-B3** | **The "situations requiring client disclosure" list** (P33) | P33 |
| **G-B4** | **ONE Definitions entry: "Professional level of data protection: API, Claude Enterpirse, ..[finish this list]".** ⚠️ **Corrected 2026-08-31** after reading Katy's full `.md`: §23 is NOT empty. She has a finished **16-term glossary**, each entry sourced (Generative AI, Extractive/non-generative AI, Large language model, Agentic AI, AI agents, Assistive tool, Hallucination, Inference, Training, Fine-tuning, Retrieval-augmented generation, Knowledge cutoff, Non-determinism, Prompt injection, Speech-to-text/diarization, Shadow AI). The hole is a single missing entry, not a section | P12, P18, P19, P30 |
| **G-B5** | **Automations** and **Approved vs non-approved tools** exist in Part 2 with no place in Part 1 | see G-Q7, G-Q8 |

### Group C — engine primitives that do not exist in the schema

| ID | What is missing | Evidence |
|---|---|---|
| **G-C1** | **The ACTION ITEM LIST.** Katy's template writes to it three times (P11 case-management unsure, P24 notetaker unsure, P35 malpractice). ✅ **D2: it is a separate deliverable.** Nothing in migrations `0028`–`0030` holds it | grep of the migrations: `intake_sessions`, `intake_answers`, `intake_sensitive`, `intake_uploads`. No policy or action-item table exists |
| **G-C2** | **Somewhere to store a generated policy** — and, per D2, an action item list beside it. `policy_delivered_at` is a timestamp set by hand. There is no draft, no version, no artifact | `lib/intake/review.ts:185`, `app/intake/_components/intake-review.tsx:45` |
| **G-C3** | **A module text store.** ✅ **D1: versioned files in the repo**, under `lib/policy/`. Format still to define | nothing in `lib/intake/` today |

### Group D — questions Katy specified that were never built

Each of these is a clause in the policy with no answer to drive it.

| ID | Missing question | Module | Clause it strands |
|---|---|---|---|
| **G-Q1** | Does the platform run AI conflicts checks, and is the output independently verified? | C | P15 |
| **G-Q2** | `not sure` as a fourth option on `notetaker_stance` | M | P24's bracketed unsure path is unreachable |
| **G-Q3** | Who has authority to enforce this policy and decide consequences? | S | P26's second slot |
| **G-Q4** | Tone toward client AI use, and whether to include the "safe questions" examples | T | P27, and Part 2's "Give examples" |
| **G-Q5** | Does the malpractice policy carry AI-specific exclusions or riders? | R | P35 |
| **G-Q6** | Vendor TOS reviewed for security certifications and for data handling on termination | H | Part 2's third-party vendor factors. `tool_grid` asks `noTraining` only |
| **G-Q7** | Does the firm build or use automations? | — | Part 2's AUTOMATIONS block has no trigger |
| **G-Q8** | Who may approve a new tool, and by what process? | W | Part 2's approved-vs-non-approved section, and the standing "Module W" hole already flagged in `intake-spec.md` |
| **G-Q9** | Who trains staff and collects attestations, and on what renewal cadence? | G | P4's detail. Only `contract_attorneys` was built from Module G |

✅ **All nine are approved for build (Max, 2026-08-31).**

⚠️ The cost, recorded because it was accepted rather than overlooked: a firm that skips every
optional module answers **29** required questions today, against Katy's "10–15 after gating" target
which the 08-28 session already recorded as unreachable. Six of the nine gate behind an existing
answer (G-Q1 behind `case_mgmt` ≠ `none`, G-Q5 behind `carrier_notified`, G-Q6 behind `tool_grid`,
G-Q4 behind `client_ai`, G-Q2 is an added option not an added question, G-Q3 rides with
`discipline`). **G-Q7 (automations), G-Q8 (tool approval) and G-Q9 (training owner and attestation
cadence) are new always-on questions**, so the required floor moves 29 → 32.

---

## 7. Decisions — taken 2026-08-31 (Max, desktop)

| # | Decision | Consequence |
|---|---|---|
| **D1** | **Prepared module text lives in versioned files in the repo**, not a database table | The assembler stays a pure function over fixtures and is unit-testable. Changing a clause needs a deploy. No admin editor UI to build. Revisit if the text starts changing weekly |
| **D2** | **The ACTION ITEM LIST is a separate deliverable**, not an appendix | Matches Katy's own bracket, "add to action item list APART FROM POLICY". The adopted policy never contains a list of what the firm has not done. Two output artifacts, so G-C2 must hold both |
| **D3** | **All nine missing questions (G-Q1 … G-Q9) get built** | Nothing Katy specified is dropped. Required-question floor 29 → 32. `notetaker_stance` gains a fourth option and the P24 unsure branch becomes reachable |
| **D4** | **Benchmark Part 1 against the five published model policies BEFORE drafting the interleave order** | Finds what Part 1 is missing before an order is locked that would then need rework. Sources named in §7.1 |
| **D5** | ⏸ **No per-state jurisdiction guidance in v1.** Added later | Costs almost nothing now, because Katy's template already routes both state-sensitive clauses to general language: P24 says "per the consent law of the state involved" and P25 says consult separate compliance counsel. Neither is *wrong* without state data, only less specific. `jurisdictions` still fills P2. No Governing Authority section, no per-state overrides, no `allPartyConsent` / `aiHiringLaw` flags |

**Still open, and now the only blocking item: G-B2, the interleave order.** Max, 2026-08-31:
*"I have asked katy. We will solve ourselves. Nothing is blocked on Katy, it is blocked on me."*
Sequence is D4 first, then the interleave draft, then Max ratifies.

### 7.1 The benchmark set (D4)

Five published model policies and guidance packages, all named in Katy's own research doc. Each is
both a competitor and a section-list to diff our 38 clauses against.

| Source | Why it is in the set |
|---|---|
| **Virginia Bar Association, "Model Artificial Intelligence Policy for Law Firms" (2024)** | Katy's note calls it the premier state-level model. Adaptable provisions for AI literacy, data privacy, attorney oversight, vendor agreement analysis, client consent, billing transparency |
| **State Bar of Texas, "Law Firm Acceptable Use Policy for Artificial Intelligence" (2025)** | Inside the official Texas AI Toolkit. Professional judgment, **tool approval**, verification standards, vendor diligence, monitoring and enforcement. Directly relevant to G-Q8 and P26 |
| **Illinois ARDC, "Implementing Generative AI for Illinois Attorneys" (2025)** | A Practice Resource Kit rather than a document: sample client notifications, consent forms, vendor terms-of-use review checklists. Relevant to P33 and G-B3 |
| **ABA, "Sample Artificial Intelligence Risk-Management Policies for Law Firms"** | Five internal policy domains: competency training, AI disclosure mandates, prohibitions on public platforms |
| **State Bar of California, "Practical Guidance for the Use of Generative AI in the Practice of Law" (2026 revision)** | Current implementation standard; addresses agentic AI, and expressly ties written AI policies to Rule 5.1/5.3 supervisory duties |

🔴 **Metal-detector rule applies.** Every title, date and characterisation above is from Katy's
research document and is **unverified**. Confirm each source exists and says what the note claims
before any of it shapes our template.

---

## 8. Sequencing this against what is already blocked

The intake itself is **not in production**. `0028`, `0029` and `0030` have never been applied to
PROD, the `Intake-uploads` bucket exists on staging only, and nothing has shipped since
2026-08-24T19:34:58Z. The assembler consumes intake answers, so nothing built here is observable
end-to-end until that clears. **The content work in §6 Groups A and B does not depend on it and can
run in parallel.**

---

## 9. Benchmark results (D4) — 2026-08-31

**Headline: our template is already far more thorough than the State Bar of Texas sample policy.**
38 clauses against 7 sections. The gaps below are **categorical, not depth** — framing sections we
never wrote, and two substantive duties nobody in our set has raised.

### 9.1 What was actually read

| Source | Status |
|---|---|
| **State Bar of Texas, "Law Firm Acceptable Use Policy for AI" (rev. 2025-05-27)** | ✅ **Full text read.** 7 sections, 4 pages |
| **VBA Model AI Policy for Law Firms (v1.0, May 2024)** | ⚠️ **7 sections confirmed via secondary sources.** The VBA CDN returns 403 to both WebFetch and curl. Get the PDF by hand |
| **ABA "Sample Artificial Intelligence Risk-Management Policies for Law Firms"** | 🔴 **Could not be found under that title.** Katy's doc lists it as model-policy source #1. ABA **Formal Opinion 512** is real and is what is usually cited. Treat the sample-policies document as unverified until someone produces a URL |
| **Illinois ARDC, "Implementing Generative AI for Illinois Attorneys"** | ⚠️ **Exists** at `iardc.org/Files/Implementing-AI-Guide/` but is a 62-page paginated viewer whose sub-pages 404 when fetched directly. Needs the PDF or manual review. Katy rates this the most valuable of the five |
| **State Bar of California Practical Guidance (2026 rev.)** | ⬜ not examined |

### 9.2 Gaps found — Texas

| # | What Texas has that we do not | Where it would go |
|---|---|---|
| **B1** | A **Purpose** section | before P1 |
| **B2** | A **Scope** section. Texas scopes by *tool and activity*: all AI tools proprietary or third-party, used in legal practice, **administrative operations**, or client services. **We scope only by person** (P4, P5) and never say the policy reaches admin and operations | after P1 |
| **B3** | **Prohibited Uses** as a category. Ours is `prohibited_tools`, a list of *named tools*. Texas prohibits *uses*: legal advice or filings without attorney review; confidential data into unapproved systems; predictive analytics on case outcomes without disclaimers; anything violating law or ethics rules | new section near P7 |
| **B4** | 🔴 **Bias and discrimination.** Named as an ethical duty. **It appears nowhere in our 38 clauses and nowhere in Katy's Part 2** | new clause |
| **B5** | 🔴 **Transparency where AI output could be mistaken for human work**, specifically client-facing chatbots. We have nothing on chatbots. Corroborated independently: Florida Ethics Op. 24-1 in Katy's own catalogue requires client-facing chatbots to identify as programs, not lawyers or staff | near P33 |
| **B6** | 🔴 **Practice-area modules** — six of them: healthcare/PHI, insurance, criminal, family, business/corporate, finance/tax. **This collides head-on with a decision already taken:** practice areas were CUT from the intake (Katy, 2026-08-26; recorded in `lib/intake/questions.ts`). See §9.4 |
| **B7** | **Internal incident reporting** — AI misuse reported promptly to a named role. Ours has vendor breach (P29) and discipline (P26) but no internal reporting path | with P26 |
| **B8** | A **Policy Updates** section — how the policy is maintained, users notified, retraining triggered. P4 carries annual renewal; nothing says how the document itself is kept current | end |
| **B9** | An **Acknowledgment and signature block**. Largely covered by the Iurix attestation, but the document itself does not close with one | end |

### 9.3 Gaps found — VBA

| # | What VBA has | Bearing on our build |
|---|---|---|
| **B10** | **Tool Selection & Approval is its section 1** | ✅ Confirms **G-Q8 / Module W is not optional.** Both benchmarks lead with tool approval; our Part 1 has no clause for it at all |
| **B11** | Enterprise controls named concretely: **SSO, MFA, contractual confidentiality, no training on firm or client data** | Gives **G-Q6** its shape. `tool_grid` asks only about no-training, which is one of four |
| **B12** | **Do not bill clients for general AI training or tool subscriptions absent agreement** | Distinct from P28 (billing AI costs) and P34 (billing time). Corroborated by ABA Formal Op. 512: general AI training time is lawyer overhead |

### 9.4 🔴 The practice-area collision — needs Max

Texas gates six practice-area modules. Katy **cut practice areas from the intake on 2026-08-26**
on the "every question earns its place" test. Three ways out, and it is a decision, not a finding:

1. **Reinstate a practice-area question** and gate Texas-style modules on it. Reverses Katy's cut and
   adds a required question.
2. **Derive it from answers we already hold.** `regulatory_regimes` = `hipaa` already implies health
   data; `tar` and `filing_courts` imply litigation. Covers maybe half the six and invents nothing.
3. **Skip practice-area modules in v1.** Defensible: they are Texas's *optional* section, and our
   confidentiality and verification clauses reach the same conduct less specifically.

### 9.5 What this does not change

Nothing found contradicts a clause we already have. Every gap is additive. The 38 clauses stand.

---

## 10. Decision D6 — the benchmark gaps go to the guidance layer

**Max, 2026-08-31:** *"the stuff you mentioned that is additive and would make the policy better. i
believe that can also go into the guidance part. so lets leave that on hold as well."*

**All twelve §9 gaps (B1–B12) and the §9.4 practice-area collision are DEFERRED**, to the same
guidance layer as the per-state material in D5. None of them enter the v1 policy engine.

This is coherent rather than a punt: every one of them is *additive*, none contradicts a clause we
already have (§9.5), and each is closer to "here is how to think about this" than to "here is what
your firm has decided", which is the line between the guidance layer and the generated policy.

**⚠️ Two of them are worth revisiting when the guidance layer is scoped**, because they are duties
rather than advice, and a firm can be wrong about them rather than merely uninformed:

- **B4, bias and discrimination.** Absent from our 38 clauses *and* from Katy's Part 2. A firm
  screening applicants or scoring anything with AI has a real exposure our policy is silent on.
  Partly reached today by P25, which routes hiring to separate compliance counsel.
- **B5, client-facing chatbots.** Florida Ethics Op. 24-1 requires them to identify as programs.
  A firm running an intake chatbot is out of compliance and our policy never mentions it.

Neither blocks v1. Both should be first in the guidance queue.

**Still live for v1, unchanged:** G-A1/A2/A3 (per-tool, per-platform, per-comms blocks), G-B3
(disclosure situations), G-B4 (the Definitions list), G-Q1–G-Q9 (all nine questions), and
G-C1/C2/C3 (the engine primitives). Those are Part 1's own brackets and its own schema. They are
not additive; the policy does not assemble without them.

---

## 11. The interleave order (G-B2) — ✅ RATIFIED by Max, 2026-08-31

Drafted 2026-08-31 from the two halves as they stand, post-D5 and post-D6, and **approved by Max
the same day**. **This is the output structure of the assembler.** Every one of Part 1's 38 clauses
and every Part 2 block is placed; nothing is dropped.

**What ratification covered:** which section each rule lives in, and the order. **Section names are
cosmetic and may change at any time without reopening this.**

**Four fixes applied before approval**, from Max's audit challenge:
1. §1 was "Preamble and Purpose" — *Purpose* was smuggled in from deferred benchmark gap B1. **Dropped.**
2. §2 was "Scope and Governing Authority" — both halves of that name were deferred material (B2 and
   D5). **Renamed "Application".**
3. Old §10 "Court Disclosure and Certification" was a section for **one clause**. **Merged into §9**,
   already the filings section and already adjacent in Part 1.
4. §6 "Platforms and Systems" is a grouping with no source heading behind it. **Kept, explicitly approved.**

**Provenance: 21 of the 22 sections are a heading Katy wrote.** Part 2 carries 21 named headings;
Part 1 adds four topics that appear in no Part 2 heading (RECORDKEEPING, VENDOR BREACH, DEFINITIONS,
court disclosure). That is 25 natural sections in the source, compressed to 22 by three merges —
Confidentiality + Third party software into §5, Drafting + Foreign language output into §9,
Disclosure + Client Use of AI + Give examples into §14. **The spine compresses the source; it does
not add to it.**

### 11.1 The ordering principle

**General duties first, then the tools, then the activities in the order a matter moves through a
firm, then the firm's own housekeeping, then definitions.**

That is the whole rule. Ratify the principle and the 23 sections follow from it; argue with a
section and it is a local move, not a rewrite.

Three consequences worth naming, because they are choices rather than deductions:

1. **Confidentiality and approved tools come before any activity.** A firm cannot read the drafting
   or research sections correctly without first knowing which tools it may use and with what data.
   Katy's Part 2 orders it the same way.
2. **Verification gets its own section** rather than being repeated. §5 of this document flagged
   that the source-reporter rule is currently stated three times. It is stated once, in §8, and the
   research and drafting sections point at it.
3. **Discipline is last before Definitions**, not buried mid-document. It is what makes the rest
   enforceable, and a firm reading its own policy should reach it having read what it enforces.

### 11.2 The spine

| § | Section | Sources | Condition |
|---|---|---|---|
| 1 | **Preamble** | Part 2 *Preamble* | always |
| 2 | **Application** | P1 title (`firm_name`), P2 (`jurisdictions`), P3 (`regulatory_regimes`), P5 (`contract_attorneys`), P6 (`existing_policy`) | P1/P2 always; P3/P5/P6 conditional |
| 3 | **Competency** | P22, Part 2 *Competency*, Part 2 *every attorney reviews every filing before signing*, Part 2 *may not use a tool they do not understand* | always |
| 4 | **Staff Training and Attestation** | P4 (`roster`), Part 2 *STAFF COMPETENCY*, **G-Q9** | always; scales at zero non-attorney staff |
| 5 | **Approved Tools and Data Protection** | Part 2 *Confidentiality*, Part 2 *Third party software*, Part 2 *shrinkwrap / clickwrap*, Part 2 *approved vs non-approved tools*, P7 (`prohibited_tools`), P8 (`personal_devices`), P12 (general LLMs), **G-Q6**, **G-Q8** | mixed |
| 6 | **Platforms and Systems** *(grouping, no source heading — approved)* | P10, P14 (`case_mgmt`), P11 → **action list**, P15 (**G-Q1**), P16 (`comms_platforms`) | `case_mgmt` ≠ `none`; comms always |
| 7 | **Legal Research** | Part 2 *LEGAL RESEARCH*, P9 (`research_tools`), P13 | `research_tools` ≠ `none` |
| 8 | **Verification and Hallucinations** | Part 2 *Hallucinations*, **the canonical source-reporter rule** | always. §7 and §9 cross-reference it, never restate it |
| 9 | **Drafting, Translation and Filings** | Part 2 *Drafting*, P17, P18, P19 + Part 2 *Foreign language output*, P20 (`filing_courts`), **P21** (`court_ai_orders`, `standing_order_check`, `court_cert_template`) | `drafting_uses` ≠ `none`; P20 always; P21 when `court_ai_orders` ≠ `no` |
| 10 | **Brainstorming** | P30, Part 2 *Brainstorming* | `brainstorming` = `yes` |
| 11 | **Document Review and Summarizing** | **P23 + P31 merged**, Part 2 *Summarizing*, P32 (`tar`) | `doc_review` = `yes`; P32 on `tar` |
| 12 | **Meetings and AI Notetakers** | P24, Part 2 *AI Notetakers* incl. the Iurix non-assurance note | always; three stances plus new `not_sure` (**G-Q2**) |
| 13 | **Automations** | Part 2 *AUTOMATIONS*, **G-Q7** | `automations` = `yes` |
| 14 | **Client Disclosure and Client Use of AI** | Part 2 *Disclosure*, P33 (**G-B3**), P27, Part 2 *POLICY REGARDING CLIENT USE OF AI*, Part 2 *Give examples* (**G-Q4**) | mixed |
| 15 | **Billing** | P28 (`bill_ai_costs`), P34, Part 2 *Billing* | always |
| 16 | **Records and Retention** | P36 (`retain_prompts`, `retention_schedule`) | always |
| 17 | **Employment and Hiring** | P25, Part 2 *Employment decisions* | always; stronger on `hiring_ai` = `yes` |
| 18 | **Advertising and Marketing** | P37, Part 2 *Advertising and Marketing* | `ai_marketing` = `yes` |
| 19 | **Malpractice Insurance** | P35 (**G-Q5**), Part 2 *Malpractice insurance* | always; `not_sure` → action list |
| 20 | **Vendor Incidents** | P29 | always |
| 21 | **Enforcement and Discipline** | P26 (**G-Q3**), Part 2 *Discipline* | always |
| 22 | **Definitions** | P38 (**G-B4**) — operative terms only, **not** the 16-term glossary (D7) | always |

**Separate deliverable, per D2: the ACTION ITEM LIST.** Fed by §6 (P11 `case_mgmt_ai` = `not_sure`),
§12 (P24 `notetaker_stance` = `not_sure`) and §19 (P35 `carrier_notified` = `not_sure`).

### 11.3 What ratifying this settles

- The two duplications in §5 are resolved: **P23 + P31 become one section** (§11), and the
  source-reporter rule is **stated once** in §8.
- Every approved new question has a home: G-Q1 §6, G-Q2 §12, G-Q3 §21, G-Q4 §14, G-Q5 §19,
  G-Q6 §5, G-Q7 §13, G-Q8 §5, G-Q9 §4.
- Section count is **22**, with the action item list as a separate deliverable (D2), against
  Texas's 7 and VBA's 7.

### 11.4 What it does not settle

- **G-B4, one Definitions entry.** ⚠️ **Downgraded 2026-08-31.** §22 is not a hole: Katy's glossary
  supplies **16 finished, sourced entries** and is the section's content. What is missing is the
  single entry "professional level of data protection", which §5, §9 and §10 cross-reference by
  name — Katy's own P12 says "(DEFINITIONS AT END)". One line, not a section.
- **G-B3, the disclosure situations.** §15 has the reasoning from Part 2 but not the list.
- **G-A1/A2/A3.** §6 and §7 have slots with nothing in them. ✅ **Now covered by
  `.planning/POLICY-BLOCKS-RESEARCH.md`** and its pre-seeded `policy-blocks.csv`, plus the
  named-generic fallback that makes an unresearched row harmless.

---

## 12. Correction D7 — the glossary is not policy, and §23 shrinks

**Max, 2026-08-31:** *"the definitions section i dont think is itself a part of the policy or do u?"*

**He is right about the glossary and it changes §23.** Two different objects were conflated in the
2026-08-31 entry above; separating them:

| | `DEFINITIONS:` — **line 340** | `# Glossary` — **line 648** |
|---|---|---|
| Where it sits | **inside the ACTUAL POLICY block**, between ADVERTISING and "Sections:" | a **top-level H1 of the research document**, after the ethics opinions and the Rule 1.1 marketing note |
| Cross-referenced from the policy? | **Yes.** P12: *"a professional level of data protection **(DEFINITIONS AT END)**"* | No. Anchor-linked from a research note at the top: *"Glossary at the bottom."* |
| Content | one entry, unfinished: *"Professional level of data protection: API, Claude Enterpirse, ..[finish this list]"* | 16 AI-literacy terms, individually sourced: agentic AI, RAG, knowledge cutoff, non-determinism, diarization, shadow AI … |
| Whose it is | Katy's | **Max wrote it** (2026-08-31: *"i wrote that glossary and its purely so katy can understand the terms better"*) |
| What it is for | telling a firm what a term in its own policy means | **giving Max and Katy a shared vocabulary so they can polish the policy** — Katy was not fluent in some of the terms, the tiers among them |
| Became its own asset? | no | **yes** — `AI-Terms-Glossary-2026-08-22.docx` / `.csv`, two days later |
| **Verdict** | ✅ **stays as §22** | 📖 **an authoring aid, not a deliverable** |

**§22 is therefore an operative-terms block of roughly three entries, not a glossary.** The earlier
claim that the 16-term glossary "supplies §23's content" is withdrawn. A firm's AI policy has no
reason to define "retrieval-augmented generation"; it has every reason to define the term its own
data-security rule turns on.

⚠️ **The glossary is not a deliverable of any kind — it is scaffolding for authoring.** It does not
ship to firms, it does not go in the guidance layer, and it is not behind D6. It is the reference
Max and Katy use to settle policy wording between themselves. §12.1 below is exactly the kind of
thing it exists to resolve.

### 12.1 🔴 The tier inconsistency this exposes

The policy speaks in **tiers**. The intake **stopped collecting tiers on 2026-08-28**.

| Where | Language |
|---|---|
| P17 | *"**Consumer level** pr **pro level** may be used for drafting of templates…"* |
| P18 | *"**Professional level security** is required for any drafting that… client specific data."* |
| Part 2, approved tools | *"Non-approved tools are **chatbox consumer versions with training on**."* |
| `lib/intake/types.ts` | the tier column was **removed** (Max, 2026-08-28). *"tier was only ever a PROXY… `noTraining` asks that outright — from the agreement, which is the only place the answer actually lives. A consumer tier with a signed no-training addendum is compliant and an enterprise tier without one is not."* |

**P17 and P18 branch on a distinction the intake no longer captures.** The only tier-shaped signal
we hold is `tool_grid[].noTraining` ∈ `yes` / `no` / `unknown`.

**Proposed resolution — one decision, closes two gaps at once.** Define *professional level of data
protection* in §23 as **the no-training agreement**, plus whatever else Max wants in it, and rewrite
P17/P18 to branch on `noTraining` rather than on tier. That:

- finishes Katy's unfinished line (G-B4),
- makes the policy consistent with the 2026-08-28 tier removal rather than contradicting it,
- and removes the last place where the assembler would need data the intake does not collect.

✅ **Settled by Max, 2026-08-31:** *"then lets list them as examples not an authoritative absolute
list. include the rule."*

**§22 is a rule followed by non-exhaustive examples.** Roughly: *professional level of data
protection means any tool used under an agreement that the vendor will not train on the firm's data;
examples include API access and Claude Enterprise.* The rule decides, the examples illustrate, and a
new vendor never requires reopening the policy. It also aligns the policy with the 2026-08-28 tier
removal rather than contradicting it (§12.1): **P17 and P18 branch on `noTraining`, not on tier.**

---

## 13. D8 — Katy's 2026-08-31 reversals. AUTHORITATIVE. Not yet built.

Source: the Max/Katy conversation of 2026-08-31, 06:12–06:47. **Max: "our conversation, the one
between me and katy, is authoritative and the final say so."** Locked, **do not build yet.**

| # | Katy's decision | Her words |
|---|---|---|
| 1 | **Answers are retained**, not purged | *"We should save the previous responses so they can easily redo without typing in everything from scratch"* — an explicit reversal of her own earlier position |
| 2 | **Answers stay editable INDEFINITELY**, before and after the policy is delivered | *"they can update their answers indefinitely to update the policy as they aquire more information, or change their mind about free text items"* |
| 3 | **Retention = the life of the paid subscription + a renewal grace period** | *"It should be as long as they have a paid subscription"*; grace added for slow renewals |
| 4 | **Retention is a renewal incentive and must be said out loud** | *"if they renew then it remains active. So that is an incentive to renew so they dont lose the work they progressed in making the policy"* |
| 5 | **Output is `.docx`, never a static PDF** | so the firm can edit it in a word processor, or *"putting into their own AI asking for more cusomtizations"* |
| 6 | **Policy + action list, from the intake** | *"the intake can create a customized policy and with it an action list to investigate"* — confirms D2 |
| 7 | Katy's **content is finished**; doc last edited Fri 2026-08-28 | Max confirmed it is the same file as `AI-Policy-Research-2026-08-20.md` |

### 13.1 🔴 What this breaks in shipped code — fix in a later batch

| Conflict | Where |
|---|---|
| `canReopen(state)` returns true **only** for `'submitted'`. A delivered policy locks the intake forever. **D8-2 requires reopen after delivery.** | `lib/intake/review.ts` |
| A `'purged'` state exists whose on-screen copy reads *"Your answers were deleted after your policy was delivered"*. **D8-1 kills the purge.** | `app/intake/_components/intake-review.tsx:107`, `intakeStateOf()` |
| No retention clock exists. D8-3 needs one tied to subscription state plus grace. | new |
| No `.docx` renderer. The assembler emits text blocks. | `lib/policy/assemble.ts` |

**Migration `0030` is NOT wasted.** It exists so Katy knows when answers changed under her while
drafting; `reopened_count` still does that. Only the *lock* moves, not the *record*.

### 13.2 🔴 Carried, must not be lost again

**Privacy §2 and §5 still have no category covering intake answers**, open since the intake's first
batch. D8-3 and D8-4 now have to be disclosed there. **`POLICY-BLOCKS-RESEARCH.md` also needs a
note that retention is subscription-scoped.** Katy's copy, not ours.

### 13.3 Open for Katy — from the 2026-08-31 assembler batch

`lib/policy/vendor-block.ts` is the **only** place in `lib/policy` where text is generated rather
than transcribed. Sanctioned by the research brief §8, but 20 blocks of unreviewed language. The
consequential part: for the **15 `unclear` vendors** the generated clause bars client-confidential
information from the platform until the firm gets written no-training confirmation. That follows
from Katy's own baseline, but it is a reading of her rule, not her words. **Show her before it ships.**
