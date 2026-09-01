-- =============================================================================
-- 0030 — a submitted intake can be reopened, and the fact is recorded
--
-- WHY
--
-- A submitted intake was a dead end. app/intake/page.tsx locked on
-- `status !== 'in_progress'` and a locked session deliberately loaded no
-- answers, so a firm that pressed Send saw an empty screen from then on: they
-- could not check what they had said, let alone correct a wrong roster address
-- or a jurisdiction they picked in a hurry. The only remedy was to email and
-- ask an operator to edit the database.
--
-- Reopening is now a firm-facing action, available until the policy is
-- delivered.
--
-- 🔴 WHY THE COUNTER IS THE POINT OF THIS MIGRATION
--
-- Not the reopening — that needed no schema at all, because `status` already
-- has 'in_progress' in its CHECK and flipping back to it is a plain UPDATE.
-- What needed a column is the RECORD.
--
-- Katy may already be drafting from a submitted intake. Answers changing under
-- her silently is worse than not allowing the edit at all: she would deliver a
-- policy written from a jurisdiction, a roster or a tool list the firm had
-- since changed, and neither of them would ever know why it was wrong. So the
-- session carries how many times it went back, when, and who did it, and her
-- export can say "this was reopened after you started" rather than quietly
-- handing her different answers.
--
-- ⚠️ PROD IS BEHIND. As of 2026-08-28 production has neither 0028 nor 0029 —
-- the whole intake is staging-only, and this stacks on top of that. Push
-- 0028, 0029 and 0030 together, in order, and create the `Intake-uploads`
-- Storage bucket (capital I, case-sensitive, no migration can make it) in the
-- same window. Relink the CLI back to staging afterwards.
-- =============================================================================

alter table public.intake_sessions
  add column if not exists reopened_at    timestamptz,
  add column if not exists reopened_count integer not null default 0,
  -- `on delete set null`, deliberately NOT the `on delete restrict` that
  -- started_by carries. That one restricts because the receipt exists to
  -- outlive the account; this is an audit detail on a row that survives
  -- regardless, and making it restrict would add a brand new reason a user
  -- cannot be deleted — a cost with no matching benefit.
  add column if not exists reopened_by    uuid references auth.users (id) on delete set null;

comment on column public.intake_sessions.reopened_at is
  'When the firm last reopened this intake after submitting it. NULL means it has never been reopened.';

comment on column public.intake_sessions.reopened_count is
  'How many times this intake went back from submitted to in_progress. Katy''s export reads it: a non-zero count means the answers she is drafting from changed after she received them.';

comment on column public.intake_sessions.reopened_by is
  'The firm admin who last reopened it. Nullable — the audit detail is worth keeping, but not worth blocking a user deletion for.';

-- ── The index that makes reopening safe ─────────────────────────────────────
--
-- Nothing is added here, and that is the point of this comment: 0028's
-- idx_intake_sessions_one_open_per_firm is UNIQUE on (firm_id) WHERE status =
-- 'in_progress', and reopening flips a row INTO that state. So the index is now
-- load-bearing for a second reason it was not written for — it is what stops a
-- reopen from producing two open sessions racing each other into promote.
--
-- POST /api/intake/reopen therefore relies on it rather than checking first: it
-- runs one conditional UPDATE and treats 23505 as "this firm already has an
-- open intake", which is the only way that error can arise here. A read-then-
-- write check would have a gap between the two halves; the index does not.
