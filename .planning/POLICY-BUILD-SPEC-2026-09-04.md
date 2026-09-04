# Policy build spec — 2026-09-04

**This is the authoritative text to build.** Max approved every line below, one item at a
time, in a session on 2026-09-04. Where a decision reversed an earlier one, the later
decision is what appears here.

**Read this with `POLICY-REVIEW-2026-09-03.md`**, which carries Sections 2 to 5 with the
reasoning behind each. This document is the complete final text for all 22 sections plus
every intake change, and it supersedes 09-03 wherever the two differ.

🔴 **Two rules that govern everything here, both from Max on 2026-09-04:**

1. **Only Katy's actual policy document and her intake questions are sources.** Her line
   "(MODULES D, E, F, G, J, O, Q, R, U, V: leave these out...)" is **a note to Max, not a
   spec.** Do not make decisions from it. Where a module's questions were retired on the
   strength of that line and this document restores them, the restoration wins.
2. **"Leave these out" meant do not ask an intake question about it.** The clauses still go
   in every policy.

---

## 1. Final policy text, all 22 sections

Firm-specific values are shown in **[brackets]**. Everything else is literal.

### 1 Preamble
> Under the prevailing law, AI is considered a tool and in some cases treated like a staff member.

### 2 Application
Document title becomes **Artificial Intelligence Policy** over **[firm name]**, not a clause
inside this section.

> Attorneys and staff must comply with all requirements of Federal Courts, Agencies and Circuits, as well as the **[state / states]** of **[jurisdictions]**.

> The firm handles client or personal data subject to **[regimes]**. Where the requirements of **[that regime / those regimes]** differ from this policy, **[or from one another, ]** the firm and its staff shall comply with the most restrictive requirement that applies.

> All contract attorneys, "of-counsel" attorneys and co-counsel shall be supervised as necessary to ensure compliance with this policy.

> All staff will comply with the firm's incorporated technology and confidentiality policy.

**Singular and plural must both work.** One state reads "the state of North Carolina"; two or
more reads "the states of X and Y". One regime drops "or from one another".

### 3 Competency
Replaces BOTH her competency clauses with one.

> Neither the firm nor any attorney will take on a matter, or practice in an area of law, that the attorney would not be competent to handle if AI were not available. AI does not relieve the attorney of maintaining currency and competency in their field.

> Every attorney is responsible for personally reviewing every filing before signing and submitting to a tribunal or agency.

> Attorney may not use a tool they do not understand. Attorney must always be able to fully explain how and why they came to a conclusion.

### 4 Staff Training and Attestation
> All non-attorney staff shall complete Iurix training and receive Iurix certification. Every person at the firm, attorneys included, shall sign a personal attestation. The firm will maintain all elements required for Iurix AI Accreditation, which shall be renewed at least once each year with updated training and attestations.

**Subheading: Staff competency**
> The training shall cover the potential risks of AI, and the attestation shall record that the person understands those risks and agrees to abide by this policy.

**DELETE** the `gq9-training-owner` block. `sourceLine: null`, no clause text from Katy, no
question on her list. Same rule that killed `gq8` and `gq6`.

### 5 Approved Tools and Data Protection
**Subheading: Confidentiality**
> Attorney is required to make reasonable efforts to safeguard client confidentiality. This does not mean that the attorney cannot use the Internet, nor that client data cannot be stored off-site "in the cloud" nor that client data cannot ever move in and out through secure channels. Attorney must be satisfied that third party software is sufficiently secure that client information will not be inadvertently disclosed or accessed by unauthorized individuals.

> All AI tools, including third party tools, custom built tools, tools inside other tools, and public tools must always be used under an express agreement that data will NOT be used for training the models if there is ever any access to client data.

**Subheading: Third party software**
> The firm shall consider the experience, reputation and stability of the company, whether the TOS include an express agreement about handling of client information, the security measures it employs, and what the TOS say will happen to data if the services are terminated or the company should go out of business.

> Firm will be particularly cautious about providers that practice "shrinkwrap agreements" where the entire license agreement is considered accepted once a user simply opens the product. The same applies to a "clickwrap" agreement, accepted by checking a box. Information in such tools may not be protected sufficiently.

**Subheading: Approved and non-approved tools**
> The firm shall distinguish approved tools from non-approved tools for confidential or case specific information.

> Non-approved tools are chatbot consumer versions with training on. These can be used for simple web searches.

> *(only if prohibited_tools answered)* The firm prohibits the use of the following, whether entirely or for the specific purposes stated: **[prohibited tools]**.

> *(only if personal_devices = yes)* Where the firm permits the use of personal devices or personal AI accounts, that use must comply strictly with this policy and shall never include personally identifiable client or case information.

> *(only if research_tools includes general LLMs)* Any general purpose LLMs (not legal-specific research tools) may only be used in a manner that protects client data. Specifically inquiries shall be so general that a client's case cannot be determined from the prompt, or that the data shall only go through a professional level of data protection (see Definitions).

**DELETE** `gq8-tool-approval` and `gq6-vendor-diligence`.

### 6 Platforms and Systems
🔴 **All generated per-vendor paragraphs come OUT of the policy.** They are ours, Katy has
never reviewed them, they assert dated facts about vendor terms, they impose "written
confirmation" where her standard is "express agreement", and they bundle a DPA into the
no-training sentence, which is wrong. Replace with her own clause, naming the firm's tools.

> *(only if case_mgmt_ai is yes or not sure)* Firm shall ensure that its case management **[platform / platforms]**, **[names]**, **[is / are]** contractually bound so that training on data is disabled.

> All conflicts checks performed by AI will be independently verified.

> Interoffice communication platforms with AI features, **[names]**, shall not be used for client information unless those features are disabled, or the platform is contractually bound not to train on firm data.

**`email_only` must be excluded from platform generation**, like the None sentinels. It is not
a vendor. Today it falls through to a generic fallback that prints "The firm uses Email only.
The firm shall confirm whether Email only's AI features are enabled..." A firm answering email
only instead gets:

> The firm uses email only for internal communication. Interoffice communication platforms with AI features shall not be used for client information unless those features are disabled, or the platform is contractually bound not to train on firm data.

### 7 Legal Research
> Dedicated legal research tools are in a distinct class from "ordinary tasks" like letter drafting or case management. Any legal research tools must be compliant. Firm admin must approve the specific platform based on its reliability and safety.

> The firm's approved legal research **[tool is / tools are]** **[names]**.

> Every case surfaced by an AI research tool must be verified with source reporters as required by Section 8.

Generated per-vendor paragraphs come out here too.

### 8 Verification and Hallucinations
> All content must be independently verified from source material. This requirement is not specific to AI; it simply extends the regular duty of care of all submissions to the court, and attorneys must have a heightened awareness of the potential for hallucinations.

> It is not a defense that an attorney relied on the work of another attorney or a staff member.

> All citations, case holdings, and case facts MUST be verified with SOURCE reporters (not an AI summary), including that the stated holding is correct, not misleading, and a relevant part of the case. Staff can be in charge of finding the cases, but the attorney is always ultimately responsible for verification.

> Attorney has the duty to correct and disclose an error if discovered.

The "including that the stated holding is correct, not misleading, and a relevant part of the
case" clause carries her line 288's substance, so Section 7 can cross-reference here without
losing it. **"disclose to whom" is deliberately left as she wrote it** and is a question for
Katy, not a fix.

### 9 Drafting, Translation and Filings
> This policy applies to drafting for form, such as email, for content, such as complaints, and for boilerplate, such as deeds and trusts. Whether drafting is treated as form or as content is decided by the data used in it, not by the type of document.

> Consumer level or pro level may be used for drafting of templates as long as no personally identifiable case or client information is used and it is strictly for form and not content.

> Professional level security is required for any drafting that uses or has access to case or client specific data.

> Translations shall be independently reviewed by a person competent to do so and will always be done with professional level data security since it will handle client data.

**Subheading: Filings**
> Attorneys will be responsible for ensuring that all local filing rules are complied with, including but not limited to: format, margins, font size, and content elements.

> Firm will be responsible for being aware of and complying with any local or court or judge specific affirmative AI disclosures. For example, if a jurisdiction requires every filing to affirmatively state "AI was used for X, or AI was not used in the preparation of the filing."

Her unclosed quotation mark is closed. "we utilize" became "uses", because "we" was Iurix
speaking inside the firm's document and the sentence did not parse.

### 10 Brainstorming
> Case and strategy brainstorming shall only be done with professional level security.

**Subheading: Maintain confidentiality**
> Any case specific brainstorming must happen locally, or with only API or Commercial Use licenses, with no training allowed.

⚠️ **The added commas change her meaning** from "locally AND API" to "locally OR API". Max
approved knowingly. Flag it to Katy.

### 11 Document Review and Summarizing
Replaces her two overlapping clauses with one.

> AI can sometimes efficiently identify items in long documents, but it can also be wrong and miss items. AI shall only be used as an additional aid to human document review and summarizing, not as a replacement.

**Subheading: Technology assisted review**
> Any TAR methodology, if used, must be documented and, if required by local rule, disclosed.

**`doc_review_scale` still drives nothing.** Its options are being rewritten separately. Do not
invent a clause for it.

### 12 Meetings and AI Notetakers
🔴 **Composed from three answers.** Today all three reach nothing and the section prints one
disclaimer for every firm.

> *(prohibited)* AI notetakers are not permitted at any firm meeting.

> *(otherwise)* AI notetakers are permitted in **[venues, comma-separated with a final "and"]**, **[consent clause]**. The approved tool is **[tool]**. No other notetaking tool may be used.

Consent clause by stance: "only with both party consent" / "and only in states allowing single
party consent".

> *(unsure)* Nothing enters the policy. An action item is raised instead.

Her disclaimer, reworded out of Iurix's voice:
> The firm is responsible for determining its own liability and compliance with local regulations regarding AI notetakers.

The original said "NOTE that **Iurix** cannot assure compliance", which is the vendor speaking
inside the customer's own policy. **Flag to Katy that a product disclaimer belongs in the terms
of service, not the policy template.**

### 13 Automations
🔴 **Remove the `when: { key: 'automations', is: 'yes' }` gate as it stands and rebuild it
against the new question.** Her clause is fully written and has never appeared in a single
policy, because it gated on an answer no question collected.

> The firm may use AI to write the code for its own automations, provided no client information is shared with the tool used to write it. The firm may also use automations built by third parties.

Then one of:
> *(no automations)* The firm does not currently use automations. Any automation the firm later adopts must run on firm systems, and may send client information only through an API or under a commercial agreement ensuring confidentiality.

> *(firm systems)* The firm's automations run on firm systems, and may send client information only through an API or under a commercial agreement ensuring confidentiality.

> *(third-party service, both, or not sure)* Where an automation runs on a third-party service, client information may pass through it only under a commercial agreement ensuring confidentiality. Any automation handling client information without such an agreement is not permitted.

"because client data does not get shared" became "provided no client information is shared with
the tool used to write it": hers stated an assumption as a reason, which left the permission
standing even when the assumption is false.

### 14 Client Disclosure and Client Use of AI
> Not every possible use of AI needs to be affirmatively disclosed.

> Disclosure is required to the extent reasonably necessary to permit the client to make informed decisions regarding the representation. Generally, a lawyer need not inform her client that she is using an AI tool to complete ordinary tasks, such as generic case/practice management. However, if a lawyer delegates substantive tasks in furtherance of the representation to an AI tool, the lawyer's use of the tool is akin to outsourcing legal work to a nonlawyer or other third-party resource or service, for which the client's advanced informed consent is required.

> If billing clients for the cost of AI tools then disclosure of that is required prior to being retained.

> In all venues where the tribunal requires disclosure, the attorney must ensure that such disclosure is made. Some tribunals require every filing to state "No generative AI was used" where that is so. Where AI was used, there may be a requirement to state "AI was used and all output was verified". Attorney is responsible for ensuring compliance with this requirement.

**Subheading: Client use of AI**
> Clients may use AI for general procedural questions, for example: "What is the correct mailing address for this matter?" or "What is the filing fee for this form?"

🔴 **Three blocks stay unwritten and MUST NOT render anything**, parked for Katy: her lines
**330** (the list of situations requiring disclosure), **318** and **403** (the firm's response
to clients using AI). Max: *"lets not include it. she may want to do some more research."*
`client_ai_approach` is collected and reaches no clause on purpose.

### 15 Billing
> *(only if bill_ai_costs = yes)* Mandatory disclosure of the scope and cost of AI will be made to the client at hiring.

> The firm shall never bill for time not actually spent on a matter, for any reason, including that the task would have taken longer without AI.

Then one line per billing model selected:
> *(hourly or hybrid)* Where AI allows an attorney to complete a task in less time, the firm bills the actual reduced time.
> *(flat fee)* Where the service is charged at a flat fee agreed at the time of engagement, that fee is not adjusted because AI completed a task faster.
> *(contingency)* Where fees are contingent on recovery, they are not based on time spent.

This replaces her two duplicate clauses (lines 332 and 399). Her line 399 was written entirely
in hourly language and a code comment records that it was always meant to branch on billing
model. **That question is restored, see section 2 below.**

### 16 Records and Retention
> Research for a client that is case specific and substantive legal work shall be preserved in the client's file as work product subject to the same retention criteria as the rest of the file.

Unchanged but for the article and the capital. Verified 2026-09-04 that this is the **only**
retention text in her entire policy; everything else the search finds is her intake questions
or her reference material.

### 17 Employment and Hiring
Replaces her two overlapping clauses.

> The firm shall ensure that any use of AI in selecting candidates for hiring conforms with all local regulations, and if the firm is unsure, will engage practice-specific counsel on the issue.

> *(only if hiring_ai = yes)* The firm recruits applicants from **[jurisdictions, including "outside the US" and its write-in]**. AI screening must be vetted against the current requirements of **[that jurisdiction / each of those jurisdictions]** before use. No single standard applies across them.

Her "We cannot provide a standard policy" is gone. It was Iurix speaking inside the firm's own
document; its meaning survives as "No single standard applies across them."

### 18 Advertising and Marketing
> *(uses AI in marketing)* The firm uses AI for **[the ways picked, comma-separated with a final "and"]**. All such material will be independently reviewed by an attorney for compliance with legal advertising rules before publication.

> *(does not)* The firm does not use AI in its marketing or advertising. Should it do so, all such material will be independently reviewed by an attorney for compliance with legal advertising rules before publication.

**Keep her phrase "legal advertising".** An earlier draft said "attorney advertising rules",
which is the term the bar rules use, and Max chose her voice. Only the missing noun "rules" is
added.

### 19 Malpractice Insurance
Replaces both her clauses with one, taking the stronger verb from line 334 and the better name
for the insurer from line 413.

> The firm shall comply with any requirement to disclose AI use to its professional liability carrier.

🔴 **Her line 334 also contains an action-list instruction the transcription dropped:**
`[add to action list to check if malpractice insurance requires notification of AI tools]`.
Build that action item. See section 3.

### 20 Vendor Incidents
> If a vendor advises that there is a breach, **[vendor security contact]** shall be notified immediately to take action.

**`vendor_security_contact` STAYS.** An earlier plan cut it. Max verified that her policy
explicitly says `{STAFF IDENTIFIED IN INTAKE]`, so her own clause requires the question. The
slot remains; only her punctuation is fixed, and the second "breach" is dropped as a repetition.

### 21 Enforcement and Discipline
> *(answered)* Violations of this policy will be handled as follows: **[discipline actions]**. **[Discipline owner]** is responsible for discipline decisions.

> *(Unsure)* Nothing enters the policy. An action item is raised instead.

Her line 401 needs no separate clause; it is a directive telling us to do what the first slot
already does.

### 22 Definitions
🔴 **This section ships.** Max first pulled it, then reinstated it, because three of her clauses
(Sections 5, 9 and 10) state rules that turn on "professional level" and a firm reading them has
nowhere else to find out what it means.

> **Professional level of data protection.** An express agreement that the firm's data will not be used to train the provider's models.

⚠️ **Her examples were CUT.** Her draft read "API, Claude Enterpirse, ..[finish this list]".
Both were removed on 2026-09-04 because **we have no evidence for either**: Claude is not in
`policy-blocks.csv` at all, and no research covers whether API access carries a no-training
commitment by default. They can return when the research lands. **Do not reinstate them.**

**Nothing else is added to Definitions.** Max, 2026-09-04: only what is in her policy or her
intake questions. "Express agreement", "approved tools", "professional level security", "pro
level", "consumer level" and "Commercial Use licenses" are all undefined and all stay that way
until Katy is asked. They are recorded in `RESEARCH-QUEUE.md`.

---

## 2. Intake question changes

### Reworded
| Key | Change |
|---|---|
| `jurisdictions` | **Remove the "Federal courts" option.** Section 2 already names the federal forums unconditionally, and the slot already excluded Federal from the state list. **Add "Other" with free text.** |
| `contract_attorneys` | "Does the firm work with contract attorneys, of-counsel attorneys, **or co-counsel**?" Her Section 2 clause covers all three; the question asked about two. |
| `research_tools` | Becomes a **Yes/No with the list opening on the same screen** on Yes. Matches her "-Y/N, If YES then drop down". **"General-purpose LLMs" STAYS** — an earlier reading of a strikethrough was wrong, and removing it would kill her line 286 clause. |
| `doc_review` | "Does the firm use AI for discovery review, document review, or to summarise long records **or videos**?" Restores "or videos" and names document review as its own activity. |
| `notetaker_stance` | Options become **her policy document's own**: No AI notetakers / Only allowed with both party consent / Allowed only in states allowing single party / **Not sure**. The current wording paraphrased her statutory terms. |
| `notetaker_scope` | Options become her September wording: Client meetings / Internal staff meetings / Hearings where permissible. |
| `hiring_ai` | "Does the firm use, or want to use, AI to **screen out** potential employment applicants?" and **`hiring_states` folds onto the same screen** on Yes. "Outside the US" gains a free-text field for where. |
| `discipline` | "What actions may the firm take when this policy is violated?" plus an **"Unsure"** option. Her clause prints "the discipline actions specified in the intake", so it must elicit actions, not a narrative. |

### New questions
| Key | Question | Why |
|---|---|---|
| `automations` | "Does the firm use automations or workflows that move information between systems?" Yes/No. On Yes: "Where do those automations run?" On firm systems / Through a third-party service / Both / Not sure. **No examples in the option labels.** | Her Section 13 clause is fully written and has never rendered. |
| `billing_models` | "How does the firm bill?" Hourly / Flat fee / Hybrid / Contingency, multi-select. | **RESTORED.** Her line 399 is written in hourly language and a code comment records the branch was always intended. |
| `ai_time_adjustment` | "Does the firm have a process for adjusting billed time when AI completes a task faster?" Yes/No, shown for hourly or hybrid. | **RESTORED.** Her own note: a No here is a gap requiring a firm decision, not boilerplate. |
| `marketing_use` | "Does the firm use AI in its marketing or advertising?" Yes/No. On Yes: "In what ways?" Generating artwork or images / Generating written content such as social posts, blog posts or website copy / Trying to increase how often AI platforms recommend the firm. | The third is not AI-generated content, so her Section 18 clause does not reach it today. |
| `discipline_owner` | "Who at the firm decides consequences when this policy is violated?" Short text, a role is enough. | Her clause has two slots; only one had a question. |

### Mechanism changes
1. 🔴 **Extend `toolGridTools()` beyond `ai_tools`.** It must derive rows from `ai_tools` **plus
   `case_mgmt` plus `comms_platforms`**. Today the policy tells a firm to ensure Clio is
   contractually bound and never asks whether it is. Exclude the none-sentinels; `email_only`
   is a real answer and gets a row. Re-check that widening does not block a firm mid-grid, and
   update `MAXIMAL` so its grid rows still cover every source (see the comment above `ai_tools`
   in `fixtures.ts`).
2. 🔴 **Make the policy read `tool_grid[].noTraining`.** Nothing does today: every reference in
   `lib/policy` is a comment saying it should. A firm answering "No, we have no agreement" gets
   an identical policy to one answering "Yes". Per row: **yes** adds nothing, **no** raises an
   action item, **unknown** raises an action item and is treated as no. The prohibition itself
   already exists unconditionally at her line 356. `action-items.ts` matches on a whole answer,
   so it needs to emit per row. **Design it and report the shape before writing any text.**
3. **Katy's Q13/Q14 logic.** `case_mgmt_ai` = **yes or not sure** fires the platform
   requirement; **no** means it does not appear. Today it fires merely because a platform was
   named. Not sure also raises an action item.
4. **Question order:** keep the current grouping. Sections must stay contiguous or the progress
   strip reads as going backwards. Max confirmed this over matching Katy's order exactly.

---

## 3. Action items to build

The container exists and renders separately (D2). All three current rules emit `[TODO]`
placeholders, and one fires on `carrier_notified`, retired, so it is dead. **Wording below is
Max's to finalise; build the mechanism and use these as drafts.**

| Trigger | Item |
|---|---|
| any regime selected | This policy does not replace the firm's obligations under [regimes] and should be read alongside them. |
| prohibited_tools answered | Review the prohibited tools list and state, for each tool, whether the prohibition covers all uses or only particular tasks, for example drafting, translation, image generation, or client communication. |
| always | Check whether your malpractice insurance requires you to notify the carrier that the firm uses AI tools. *(from her line 334, an instruction the transcription dropped)* |
| always | Review each tool's terms of service for its security certifications and what happens to your data if you cancel or the vendor closes, and record what you find. *(replaces the deleted `gq6`)* |
| always | Name the person or role who must approve a new AI tool before anyone uses it, and what they check before saying yes. *(replaces the deleted `gq8`)* |
| tool_grid row = no | [Tool]: you answered that there is no agreement preventing training on your data. Do not use it with client confidential information until you have one. |
| tool_grid row = unknown | [Tool]: you answered that you do not know whether an agreement is in place. Find out, and record what you find. |
| case_mgmt_ai = not sure | Confirm whether your platform's AI features are switched on, and record it. |
| notetaker_stance = not sure | Research the consent rules for AI notetakers in the states where you hold meetings, decide the firm's position, and update your intake. |
| discipline = unsure | Specify the consequences of violating this policy, and record who decides them. |
| ai_time_adjustment = no | The firm has no process for reducing a bill when AI completes a task faster. This needs a decision from the firm. |
| automations = third-party or both | Confirm you hold a commercial agreement ensuring confidentiality with each automation service that touches client information. If you do not, that automation may not handle client matters. |

---

## 4. Not in scope, deliberately

- **`doc_review_scale`** — options are wrong and are being rewritten. No clause.
- **`firm_size`** — reads nothing. Her note says it should scale staff competency language; she
  never wrote it, and Iurix already delivers the training programme to every firm. Question for
  her.
- **Section 14 lines 330, 318, 403** — parked with Katy.
- **Section 8 "disclose to whom"** — left as she wrote it, question for her.
- **`country` → `company` at line 359** — applied, flagged for her confirmation.
- **Signal's vendor row** — wrong in effect; Max is verifying before it is changed.
- **The four unresearched AI tools** — ChatGPT, Claude, Gemini, Copilot. See `RESEARCH-QUEUE.md`.
