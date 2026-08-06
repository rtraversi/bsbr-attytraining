# `ix-contactc4`

**Owner:** Terminal · **State:** In progress · **Section:** Iurix

[Live board](https://claude.ai/code/artifact/fd19e15d-9757-4e0d-9433-b78348329075)

> Captured 2026-08-06, when this item had grown to **1,240 characters** on the
> board. The board now carries the current ask only. Everything below is the record: the
> reasoning, the verbatim decisions, and the corrections made to earlier claims.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-06

✅ Address confirmed by Rob: info@iurixaccreditation.com. Same local part as the retired one, so the three live surfaces (privacy, terms, dpa) are a domain swap, not a rewrite. Also retires the solarsaiko@gmail.com hardcode at api/support/contact/route.ts:8 and the temporary Worker fallback. ⚠ Touches Max's legal-page drafting surface, so confirm timing before running.

---

## Full text, captured 2026-08-06

🟡 OWNER MOVED OFF ROB 2026-08-04 — he answered, so nothing here is blocked on him any more; what remains is code. ✅ ADDRESS CONFIRMED by Rob via Max: info@iurixaccreditation.com. Same local part as the retired address, so all three live surfaces (privacy, terms, dpa) are a DOMAIN SWAP, not a rewrite. Also retires the solarsaiko@gmail.com hardcode in app/api/support/contact/route.ts:8 and the TEMPORARY fallback set on the Worker 2026-08-03. Queued as Task 1 of ~/.claude/plans/iurix-prelaunch-batch.md — but it touches Max's legal-page drafting surface, so confirm timing before running. WAS: BLOCKED on Rob's business contact address — info@aistaffcompliance.com is still hardcoded in 4 files (privacy, terms, dpa, plus the OPERATOR_ALERT_EMAIL fallback in the Stripe webhook). ✅ CORRECTED 2026-08-03: this row previously said 5 files including login, “rendering LIVE on the production /login footer”. That went stale the moment Batch 1 shipped on 07-31 (commit 2cc9cc2) and nobody updated the row. Verified 2026-08-03: grep returns 4 live uses, login/page.tsx carries only a COMMENT naming the old address, and curl of the live /login returns ZERO occurrences. Cutover item C4. noreply@ can't substitute — these are “contact us” links
