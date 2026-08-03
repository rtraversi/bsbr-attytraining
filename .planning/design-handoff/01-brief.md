# 01 — The brief

## The product in one paragraph

**Iurix Accreditation** certifies law-firm staff on responsible AI use under **ABA Model Rule 5.3**.
A firm buys seats, invites their staff, and each staff member works through an interactive course
and then passes a scored certification. Passing issues a dated PDF certificate with a unique ID.
The firm's administrator gets a dashboard showing who is certified, their scores, and when
re-certification is due. The whole flow is self-serve — no salesperson, no onboarding call.

## Who is buying

A **solo attorney or a partner at a firm of 1–15 people.** Characteristics that should shape every
design decision:

- They are **personally liable**. Rule 5.3 makes the supervising attorney responsible for what
  their nonlawyer staff do. Opinion 512 (July 2024) extended that explicitly to AI tools.
- They are **buying evidence, not education**. The training is the mechanism; the certificate and
  the audit trail are the product.
- They are **conservative buyers of software** and sceptical of anything that looks flimsy,
  temporary, or overtly "AI-generated."
- They are **time-poor**. The purchase decision has to be makeable in a single visit.
- They are frequently **not the person who takes the training** — they buy it for their staff.

## The job the site has to do

In priority order:

1. **Make the liability real** in the first screen, without fear-mongering. The visitor should
   understand within seconds that this is their problem, not their staff's problem.
2. **Establish that this is a finished, operating product** — not a pre-launch page. The previous
   site was a "coming soon" page with a waitlist. That era is over; the product is live and
   purchasable today.
3. **Get them to checkout.** One primary action, repeated. Seat-count pricing is transparent and
   should not be hidden behind a contact form.
4. **Survive scrutiny.** A lawyer will read the disclaimer. Make sure the page reads as precise
   and carefully worded, because it is.

## Scope — what you are designing

| Route | What it is | Notes |
|---|---|---|
| `/` | Homepage | The main deliverable. Full copy in `03-copy.md` |
| `/pricing` | Pricing page | Has a working interactive seat slider that must be preserved — see `04-tech-constraints.md` |
| `/privacy` | Privacy Policy | Long-form legal document template |
| `/terms` | Terms of Service | Same template |
| `/ai-policy` | AI Use Policy | Same template. **New route** |
| `/dpa` | Data Processing Addendum | Same template. *Existing; may be retired — confirm with the client* |

A fifth legal route, `/accessibility`, is drafted but **deliberately deferred** and is not in this
scope. Build the template so adding it later is a content change, not a design change.

The legal pages share **one long-form document template**. Each is a title, a "last updated" line,
and roughly 8–19 numbered sections of prose, some with sub-headings, tables, and blockquoted
all-caps disclaimer blocks. They should feel like part of the same brand but be quiet and highly
readable.

**These are substantial documents, not stubs** — the Terms run to 19 sections. Design the container
for real length: a comfortable measure, clear section hierarchy, and ideally an in-page table of
contents or section navigation. Ask the client for the current drafts if you want exact copy to lay
out against.

You are also designing the **shared site header and footer** used across all five routes.

## Out of scope — do not design these

- **The authenticated application.** Dashboard, training player, quizzes, settings, support. It is
  built, deployed, in daily use, and has its own established design system. Leave it alone.
- **Sign-in, onboarding, and password screens.** Already designed and built.
- **Transactional emails and the PDF certificate.** Already built.
- **The course content itself.** Authored in Articulate Rise by the client and a practising attorney.

## Tone

Precise, plain, and unhurried. Short sentences. No exclamation marks, no growth-hack copywriting,
no "revolutionise your firm." The approved copy in `03-copy.md` sets the register — match it.

Two words to avoid entirely, for legal reasons: **"accredited"** and **"guarantee."** The product
issues a certificate of completion. It is not bar-accredited and does not guarantee compliance, and
the disclaimer says so explicitly. Do not let marketing copy contradict the disclaimer.
