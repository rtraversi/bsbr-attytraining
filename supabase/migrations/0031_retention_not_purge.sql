-- =============================================================================
-- 0031 — the purge is removed. Answers are kept for the life of the
--        subscription instead.
--
-- WHY
--
-- Katy reversed her own earlier position on 2026-08-31 (D8-1 and D8-3 in
-- .planning/POLICY-ENGINE-MAP.md §13):
--
--   "We should save the previous responses so they can easily redo without
--    typing in everything from scratch"
--   "It should be as long as they have a paid subscription"
--
-- 0028 was built the other way round. It gave intake_sessions a `purged` status
-- and a `purged_at` column, and its own comments describe the row as "the
-- receipt" that "says nothing whatsoever about what they answered". That is the
-- model being withdrawn: a paying firm that had told us fifty things about
-- itself was going to lose all of it thirty days after we delivered its policy.
--
-- 🔴 WHAT REPLACES IT IS NOT A COLUMN. Retention is now a property of the
-- SUBSCRIPTION, computed from firms.status and firms.current_period_end, which
-- the Stripe webhook already maintains on every subscription event. See
-- lib/intake/retention.ts. A retention column here would be a second thing to
-- keep true, and it would be true only as often as somebody remembered to
-- write it.
--
-- ── This does not touch 0030 ────────────────────────────────────────────────
-- reopened_at / reopened_count / reopened_by all stay. D8-2 moves the LOCK, not
-- the RECORD: Katy may be drafting from answers that change under her, and the
-- counter is how her export says so. It matters MORE now, not less — reopening
-- after delivery is exactly the case it was written for.
--
-- ── Safe to run, and effectively a no-op on data ────────────────────────────
-- Nothing ever wrote purged_at or set status = 'purged'. The purge was 0028's
-- batch 4 and batch 4 was never built — there is no route, worker or cron
-- anywhere in the repo that performs it. The UPDATE below is therefore expected
-- to touch zero rows, and it is here so that this migration is correct rather
-- than merely correct-today: if a row somehow carries the retired status, the
-- new CHECK would reject the table without it.
--
-- ⚠️ PROD IS STILL BEHIND. As of 2026-09-01 production has none of 0028, 0029
-- or 0030, so the whole intake remains staging-only and this stacks on that.
-- Push 0028 → 0029 → 0030 → 0031 in order, and create the `Intake-uploads`
-- Storage bucket (capital I, case-sensitive; no migration can make it) in the
-- same window.
-- =============================================================================


-- ── 1. The index that existed only to find purge candidates ────────────────
--
-- "submitted, delivered, not yet purged" is not a question anyone asks any
-- more. Dropped first: it is a partial index whose predicate names both of the
-- things being removed below.

drop index if exists public.idx_intake_sessions_purge_due;


-- ── 2. Any row still carrying the retired status ───────────────────────────
--
-- Expected: zero rows. See the header.

update public.intake_sessions
   set status = 'submitted'
 where status = 'purged';


-- ── 3. The status domain loses 'purged' ────────────────────────────────────
--
-- Dropped and recreated rather than altered, because a CHECK constraint cannot
-- be narrowed in place. The name is the one Postgres generated for 0028's
-- inline check; `if exists` covers a database where it was named differently.

alter table public.intake_sessions
  drop constraint if exists intake_sessions_status_check;

alter table public.intake_sessions
  add constraint intake_sessions_status_check
  check (status in ('in_progress', 'submitted'));


-- ── 4. purged_at ───────────────────────────────────────────────────────────
--
-- 🔴 THIS DROPS A COLUMN, WHICH IS NOT REVERSIBLE. It is safe because the
-- column has never held a value: no code path writes it (see the header), and
-- the only readers were the state function and the reopen route, both of which
-- stopped referencing it in the same commit as this file.

alter table public.intake_sessions
  drop column if exists purged_at;


-- ── 5. The comments 0028 wrote around the purge ────────────────────────────

comment on table public.intake_sessions is
  'One run of the policy intake. The answers are KEPT — for the life of the '
  'firm''s paid subscription plus a renewal grace period (D8-3, computed in '
  'lib/intake/retention.ts from firms.status and firms.current_period_end). '
  'This row is not a receipt standing in for deleted answers; the answers are '
  'still there.';

comment on column public.intake_sessions.status is
  'in_progress → submitted (answers promoted to firms/firm_members). Reopening sends it back to in_progress, and may happen at any time including after the policy is delivered (D8-2).';

comment on column public.intake_sessions.policy_delivered_at is
  'When the policy went out. It no longer locks anything: compared against submitted_at, it says whether the delivered document still matches the current answers. A later submitted_at means the firm revised its answers and a fresh policy is due.';
