# Framing correction — Rule 5.3 is not the north star

**Date:** 2026-08-24
**Source:** Katy, relayed by Max. A **correction, not a preference.**
**Done by:** Claude (this session), at Max's direction.

---

## The correction

The Rule 5.3 framing was set by the earliest planning sessions, was never revisited, and spread
from `CLAUDE.md` into every doc, the marketing copy, the transactional emails and the certificate
face. It is wrong.

- **The product is the firm's own written AI use policy**, generated and personalized per firm.
  That policy is what the customer buys.
- **The training exists to keep the firm's staff aligned to that policy.** The quiz, attestations
  and certificates are the evidence of that alignment.
- **ABA Model Rule 5.3 is outdated.** Background context; at most a supporting citation in fine
  print. Not the thesis, not the headline, not why anyone buys this.

Deliberate exception: the disclaimers in `.planning/legal/terms-of-service.md` (§3 and §11) name
the rule **in order to disclaim it**. That is protective. Leave them alone.

---

## 🔶 FOR KATY + ROB — authored content that still leads with Rule 5.3

**Not touched by this session.** This is Katy and Rob's curriculum; rewriting it is an authoring
decision, not a copy edit. Each item below teaches Rule 5.3 as the *reason* for the training,
which is the framing that was just corrected everywhere else. Until these are revised, the
training itself still argues the old thesis.

### 1. `lib/training/lessons.ts` — Lesson 1 summary and key takeaway

| Line | Current text | Problem |
|------|--------------|---------|
| 39 | *"…and why **ABA Model Rule 5.3 makes every staff member responsible** for ethical AI use, not just attorneys."* | Rule 5.3 is given as the reason the training exists. Should be: the firm's written AI policy is what staff are accountable to. |
| 43 | *"**ABA Model Rule 5.3 makes every staff member** — not just attorneys — responsible for ethical AI use."* | Same, as a stated key takeaway of Lesson 1. |

Note the two `keyTakeaways` either side of line 43 are already policy-neutral and fine.

### 2. `lib/training/questions.ts` — quiz question `l1q2`

| Line | Current text |
|------|--------------|
| 48 | *"**Under ABA Model Rule 5.3**, who remains responsible for work produced with AI assistance?"* (answer: the supervising attorney) |

The underlying point is sound; only the stem's framing is keyed to the rule.

**Already fine, no change needed:** `l3q…` questions at lines 181 and 196 already test *firm
policy* ("When firm policy is stricter than the ABA Model Rules…", "Consult your supervising
attorney or firm policy"). These are the model for how the rest should read.

### 3. Migrations carrying question text — `0003`, `0025`, `0026`

These contain the seeded question bank. Text changes here need a **new migration**, not an edit to
an applied one.

| File | Lines | What's there |
|------|-------|--------------|
| `supabase/migrations/0003_quiz_questions.sql` | 58, 61, 62, 65, 68, 93, 103 | Original 8-question placeholder bank — four question stems and explanations built on Rule 5.3, plus the lesson tag `PLACEHOLDER:rule-5.3-basics` |
| `supabase/migrations/0025_quiz_lesson_classification.sql` | 25, 30, 40 | Maps the tag `PLACEHOLDER:rule-5.3-basics` → Lesson 1. **Identifier, not prose** — renaming it is a data migration with no customer-facing benefit. Recommend leaving it. |
| `supabase/migrations/0026_question_pool_v1.sql` | 94, 96, 201, 215 | The live 50-question pool. One question's distractor + explanation are built on *"Rule 5.3 places the supervisory duty on the attorney"*; two explanations cite the rule as the authority. |

**Decision needed from Katy:** whether the revised questions should cite the firm's own policy in
place of the rule, or drop the citation entirely and test the behaviour. Rob then ships them as a
new migration.

---

## 🔷 Left alone deliberately — not content, not customer-facing

- `.planning/legal/*` — Desktop revised these on 2026-08-24. ToS §3 and §11 keep the rule on
  purpose (disclaiming it is protective).
- `app/privacy/page.tsx:29` — inside an `[ATTORNEY TO COMPLETE]` placeholder block. Legal
  territory; goes with the legal docs, not this pass.
- `.planning/sessions/*` — historical record, not live copy.
- `app/mockup/_components/{hero,features,why-section}.tsx` — the superseded design mockup at
  `/mockup`. Not the live landing page. Reframe only if that route is kept.
- Source comments that narrate the old framing (`app/page.tsx:19`, `app/_components/hero-section.tsx:5`,
  `app/dashboard/overview/page.tsx:159`, `app/api/invite/remind/route.ts:89`,
  `lib/verification.ts:142`, `lib/training/progress.ts:49,88`,
  `workers/cert-worker/src/index.ts:684`, `supabase/migrations/0017_nudge_event_type.sql:5`).
  These describe *why code is the way it is* and several are load-bearing history. The framing
  note now at the top of `CLAUDE.md` is the authoritative correction; these can be cleaned up
  opportunistically when the surrounding code is next touched.
