# Policy review, 2026-09-03 — Max and desktop

Working pass over `Iurix-Policy-For-Editing-2026-09-03.docx`, section by section, against
Katy's source (`AI-Policy-Research-2026-08-20.md`) and the assembled output of
`lib/policy/`. Max approved each item in turn; his instruction each time is quoted.

**Status: reached Section 6 and stopped there.** Sections 1 to 5 are settled. Section 6
is mid-discussion and nothing in it is approved.

🔴 **None of this is built.** Every approved sentence below still has to be written into
`lib/policy/blocks/` by terminal. Desktop wrote this record and nothing else.

---

## 1. Approved policy text

### Section 2 — Application. New clause, source line 268

Katy wrote an instruction, not a clause:
`[IF FIRM STATES THAT IT IS SUBJECT TO ADDITIONAL REGULATORY REGIMES LIKE HIPAA< STATE THAT IT WILL COMPLY WITH THE MOST RESTRICTIVE REGIME]`

**Approved text:**

> The firm handles client or personal data subject to **[regimes]**. Where the requirements
> of those regimes differ from this policy, or from one another, the firm and its staff
> shall comply with the most restrictive requirement that applies.

- Slot fills from `regulatory_regimes`.
- Conditional: appears only where at least one regime is selected. A firm answering "None"
  never sees it.
- "or from one another" is load-bearing: a firm under both HIPAA and GDPR needs the
  tiebreak, not only a comparison against this policy.

### Section 3 — Competency. Merge, on Max's instruction "MERGE"

Two clauses said the same thing at different scopes: the attorney and a practice **area**,
the firm and a **matter**. Merged so both scopes survive.

**Approved text:**

> Competency: Neither the firm nor any attorney will take on a matter, or practice in an
> area of law, that the attorney would not be competent to handle if AI were not available.
> AI does not relieve the attorney of maintaining currency and competency in their field.

Replaces both `No attorney will engage in the practice of any area of law...` and
`Competency:  Firm cannot take on a matter...`.

### Section 4 — Staff Training. Typo fix plus overlap resolved

Max's instruction: *"CHANGE THE 'OR AI' TO 'OF AI'. PROPOSE A SOLVED SENTENCE FOR THE
OVERLAP."* Then, on the first draft: *"we need to include the aprt about the attestations."*

**Approved, first clause:**

> All non-attorney staff shall complete Iurix training and receive Iurix certification.
> Every person at the firm, attorneys included, shall sign a personal attestation. The firm
> will maintain all elements required for Iurix AI Accreditation, which shall be renewed at
> least once each year with updated training and attestations.

**Approved, second clause:**

> Staff competency: The training shall cover the potential risks of AI, and the attestation
> shall record that the person understands those risks and agrees to abide by this policy.

🔴 **One substantive change, approved knowingly.** Katy scoped attestations to non-attorney
staff. The product scopes them to everyone: the intake roster help text, Max's own copy,
reads *"Non-attorney staff take the training; everyone signs the attestation."* The clause
was widened to match the product, because a policy narrower than the platform would have the
firm's own document contradict the certificates it receives. Training and certification stay
scoped to non-attorney staff exactly as Katy wrote them.

The overlap is resolved by role, not deletion: clause one mandates the duties, clause two
defines what the training and the attestation contain. Neither mandates the same rule twice.

### Section 5 — Approved Tools. Two new clauses

**Line 276** (`[If firm selected that a tool shall be prohibited then state that here]`):

> The firm prohibits the use of the following, whether entirely or for the specific purposes
> stated: **[prohibited tools]**.

Deliberately general. Max: *"we have to make it vague so they take the time to make it
specific, per the action list that will remind of this."* A first draft said "prohibited
entirely... including simple web searches" and was rejected as too absolute: a firm may
prohibit a tool for one use (translation, image generation, drafting) and not others. The
firm's own free text now sets the scope.

**Line 278** (`[If indicated that personal devices are permitted then state that such usage
must comply strictly and shall never include personally Identifiable client or case
information.  ]`):

> Where the firm permits the use of personal devices or personal AI accounts, that use must
> comply strictly with this policy and shall never include personally identifiable client or
> case information.

Her wording kept; "comply strictly" gains its object, and her stray capital in "Identifiable"
is fixed. Conditional on `personal_devices = yes`.

---

## 2. Deletions

Max's rule, verbatim: *"IF IT WASN'T ON KATY'S POLICY AND IS NOT NECESSARY FROM THE INTAKE
QUESTIONS. THIS IS GARBAGE AND MUST BE DELETED."*

| Block | Why it dies |
|---|---|
| `gq8-tool-approval` (Section 5) | `sourceLine: null`, no policy text from Katy, no intake question, absent from her 2026-09-02 definitive list. Origin is her August Module W, which she herself labelled "(output, not input)". **Nothing is lost:** her Section 7 text already names the approver, "Firm admin must approve the specific platform based on its reliability and safety." |
| `gq6-vendor-diligence` (Section 5) | Same shape. It is parts (b) and (c) of her August Module H question, security certifications and data handling on termination. **The substance is already carried** by her line 359 "Third party software" clause, which names both as factors. |

**Knock-on:** question 3 on the question list at the end of the review document, "Who may
approve a new AI tool before it is used," is withdrawn with `gq8`.

---

## 3. Approved typo fixes, Section 5

These join `TYPO_CORRECTIONS` in `tests/policy-transcription.test.ts`, which is the only
sanctioned licence to diverge from Katy's source.

| Source line | Now | Fix |
|---|---|---|
| 354 | move in **an** out | move in **and** out |
| 359 | what the TOS **will happen** to data | what the TOS **say will happen** to data |
| 359 | stability of the **country** | stability of the **company** ⚠️ see below |
| 360 | protected sufficiently | protected sufficiently**.** |
| 406 | used for simple web searches | used for simple web searches**.** |

⚠️ **`country` → `company` is applied but flagged for Katy.** Max: *"fix but flag."* The
evidence is strong but the change is bigger than the others, because both are defensible
sentences. Line 359 is the **only** place the word "country" appears in her entire
823-line document; there is no data-residency, offshore or vendor-jurisdiction discussion
anywhere in it. The same sentence says "company" twice more, and the three factors listed,
experience, reputation and stability, are company attributes. **One line to put to her:**
*"line 359, stability of the country or of the company?"*

---

## 4. The action list — new, and being built as we go

The action items **document already exists** and renders as its own file, separate from the
policy (D2). It has three trigger rules, all on "not sure" answers, and all three currently
emit a `[TODO]` placeholder instead of real text. One fires on `carrier_notified`, retired
2026-09-02, so it is dead. We are filling a built container, not building one.

Max's standing instruction on wording: *"clearly, not obscurely."* Written for the firm to
read. All drafts, his to polish.

1. **Regulatory regimes** (when any regime is selected)
   > This policy does not replace the firm's obligations under [regimes] and should be read
   > alongside them.

   From Katy's 2026-09-02 instruction *"flag that this policy should be reviewed alongside
   those compliance obligations rather than standing alone."* Kept out of the policy because
   it is a caveat about scope, not a rule the firm is bound by.

2. **Prohibited tools scope** (when the firm named any)
   > Review the prohibited tools list and state, for each tool, whether the prohibition
   > covers all uses or only particular tasks, for example drafting, translation, image
   > generation, or client communication.

3. **Tool approval** (replaces the deleted `gq8`)
   > Your policy says the firm admin approves legal research platforms. It does not say who
   > approves any other AI tool, or what that person checks first. If you want this to be
   > specific, name the person or role who must approve a new AI tool before anyone uses it,
   > and write down what they review before saying yes.

4. **Vendor terms review** (replaces the deleted `gq6`)
   > Your policy requires the firm to weigh each vendor's security measures and what happens
   > to your data if you cancel or the vendor goes out of business. It does not record whether
   > you have actually checked those things for the tools you use. If you want this to be
   > specific, review each tool's terms of service for its security certifications and its
   > data handling on termination, and record what you find.

Items 3 and 4 are longer than the shape Max later called for. **Trim them to one line each
when they are built**, matching the Section 6 drafts below.

---

## 5. Section 6 — open, nothing approved

The per-platform paragraphs in Sections 6 and 7 are **generated by us and Katy has never seen
them.** 20 vendors were researched on 2026-08-31 (`.planning/policy-blocks.csv`); for roughly
15 the training question came back `unclear`, and for every unclear vendor the generator
invents a duty out of our own uncertainty.

**Three defects, agreed:**

1. Katy's standard is **express agreement**. The generated text says **written confirmation**.
2. It bundles "shall execute the data processing addendum" into the no-training sentence.
   **A DPA is not a no-training agreement.**
3. It asserts what each vendor's terms said on a date, inside the firm's legal document, and
   goes stale silently.

**Desktop's first proposal — move it all to the action list — was withdrawn.** Max: *"seems
bloated tho... legal does not mean cumbersome."* He was right: two of the three defects are
wording and fix in place, and stripping the vendor text drops Section 6 to two sentences and
makes the policy generic, which is the opposite of what the product sells.

**Current direction, NOT yet approved.** One sentence per platform, in the policy, three
shapes:

> **Unclear vendor:** Clio's AI features (Manage AI) shall not be used with client
> confidential information unless the firm holds Clio's express agreement that firm data is
> not used to train models.

> **Vendor that trains:** Slack's AI features shall not be used with client confidential
> information unless the firm has completed Slack's model opt-out.

> **Vendor that does not train:** Microsoft Teams does not train on customer data under its
> terms. Its AI features may be used in accordance with this policy.

Kills all three defects, stays firm-specific, and makes Katy's review tractable: three
sentence patterns rather than twenty vendor paragraphs. The action list then carries only
real tasks, one line each.

**Also unresolved in Section 6:** if the generated text is trimmed, Katy's line 361 (a bare
list, "-interoffice communications (Telegram, Teams, Slack)") leaves communication platforms
uncovered. A proposed filler sentence exists in chat and is not approved.

---

## 6. Question rework list

Raised during the pass, to be handled when we reach the intake questions. Max: *"remember to
revisit properly."*

- **`prohibited_tools`** — the prompt is *"Any tools the firm wants to prohibit by name?"*,
  which invites a bare product name, not a scope. That is why the answer arrives thin, and it
  is what forced the deliberately general clause at line 276.
- **`personal_devices`** — the prompt asks whether personal devices *"touch client
  information."* A firm answers **yes**, and its own policy then tells it that use may never
  include identifiable client information. It resolves logically, the question asks about
  client information broadly and the clause bars the identifiable subset, but a firm reading
  it will feel caught out.
- **`research_tools`** — Max struck "General-purpose LLMs" from the options. That option is
  the sole trigger for the `p12-general-llms` clause (Katy's line 286). Remove the option and
  that clause never appears for anyone again.

---

## 7. ~~Open defect~~ — RESOLVED 2026-09-04; the diagnosis below was wrong

This section claimed the `answered` condition was broken for grid-type answers, because Katy's core
no-training clause (source line 356) rendered for nobody.

**It was a broken fixture.** `isAnswered` for a `tool-grid` derives its rows from `ai_tools`. The
`maximal` fixture set `tool_grid` without `ai_tools`, so the grid reported itself unanswered and
every block gated on it disappeared from the render. A real firm cannot reach that state; the grid
is only shown once `ai_tools` is answered. One line in `lib/policy/fixtures.ts`. Renderer now shows
55 verbatim clauses, up from 54.

**Still true from the original entry:**

- `p12-general-llms` ends `(DEFINITIONS AT END)`, a pointer to Section 22 written as a note-to-self
  in capitals. It prints exactly like that, and the clause has no full stop.
- The Section 5 typo list was compiled from the `maximal` render, which does not fire every block.
  Any clause behind an unsatisfied condition was not reviewed for typos.

## 8. Standing instruction from this session

**Max does not want to see the `§` character.** Write "Section 12". Display only: nothing in
`lib/policy/`, the spine numbering, or Katy's source changes. Recorded in memory as
`feedback-no-em-dashes`.

**A full grammar pass over the whole policy is queued for the end**, on Max's instruction:
*"it was a quick draft, it does need polishing, but none of the ai bloating."* Fix what is
broken and nothing else. Keep her cadence, capitals and semicolons. No smoothing, no added
connective phrases, no lengthening a blunt sentence into a balanced one.
