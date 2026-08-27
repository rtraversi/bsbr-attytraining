# `.planning/`: what each document is, and which one wins

**Written 2026-08-27** during a housekeeping pass, after a stale `STATE.md` and a June onboarding
checklist had been surfacing every morning as if they were current, and `session_handoff.md` had
been reporting work as undeployed for two days after it went live.

## The rule

**If you change something a document below asserts, change that document in the same commit.**
A status file that is read every morning and updated every three weeks is worse than none, because
it gets believed.

## Precedence

| Rank | Document | Authoritative for |
|---|---|---|
| 1 | `STATE.md` | where the project stands right now |
| 2 | `../session_handoff.md` | what happened last session, what is queued next |
| 3 | `sessions/<date>-*.md` | full detail for one day |
| 4 | `REQUIREMENTS.md` | **the only** authority for requirement IDs and their meaning |
| 5 | `../CLAUDE.md` | stack, constraints, framing |
| 6 | `archive/**` | history. Never current. Never cite it for status. |

Higher rank wins; the loser gets fixed. **Session notes are not an authority for requirement IDs.**
They have invented them before.

## Live documents

**Status and direction**
- `STATE.md`: current position, blockers, decisions in force. Start here.
- `ROADMAP.md`: the phase plan.
- `REQUIREMENTS.md`: the requirement IDs. The only source for them.
- `PROJECT.md`: what the product is.
- `OPEN-ISSUES.md`, `BACKLOG.md`: issue lists. Both predate the intake; check dates before trusting.

**Decisions and corrections**
- `FRAMING-CORRECTION-2026-08-24.md`: Rule 5.3 is not the thesis. **Supersedes anything older that
  says otherwise.**
- `POLICY-DECISIONS.md`: Max's decisions, verbatim with dates, that the legal pages are written from.

**Operations**
- `DEPLOY-RUNBOOK.md`: how deploys actually work (GitHub Actions, not a laptop).
- `PROD-CUTOVER.md`: the STAGING to PROD cutover; also the record of what is applied to PROD.
- `DEV-SANDBOX.md`, `ENVIRONMENTS-EXPLAINED.md`: which database you are pointed at, and why it matters.
- `MONITORING.md`: monitoring plan. The external uptime monitor is still not chosen.

**Reference and source material**
- `DATA-INVENTORY.md`: every field, read out of the schema. Privacy, Cookies and the DPA are
  written from this so they cannot contradict each other.
- `intake-spec.md`: the policy intake specification.
- `question-bank.xlsx`: source of truth for the certification questions. `QUESTION-POOL.md` is the
  working notes; the migration is generated from the spreadsheet, not hand-edited.
- `MARKETING.md`, `legal/`, `design-handoff/`, `redesign-mockups/`, `intake-mockup/`, `research/`.

**Findings, kept for the record**
- `INTERFACE-CORRECTIONS.md` (2026-07-10 user test), `REMINDER-SYSTEM-AUDIT.md` (2026-07-30).
  Both are investigations with open questions in them; neither is a status document.

## `archive/`

Work that is finished or superseded. Every file in there carries a dated banner saying why.
Nothing in `archive/` should ever be quoted as current status. Moving a document there is
`git mv` and is reversible; when a document's work is done, move it rather than leaving it to be
misread by the next session.
