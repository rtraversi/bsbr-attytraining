# Research brief — the 20 vendor blocks

**Written 2026-08-31 (Max, desktop).** Self-contained: a person or an agent can execute this
without the conversation it came from.

**Fill in `.planning/policy-blocks.csv`. That file is the deliverable. Nothing else.**

---

## 1. Why this exists

Katy's policy template has three bracketed slots that each say "insert something specific to what
the firm picked". Her words, from `.planning/AI-Policy-Research-2026-08-20.md`:

| Slot | Katy's bracket |
|---|---|
| P9 | *"legal research specific tool: insert relevant policies needed for the selected tool — **must research specifics**"* |
| P14 | *"CHECK CASE MANAGEMENT SELECTED, EG if CLIO, then insert the AI part of CLIO and state that use of AI enhanced CLIO shall comply with this policy"* |
| P16 | *"research the specific interoffice communication and list the policy related to it, eg Teams or Telegram"* |

The policy engine assembles a firm's AI policy from its intake answers. When a firm says it uses
Clio, those slots have to emit something true about Clio. Today they emit nothing, because nobody
has done this research. **This is the largest remaining content hole in v1.**

The 20 rows in the CSV are the exact option values a firm can pick, taken from
`lib/intake/questions.ts`. **Do not add, rename or remove rows.** `id` is a join key; if it stops
matching the intake, the block never fires.

---

## 2. The five questions, per vendor

1. **Does the product have AI features, and what are they called?** (e.g. Clio Duo, MyCase IQ)
2. **Are they on by default, or opt-in?**
3. **Does the vendor use customer data to train models?** Read the terms, not the marketing page.
4. **Is there an admin control to disable the AI features or the training use, and where is it?**
5. **Is a DPA or no-training commitment available, and does it require a particular plan?**

Question 3 is the one that matters most. The whole policy turns on whether client data can reach a
model that trains on it.

---

## 3. Where to look, in order

1. The vendor's **Terms of Service** and **Data Processing Addendum / DPA**
2. The vendor's **Trust / Security / AI** page
3. The vendor's **admin help documentation** for the AI feature

Nothing else counts as a source. See §5.

---

## 4. Filling the CSV

| Column | Values | Notes |
|---|---|---|
| `id`, `display_name`, `category`, `tier` | **pre-filled** | do not edit |
| `has_ai` | `yes` / `no` / `unclear` | |
| `ai_feature_name` | free text | the product name, e.g. `Clio Duo`. Blank if `has_ai=no` |
| `ai_on_by_default` | `yes` / `no` / `n_a` / `unclear` | |
| `trains_on_customer_data` | `yes` / `no` / `no_by_contract` / `unclear` | `no_by_contract` = only under a signed DPA |
| `optout_available` | `yes` / `no` / `n_a` / `unclear` | |
| `optout_location` | free text | where the setting lives, e.g. `Settings > AI > Data usage` |
| `dpa_available` | `yes` / `no` / `unclear` | |
| `dpa_requires_plan` | free text | e.g. `Enterprise only`, or blank |
| `source_url_1` | URL | **REQUIRED on every row** |
| `source_url_2` | URL | optional |
| `quoted_sentence` | text | **REQUIRED.** The actual sentence relied on for `trains_on_customer_data`. Verbatim, in quotes |
| `date_checked` | `YYYY-MM-DD` | **REQUIRED on every row** |
| `notes` | free text | anything that did not fit, including what you looked at and could not find |

---

## 5. 🔴 Rules that protect this from being wrong

These matter more than completeness. A confidently wrong answer here ends up in a document an
attorney relies on.

1. **Every non-empty finding needs a source URL on the vendor's own domain.** No URL, no claim.
2. **`unclear` is a correct and useful answer.** It is not a failure. It routes to the action item
   list, which tells the firm to go and confirm the setting themselves — Katy's own pattern for
   uncertainty (P11). **Never guess to fill a cell.**
3. **Do not source a vendor's terms from a blog post, a comparison site, a review, or a competitor.**
   Only the vendor's own pages.
4. **Quote, do not paraphrase**, in `quoted_sentence`. If you cannot find a sentence to quote, the
   answer is `unclear`.
5. **Do not infer from the product tier.** A consumer plan with a signed no-training addendum is
   compliant and an enterprise plan without one is not. This is settled here: the tier column was
   removed from the intake on 2026-08-28 for exactly this reason.
6. **Note the terms' own version or last-updated date** in `notes` where the page shows one.

⚠️ **If this is delegated to an agent:** vendor terms are precisely the kind of fact a model will
state fluently and wrongly. Rules 1, 2 and 4 exist for that. A row with a confident answer and no
quoted sentence should be treated as unverified and redone.

---

## 6. Order of work

| Tier | Rows | Why |
|---|---|---|
| **1** | Clio, MyCase, CoCounsel, Westlaw Edge, Lexis+ AI, Microsoft Teams, Slack | Highest share among small US firms. **Do these first — they will cover most customers.** ~3–4 hours |
| **2** | PracticePanther, Smokeball, Filevine, Monday.com | Common enough to hit |
| **3** | Actionstep, Litify, Rocket Matter, CosmoLex, Neos, Vincent AI, Ask Practical Law, Telegram, Signal | Long tail. The generic fallback (§7) carries these until someone picks one |

Roughly 30 minutes per row. **10 hours for all 20; tier 1 alone is under 4.**

---

## 7. What happens if a row stays empty

Nothing breaks. The engine emits a **named generic block** instead:

> The firm uses **[Platform]**. The firm shall confirm whether [Platform]'s AI features are enabled,
> review [Platform]'s terms of service for data-training language, and record the result.

That is true for every vendor, needs no research, and never goes stale. A completed row **upgrades**
that generic text to something specific. **So this research is an improvement to a working engine,
not a prerequisite for one**, and it can be done a row at a time, in any order, by anyone.

---

## 8. Out of scope

- **Do not draft policy language.** The CSV holds facts. The policy sentences are generated from
  them, in one place, so wording stays consistent across all 20.
- **Do not research `general_llms`, `email_only` or `none`.** Not vendors. Already handled by P12
  and by the absence of a third party.
- **Do not evaluate or rank the vendors.** No recommendations, no security scoring.
- **Do not add rows** for tools not in the intake.
