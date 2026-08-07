# Certification question pool — working bank

**Status:** Drafting workspace only. This file does not change the live quiz,
the database, or the SCORM course.

**Purpose:** Build a reviewed pool of 30 questions — six for each of the five
SCORM lessons — while keeping every eight-question certification assessment
representative of the entire course.

**Sources:**

- SCORM course: `public/training-content/scorm-v1/scormcontent/runtime-data.js`
- Existing seed questions: `supabase/migrations/0003_quiz_questions.sql`

The eight existing rows are all explicitly tagged `PLACEHOLDER`. They are good
starting material, but are not presumed launch-ready. A revised question must
still have four choices, one unambiguously best answer, and a short explanation
grounded in the lesson.

---

## Target structure

| Lesson | Target pool | Existing reusable questions | New questions needed |
|---|---:|---:|---:|
| 1. Introduction to AI in Legal Practice | 6 | 1 | 5 |
| 2. Protecting Client Confidentiality with AI Tools | 6 | 1 | 5 |
| 3. Ensuring Accuracy: Verification and Supervision of AI Outputs | 6 | 4 | 2 |
| 4. Compliant AI Workflows: Automations vs. Chatbox Use | 6 | 0 | 6 |
| 5. Applying Ethical Rules and Firm Policy to Everyday AI Use | 6 | 2 | 4 |
| **Total** | **30** | **8** | **22** |

### Proposed eight-question assessment blueprint

Every attempt should cover all five lessons, rather than drawing eight wholly
at random:

| Lesson | Questions served per attempt |
|---|---:|
| 1 | 1 |
| 2 | 2 |
| 3 | 2 |
| 4 | 1 |
| 5 | 2 |
| **Total** | **8** |

This is a content design proposal. The current server selects eight questions
uniformly from the active pool; changing it to enforce this blueprint is a later
code change, after the bank is approved.

---

## Existing questions — mapped to primary lesson

When you swap answer choices, update the correct answer as well. The database
stores the correct choice by its **zero-based position** (`correct_index`), not
by its wording.

### Lesson 1 — Introduction to AI in Legal Practice

**L1-01 · Reuse/review**

- **Existing tag:** `PLACEHOLDER:rule-5.3-basics`
- **Stem:** Under ABA Model Rule 5.3, which statement best describes an
  attorney's duty regarding AI tools used by their staff?
- **Correct concept:** Attorneys must make reasonable efforts to ensure staff
  AI use is compatible with professional obligations.
- **Why it belongs here:** The lesson introduces the two core compliance risks
  and the roles/responsibilities of attorneys and non-attorney staff.
- **Review note:** Keep the core rule; make distractors reflect realistic
  misunderstandings about "the tool" versus the lawyer's supervisory duty.

### Lesson 2 — Protecting Client Confidentiality with AI Tools

**L2-01 · Reuse/review**

- **Existing tag:** `PLACEHOLDER:confidentiality`
- **Stem:** Before allowing staff to use an AI tool that processes client
  information, the supervising attorney should:
- **Correct concept:** Evaluate retention practices, confidentiality
  protections, and terms of service.
- **Why it belongs here:** The lesson covers identifying information, chatbox
  risks, approved workflows, and when to stop and ask.
- **Review note:** A strong replacement option set can distinguish vendor
  marketing claims from actual firm approval and a confidentiality agreement.

### Lesson 3 — Ensuring Accuracy: Verification and Supervision of AI Outputs

**L3-01 · Reuse/review**

- **Existing tag:** `PLACEHOLDER:supervision`
- **Stem:** A paralegal uses an AI tool to draft a client letter and sends it to
  the client without attorney review. Under Rule 5.3, this most likely creates:
- **Correct concept:** A potential ethics violation if the content is
  inaccurate or misleading.
- **Review note:** Make the correct answer focus on verification before
  client-facing use, not merely the fact that AI was used.

**L3-02 · Reuse/review**

- **Existing tag:** `PLACEHOLDER:hallucination`
- **Stem:** Which is the most significant risk when staff use an AI tool to
  research case law?
- **Correct concept:** AI-generated citations may be fabricated and must be
  independently verified.
- **Review note:** Retain; this directly matches the lesson's fictitious
  citation and misstated-holding material.

**L3-03 · Reuse/review**

- **Existing tag:** `PLACEHOLDER:error-escalation`
- **Stem:** If a staff member discovers that an AI tool has produced a
  significant error in a client document, the correct first step is:
- **Correct concept:** Immediately notify the supervising attorney.
- **Review note:** Retain; it tests escalation and the attorney's final
  decision, both central to the lesson.

**L3-04 · Reuse/review**

- **Existing tag:** `PLACEHOLDER:hallucination-definition`
- **Stem:** Which of the following is the most accurate description of an AI
  "hallucination" in a legal context?
- **Correct concept:** False or fabricated information presented confidently
  as fact.
- **Review note:** Useful foundation question, though a scenario-based version
  may assess learning better than a definition alone.

### Lesson 4 — Compliant AI Workflows: Automations vs. Chatbox Use

**No existing question.** This lesson needs six new questions covering the
chatbox/automation distinction, approved prompts, secure API workflows, vendor
agreements, firm approval, and recognizing unauthorized tools.

### Lesson 5 — Applying Ethical Rules and Firm Policy to Everyday AI Use

**L5-01 · Reuse/review**

- **Existing tag:** `PLACEHOLDER:upl-confidentiality`
- **Stem:** A staff member uses an AI chatbot to respond to a client question
  about their legal matter without attorney review. The primary ethics concern
  is:
- **Correct concept:** It risks unauthorized legal advice and exposing
  confidential client information.
- **Review note:** Keep the scenario; make the wrong answers realistic but
  clearly less protective than stopping and escalating.

**L5-02 · Reuse/review**

- **Existing tag:** `PLACEHOLDER:reasonable-supervision`
- **Stem:** Under Rule 5.3, "reasonable supervision" of staff AI use most
  likely requires:
- **Correct concept:** Firm AI policies, appropriate training, and periodic
  review of staff AI outputs.
- **Review note:** Retain; it aligns with the lesson's approved-use boundaries,
  policy, and escalation path.

---

## New-question intake

Max can draft two question ideas per lesson first (10 total). Send only the
lesson, the scenario or question, and the correct action/concept; Codex will
draft the four answer choices, explanation, section tag, and remaining coverage
questions for review.

```text
Lesson: L# — title
Course heading or topic: exact heading from the lesson, if known
Question/scenario:
Correct action or concept:
Optional: any wording, example, or wrong answer you want included/avoided
```

### Draft slots

| ID | Lesson | Topic / SCORM heading | Question or scenario | Correct action / concept | Review |
|---|---|---|---|---|---|
| L1-02 | 1 |  |  |  |  |
| L1-03 | 1 |  |  |  |  |
| L2-02 | 2 |  |  |  |  |
| L2-03 | 2 |  |  |  |  |
| L3-05 | 3 |  |  |  |  |
| L3-06 | 3 |  |  |  |  |
| L4-01 | 4 |  |  |  |  |
| L4-02 | 4 |  |  |  |  |
| L5-03 | 5 |  |  |  |  |
| L5-04 | 5 |  |  |  |  |

---

## Implementation after content approval

1. Review the 30-question bank for legal accuracy, course alignment, and one
   clearly best answer per question.
2. Create a data migration that retires the eight placeholder rows and inserts
   the reviewed bank with durable lesson-based `section_tag` values.
3. Update the server-side selection rule to enforce the assessment blueprint.
4. Test: every exam has eight questions, every lesson is represented, the
   answer key stays server-only, and a retake receives a different session.
5. Apply that migration to staging; include it with the pre-proof migrations to
   PROD during the cutover window.
