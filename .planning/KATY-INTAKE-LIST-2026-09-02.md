# Katy's definitive intake list — 2026-09-02

**Source of record.** Katy supplied this on **2026-09-02** and said it is the entire
universe of questions her policy needs. It is the sole authority behind the
retirement of 22 built questions in `lib/intake/branching.ts` (`RETIRED_KEYS`) and
the addition of `firm_size` in `lib/intake/questions.ts`.

**Provenance:** received from Katy 2026-09-02; committed to the repo 2026-09-03 by
Max, pasted verbatim into desktop. It had lived nowhere in the repo until then, cited
only inside two code comments.

**Precedence:** this file outranks `.planning/intake-spec.md` and the intake
question list in `AI-Policy-Research-2026-08-20.md` for **what the intake asks**.
Her 2026-08-20 research doc remains the authority for policy clause text and the
module structure. Where the two disagree about a question, this file wins.

> ⚠️ **Do not edit the block below.** It is Katy's text character for character,
> her typos included (`Lexis+ AL`, `platfor`, `Assited`, `aquired`, `Enterpirse`
> elsewhere). Corrections, readings and open questions go in the section
> underneath, never inside the quote. A transcription that gets tidied stops being
> evidence of what she actually asked for.

---

## Her text, verbatim

```
Intake Questions:

What is the name of the firm to be accredited?

What is the size of the firm (drop down)
1 attorney
2-5 attorneys
6 to 20
More than 20

How many non-attorney staff (autopopulate from the subscription)
-Enter their names as they should appear on their certification

What are all US jurisdictions where firm attorneys are licensed
-Autopopulate with Federal matters, and then free text for each states

Does the firm work with CONTRACT or OF COUNSEL attorneys
-Y/N

Does the firm have any current AI policy in place?
-Y/N: (if yes then at end have them upload it to cross reference

What AI tools does the firm use or want to use?
-Drop down with multiple selection available  with "other" free text: ChatGPT, Claude, Gemini, CoCounsel, Westlaw Edge/Lexis+ AI, Harvey, Spellbook, DraftWise, Otter.ai, etc.)

	-If any are selected ask for the tier, drop down for each tool (Eg Enterprise, consumer, Co-work).  Also separately a check for binding agreement not to use data for training for EACH

Does firm want to prohibit any specific tool by name
	-Free text (to be inserted in a module)

Does firm ever allow personal devices or personal (non-firm) AI platform to access any client information?
	-Y/N

Does the firm use a legal research specific AI tool, Eg Lexis+ AL,?
	-Y/N
		-If YES then drop down: CoCounsel, Lexis+ AI, Vincent AI, Ask Practical Law, Westlaw Edge, general LLMs


What are the firm's case management platforms?

* (single select) CoCounsel, Lexis+ AI, Vincent AI, Ask Practical Law, Westlaw Edge, general LLMs
   * Triggers specific policy requirement to check that training is not allowed.
* Are built in AI features currently enabled?
   * yes/no/unsure

			YES or UNSURE triggers the platform requirement specific to that software

(MODULES D, E, F, G, J, O, Q, R, U, V:  leave these out because all of these will always be every policy.  No branching)

What interoffice communication platfor is used (Eg, Teams, Slack, Telegram)
	-Multiselect with "other"option
		-Check privacy and training polices for each
Does the firm handle data subject to additional regulatory regimes beyond state bar rules (HIPAA, GDPR, GLBA, etc.)?
(multi-select/none)
— if any selected, flag that this policy should be reviewed alongside those compliance obligations rather than standing alone

Does firm use AI to review discovery, document review, or summarize long records or videos?
	-Y/N
		-If Yes then ask for approximate scale with 3 or 4 options
		If Yes ask if Technology Assited Review or predictive coding in Discovery
			-if yes add policy language about compliance there.

What does firm want policy to be regarding AI NOTETAKING
	-prohibited
	-Allowed for client meetings
	_allowed for internal staff meetings
	-Allowed when permissible in hearings
	-Allowed when permitted in meetings and consent aquired
		-If anything but NO, ask for the specific Notetaker permitted (free text)

Does the firm want to use AI to screen out potential employment applicants
	-Y/N
		If Yes ask what states/non US potential applicants might be from

Does firm wish to bill clients directly for costs of AI tools
	Y/N
Yes-triggers disclosure duty

How does firm want to handle discipline for staff violations?
	"Unsure" or free text
		-If unsure put message at writing of policy to return to specify in the future

Does firm want to create a policy regarding how to handle clients using AI to "get a second opinion"
	-y/n
		-If yes ask if firm knows how it would like to address
			-if unsure make sure to remind that this needs to be determined when generating policy
```

---

## NOT HER WORDS — gaps between this list and what is built

Recorded 2026-09-03 (Max and desktop), against the 29 live questions in
`lib/intake/questions.ts` with `RETIRED_KEYS` applied. Each row is a difference,
not a bug report: some are deliberate and need her sign-off, some are misses.

| # | Her list | What is built | Status |
|---|---|---|---|
| 1 | Tier per tool (Enterprise, consumer, Co-work) **and separately** a no-training agreement check | `tool_grid` asks only the agreement | **Not built.** Its help string argues the opposite: *"The agreement decides this, not the price tier."* The build contradicts her in customer-facing copy |
| 2 | Notetaking: 5 options (prohibited / client meetings / internal staff meetings / when permissible in hearings / when permitted and consent acquired) | `notetaker_stance` has 2: *"Not permitted at all"* and *"Permitted per the consent law of the state involved"* | **Not built.** Her per-venue distinctions are gone. The build also splits "where are they used" into `notetaker_scope`, which she folded into the stance |
| 3 | Discipline answer may be **"Unsure"**, which plants a reminder to specify at policy-writing time | `discipline` is required longtext, no unsure path | **Not built** |
| 4 | Client-AI: if unsure, remind that this must be determined when generating the policy | `client_ai_approach` is required longtext, no unsure path | **Not built** |
| 5 | Hiring: "what states/**non US** potential applicants might be from" | `hiring_states` is a US states and territories picker | **Not built.** No way to answer non-US |
| 6 | Non-attorney staff count **autopopulated from the subscription**, then names as they should appear on certification | `roster` collects name, email and attorney flag for every person, typed by hand | **Different question.** The build is broader; hers is shorter and derives the count |
| 7 | `doc_review` prompt includes "or **videos**" | Prompt omits it | **Miss**, one word |
| 8 | Research tools gated behind a Y/N ("Does the firm use a legal research specific AI tool") | `research_tools` multi-select asked directly | **Different shape**, low stakes |
| 9 | Exclusion list is **D, E, F, G, J, O, Q, R, U, V** | `RETIRED_KEYS` covers D, E, F, I, J, O, Q, R, U, V | **Module I retired without authority** (`vendor_incident_protocol`). I appears nowhere in her list. `vendor_security_contact` (also module I) was kept, and is also on neither list |

### Two things to take back to Katy

1. **Her case-management options are the research-tools list.** "CoCounsel, Lexis+ AI,
   Vincent AI, Ask Practical Law, Westlaw Edge, general LLMs" are research tools, not
   case or practice management platforms (Clio, MyCase, PracticePanther, Smokeball,
   Filevine). Almost certainly a copy-paste from the question above it. She needs to
   resend that option set.
2. **Module G is excluded and also asked.** She excludes G from branching, then her own
   list asks the module G question (contract or of counsel attorneys). The reading that
   makes both true is that the exclusion means *the clauses are unconditional*, not
   *the question is dropped* — which is not how the code read it. Confirm which she meant
   before any more modules are retired on the strength of that line.

### Standing flag, from the code

`vendor_security_contact` is live and on neither list. Her own vendor-breach clause
carries the slot `{STAFF IDENTIFIED IN INTAKE] shall be notified of the breach
immediately`, filled from this answer. Retiring the question leaves that raw placeholder
in a delivered document. Either the question stays or the clause is reworded. Her call,
flagged 2026-09-02.
