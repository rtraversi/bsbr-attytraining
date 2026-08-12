# `ix-prodseed`

**Owner:** Terminal · **State:** In progress · **Section:** Iurix

> Captured 2026-08-12, when the board moved to a one-sentence-per-row schema. The board now
> carries the action only (`t`), with the problem, the fix and any blocker in `p` / `x` / `n`.
> Everything below is the record: the full text as it stood, verbatim, losing nothing.
>
> Append a new dated section rather than editing the ones below. A superseded claim that is
> still readable is worth more than a tidy file.

---

## Board text as of 2026-08-12

✅ THE OPEN DECISION IS CLOSED. LOGGED 2026-08-07 (Max): the PROD test rows get PURGED after the proof, not kept and documented. Rationale: stale test data destroys the daily reconciliation report's credibility on the day of the first real sale, which is the same trap the 17 staging test firms represent (see ix-testfirmfuse) and the reason PROD was kept clean at all. ⚠ SEQUENCING, easy to get wrong: this CANNOT BE EXECUTED before the cutover. The proof needs a firm on PROD, a firm only exists via Stripe checkout to the provisioning webhook, and checkout only reaches PROD once the app points there. So today is PREP ONLY. Terminal delivers two things: (1) scripts/purge-prod-test-firm.mjs, taking one explicit firm id, dry-run by default, requiring --confirm to delete, printing per-table row counts first, and refusing to run unless the target project ref is passed explicitly and matches the loaded env. RESTRICT foreign keys force training_events, then firms, then auth.users, but derive the FULL order from the schema rather than that three-item sketch, since enrollments, quiz_attempts, cert_generation_queue, certificates, firm_members and seats all hang off firms too. Model the safety posture on scripts/remove-avatars-bucket.mjs. (2) The ordered seed runbook appended to .planning/PROD-CUTOVER.md. Dry-run against staging only. Do not run the purge against anything. ✅ PREP DELIVERED 2026-08-07 in 3745d49: scripts/purge-prod-test-firm.mjs exists with dry-run default, explicit --firm and --project-ref, and a refusal when the named ref disagrees with the loaded env. Order derived from the schema, not the three-item sketch: storage objects, then training_events, then firms (cascading to seven tables), then auth.users. Dry-run verified against staging; a mismatched ref was refused. Runbook appended to PROD-CUTOVER.md. 🔴 EXECUTION IS STILL GATED ON THE CUTOVER and has not happened. Nothing has been run with --confirm anywhere.
