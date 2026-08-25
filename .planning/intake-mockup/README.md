# Firm AI Policy intake — mockup

```bash
cd .planning/intake-mockup && python3 build_intake_mockup.py
```

Writes two self-contained files, both gitignored because they are generated:

| File | Use |
|---|---|
| `iurix-intake-mockup-light.html` | **the one to send.** Light only. |
| `iurix-intake-mockup.html` | follows the reader's system theme |

No network, no dependencies. The Stack Sans font and the Iurix mark and wordmark are read from
`public/fonts/` and `public/brand/` at build time and inlined as base64, so the mockup can only ever
show the typeface and mark the product actually ships. Double-clicking either file works offline.

## Why it exists

It is the review artifact for `ix-policymodules` — the intake that decides which modules a firm's
policy carries. **The mapping from answers to modules is the open piece**, per the board.

## What is in it, and where it came from

16 questions, 14 required and 2 optional, across six sections: Tools, Data, Review, Access, Clients,
Practice. Seven control types: radio, checkbox with a write-in escape, select, textarea, number, a
1–5 scale, and a date.

**The question wording is derived from Katy's research, not written by her.** She never wrote a
question list — what she wrote was the design rule for how a question must be phrased. Each question
traces to a line in her 2026-08-22 glossary or her 2026-08-20 brief:

- **Behavioural, never taxonomic.** *"Almost nobody answers 'do you use agentic AI' accurately."*
  So Q12 asks whether software messages clients before a person reads it.
- **Guard against under-reporting.** *"A firm asked whether it uses AI will say no while running
  technology-assisted review."* Hence Q6's "tick everything, even if you would not call it AI",
  and notetakers listed explicitly.
- **Ask about the payload, not the typing.** *"An intake question phrased as what do you put into it
  will get an answer about typing."* Hence Q2.
- **Jurisdiction is the switch.** West Virginia 24-01 is the strict bound — *"a module that satisfies
  West Virginia satisfies nearly everywhere, which is exactly what an intake question should switch
  on."* Hence Q11.

**Tell Katy this when you send it.** If she assumes she wrote the questions she will review the
wording and skip the derivation, which is the part that needs her.

## Decisions baked in

- **One question at a time** (Katy, 2026-08-25): *"if there are a bunch at a time it doesn't seem
  custom."* Progress is per **section**, never 1-of-16 — a long counter makes the form feel long,
  which defeats the point of showing one at a time.
- **No hedge options** (Katy, same day): *"eliminate all sometimes options. If a firm does an action
  then they need a policy for it."* Removed "Yes, occasionally", "It varies by matter" and "Only
  where the matter is sensitive". Consequence: `I don't know` is now the only soft answer, so it
  carries all the weight — which is why the escape answers state what they cost at the point of
  choosing.
- **Six one-word sections** so the tab labels sit on one line at any width.
- **Required-ness is shown by consequence, not by labelling.** Nothing is marked until Send is
  pressed; then only what is missing turns red. Optional numerals are grey with an asterisk.

## Still open

- The **answer → module mapping**. The sections here are a grouping of the questions, not the
  mapping that decides which policy modules a firm receives.
- **Q11's state list is a placeholder** — eight states plus "Other / multiple". All fifty, or only
  the states with published guidance plus a strict default?
- The **sixth policy module** (contract terms for a client's own AI use) has no question, because
  Katy's brief says it has no source behind it and is original drafting.
