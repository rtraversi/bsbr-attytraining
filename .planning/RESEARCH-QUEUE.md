# Research queue

Things Max flagged during the policy and intake review that need checking before
they can be settled. **Max and desktop research these together.** Nothing here is
a decision; each item is a question with no verified answer yet.

Started 2026-09-04. Add to it, do not prune: an item that turns out to be a
non-issue gets marked closed with what was found, so nobody re-opens it.

---

## 1. Vendor terms we do not have

**The four most likely answers from a small firm have no research behind them.**
`ai_tools` offers **ChatGPT, Claude, Gemini and Microsoft Copilot**, and none of
the four appears in `.planning/policy-blocks.csv`. That file covers 20 vendors;
these are not among them. So the policy can say nothing about any of them.

Needed per tool: does the provider train on customer data, is there an opt-out,
is a DPA available, and is the AI on by default.

**Related, and it blocks a definition.** Does **API access** carry a no-training
commitment by default at the providers we actually list? Katy's draft definition
of "professional level of data protection" named API access and Claude Enterprise
as examples. Both were **cut on 2026-09-04** because we have no evidence for
either. The definition now states the rule alone. The examples can come back if
the research supports them.

**Scale of the gap:** of the 20 vendors we did research, the training answer came
back **unclear for 15**, no for 4, yes for 1. So "we don't know" is the normal
state, not the exception.

## 1b. What the per-platform requirement actually says

Katy's Q13/Q14 logic: selecting a case management platform triggers a requirement
to check that training is not allowed, and answering **yes or unsure** on whether
its built-in AI is switched on triggers *"the platform requirement specific to that
software."*

**The mechanism is approved for build now** (2026-09-04). What is NOT settled is the
**content**: what the requirement says for Clio versus Smokeball versus MyCase. That
depends entirely on item 1, the vendor terms research. Until that lands, the branch
fires and names the firm's platforms using Katy's own "contractually bound" clause,
which needs no per-vendor facts.

Max, 2026-09-04: *"this item's information resolves when i do research ... but i do
want the functionality to be built."*

## 2. Tool lists in the intake

**Case management platforms.** All eleven were checked on 2026-09-04 and are real,
currently marketed legal practice management products: Clio, MyCase,
PracticePanther, Smokeball, Filevine, Actionstep, Litify, Rocket Matter, CosmoLex,
Neos. **Open question: Monday.com.** It is real but is general project-management
software, not a legal platform. Some small firms use it informally. Max's call
whether it stays.

**Communication platforms.** Microsoft Teams, Slack, Telegram, Signal, Email only.
All five verified real on 2026-09-04. Nothing fabricated.

🔴 **OPEN: Signal.** Our vendor row has it as `hasAi: unclear, trains: unclear`, which
is wrong in effect. Signal is end-to-end encrypted and cannot read message content,
stores virtually no metadata (a court order yields account creation date and last
connection time), and is an independent nonprofit with no data collection. Its
founder's encrypted AI project, Confer, is a **separate product**, not a Signal
feature. Max is verifying this himself before the row is changed.

Why it matters: the Section 6 clause names the firm's platforms, so a firm using
Signal is currently told to get **Signal** contractually bound not to train on their
data. That is nonsense, and it is the kind of nonsense that makes an attorney
distrust every other vendor entry in the document.

**AI tools.** All twelve verified real on 2026-09-04. **Open question: Harvey.** It
is real and major, but it is a BigLaw product (A&O Shearman, Latham, 1,300 firms).
Iurix sells to one-to-fifteen person firms, who will not have it. Harmless to keep,
but it is noise in a list aimed at solos.

**Also open: Microsoft Copilot is not on Katy's list.** Hers reads ChatGPT, Claude,
Gemini, CoCounsel, Westlaw Edge/Lexis+ AI, Harvey, Spellbook, DraftWise, Otter.ai.
Copilot was added by us. Defensible given how many firms run Microsoft 365, but it
is our addition and she has not seen it.

**Katy's case-management option list is wrong.** Her 2026-09-02 list gives
"CoCounsel, Lexis+ AI, Vincent AI, Ask Practical Law, Westlaw Edge, general LLMs"
as the case-management options. Those are her **research tools**, copy-pasted from
the question above it. She needs to resend that option set.

## 3. The same tool in two questions

**CoCounsel, Lexis+ AI and Westlaw Edge appear in both `ai_tools` and
`research_tools`.** A firm using CoCounsel meets it twice, and depending on which
box they tick it either gets a no-training grid row in Section 5 or a generated
paragraph in Section 7, or both.

Not a research item so much as a decision that needs one: either the three research
tools come out of `ai_tools`, or `research_tools` goes and the research question
narrows what was already picked. Both are defensible. They cannot both stay.

## 4. Terms the policy uses and never defines

Raised while finishing Katy's one definitions entry. Her policy uses **fourteen**
terms that arguably need defining. Three she defines inline where she uses them
(shrinkwrap, clickwrap, non-approved tools) and need nothing.

**The one that matters: "express agreement."** It is the test the entire policy
turns on, it appears twice in her policy, and it is defined nowhere. A firm cannot
tell whether a published terms-of-service commitment counts, or whether they need
a signed addendum.

⚠️ **And the intake asks a different question than her policy tests.** The tool grid
asks *"is there a **signed** agreement that the vendor will not train on your
data?"* Katy's standard is *"an **express** agreement."* A firm relying on a
provider's published commercial terms has an express agreement and no signed one.
They would answer No to our question and Yes to her rule.

**Also undefined:** "approved tools" (she defines only the opposite), "professional
level security", "pro level", "consumer level", "Commercial Use licenses".

**Per Max, 2026-09-04: nothing gets added to Definitions that is not in her policy
or her intake questions.** These are recorded so the research is done before
anything is proposed to her, not so we can add them ourselves.

## 5. Document review scale

The intake asks the firm what scale of document review they do, offering
"Occasional: a few matters a year / Regular: most matters / Large-scale
e-discovery." Max, 2026-09-03: *"the options you listed for these are horrid.
completely missed the point."*

**No policy clause reads that answer.** Zero blocks consume `doc_review_scale`. So
today it is collected and discarded.

Two things needed, in order: the options rewritten so they capture what Katy meant,
then a clause that actually uses them. The clause cannot be written first.

---

## Closed

- **Comms platform list** — verified 2026-09-04, all five real.
- **Case management platforms** — verified 2026-09-04, all real except the
  Monday.com question above.
- **AI tools list** — verified 2026-09-04, all twelve real products.
