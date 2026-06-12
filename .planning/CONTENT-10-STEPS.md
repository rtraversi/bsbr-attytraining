# Content 10 Steps — Course Production Track

Content-production checklist for the AI compliance training course. Runs **in parallel** with the dev track (`NEXT-10-STEPS.md`). Owner is Rob unless noted; Max's Claude / Rob's Claude can expand any task into detailed sub-steps on request.

**Created 2026-06-12** — reflects the course-format pivot to interactive Articulate Rise 360 content (pending trial validation) + custom React certification quiz as the certifiable layer. See `STATE.md` Locked Decisions and the COURSE-section note in `REQUIREMENTS.md`.

---

### Task 1: Start Articulate 360 trial

**Owner:** Rob | **Status:** Not started

Sign up for the 30-day Articulate 360 trial (no card required), open Rise 360, and get comfortable with the block types (flip cards / "interactive cards," scenario blocks, click-to-reveal, knowledge checks).

**Done when:** Logged into Rise and comfortable navigating blocks.

---

### Task 2: Course outline

**Owner:** Rob + Claude | **Status:** Not started

Structure the course into 5–7 sections from `MARKETING.md`:
the Rule (5.3) → why AI changed everything → real sanction cases (Mata, Crabill, Wadsworth, Noland, Ellis/K&L Gates) → state bar landscape (FL, CA, NY, TX, NC) → firm do's & don'ts → what the certificate means.

**Done when:** Outline doc approved — every section has a purpose, a target length, and intended interaction types.

---

### Task 3: Pilot section in Rise

**Owner:** Rob | **Status:** Not started

Build the sanction-cases scenario section for real: flip cards for the cases, a "your paralegal hands you a ChatGPT-drafted brief — what do you do?" pick-the-right-response scenario.

**Done when:** The pilot section feels like the corporate trainings being emulated — on desktop **and** phone.

---

### Task 4: DECISION GATE — lock the course format

**Owner:** Rob | **Status:** Not started

Based on the pilot: lock the Rise hybrid (buy the Articulate 360 license, ~$1,449/yr) or fall back to custom React interactive blocks, then H5P. **Tell Claude the outcome** so COURSE-01..05 and ROADMAP Phase 2 success criteria 1–2 get rewritten.

**Done when:** License purchased (or fallback chosen) and planning docs updated.

---

### Task 5: Write full course content

**Owner:** Rob + Claude | **Status:** Not started

Block-by-block copy for every section: card text, scenario setups + per-answer feedback, knowledge-check questions (ungraded). Written in the Built Smart by Rob voice — plain language, no enterprise jargon.

**Done when:** Complete draft for all sections.

---

### Task 6: Build the full course in Rise

**Owner:** Rob | **Status:** Not started

All sections + ungraded knowledge checks, brand colors/logo applied.

**Done when:** Course is clickable start-to-finish in Rise preview.

---

### Task 7: Certification quiz question pool

**Owner:** Rob + Claude | **Status:** Not started

24–32 multiple-choice questions tagged to course sections, each with the correct answer + an explanation, delivered as a structured doc/sheet ready for DB seeding. Quiz draws 8–10 per attempt; pass threshold 80% (COURSE-06, COURSE-09).

**Done when:** Pool reviewed for even section coverage; 8–10-question draws make sense at the 80% threshold.

---

### Task 8: Certificate template design

**Owner:** Rob | **Status:** Not started

Visual layout: BSBR logo, typography, unique cert ID, expiry date **on the cert face**, issuer identification, disclaimer block. Feeds Max's Phase 4 `pdf-lib` build.

**Done when:** Template approved on screen and print; handed to Max.

---

### Task 9: Attorney review

**Owner:** Rob | **Status:** Not started

Course content, quiz pool, cert template — plus the marketing landing copy and TOS review already flagged as the Phase 5 external blocker. Budget $500–$1,500. (If the Rise license is bought, Review 360 share-links work well for this.)

**Done when:** Written sign-off received.

---

### Task 10: Final publish + handoff to Max

**Owner:** Rob + Max | **Status:** Not started

Export the Rise web package into the repo/hosting, deliver the question pool in seed format, run a mobile + accessibility QA pass.

**Done when:** Course loads inside the app's course page; quiz pool seeded in the dev DB.

---

## Sequencing Notes

- **Tasks 1→4 are sequential** — the decision gate (Task 4) is the point of the trial; don't write all the content (Task 5) before it in case the format changes.
- **Tasks 5–8 can overlap** once the gate clears — the quiz pool (7) and cert design (8) don't depend on Rise at all and can start any time, even during the trial.
- **Task 9 needs 6–8 drafted; Task 10 is last.**
- **Schedule pressure is mild:** the platform accepts placeholder content through Phase 4 — only the Phase 5 public launch blocks on Tasks 9–10.
