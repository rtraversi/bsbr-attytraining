-- =============================================================================
-- 0032 — delivery becomes an act with an author, not a timestamp somebody set
--
-- WHY
--
-- 0028 gave intake_sessions `policy_delivered_at` and its comment said what the
-- column really was: "Set by hand when Katy tells Max the policy has gone out."
-- Grepped 2026-09-01 — no code anywhere writes it. The column records that a
-- delivery happened and nothing about WHO decided it or WHY, which is fine for
-- a field nobody writes and wrong for one that is about to become the gate on
-- whether a firm may read its own policy.
--
-- 🔴 THAT GATE IS THE POINT. As of the same day, `delivered` is the only state
-- in which /dashboard/policy shows a firm its document; a submitted intake gets
-- a waiting screen. So `policy_delivered_at` stopped being a note and became an
-- APPROVAL — an attorney read the assembled policy and released it. An approval
-- with no author is not an approval.
--
-- ── No status change, deliberately ──────────────────────────────────────────
-- Delivery stays expressed by the timestamp. intakeStateOf() already reads it,
-- and already handles the D8-2 case where a firm edits after delivery by
-- comparing it against submitted_at. Adding a 'delivered' status would create a
-- second source of truth for the same fact and they would eventually disagree —
-- and 0031 has just finished removing the last status value that did that.
-- =============================================================================


-- ── 1. Who approved it ─────────────────────────────────────────────────────
--
-- `on delete restrict`, matching started_by in 0028 rather than reopened_by in
-- 0030, and the distinction is real. reopened_by is an audit detail on a row
-- that survives regardless, so it may go null when a user is deleted. This is
-- the AUTHORITY the delivery rests on: a delivered policy whose approver has
-- evaporated cannot say who released it, which is the one question this column
-- exists to answer.
--
-- Nullable, because every row that exists today was delivered by nobody — the
-- column is being added after the fact and backfilling an author would be
-- inventing a record of a decision.

alter table public.intake_sessions
  add column if not exists policy_delivered_by uuid references auth.users (id) on delete restrict,
  add column if not exists policy_delivered_note text;

comment on column public.intake_sessions.policy_delivered_by is
  'The operator who approved and released this policy. NULL on rows delivered before 0032, and on rows not yet delivered. `on delete restrict` — unlike reopened_by, this is the authority the delivery rests on, not an audit detail.';

comment on column public.intake_sessions.policy_delivered_note is
  'Free text recorded at delivery: why it was released, or what the reviewing attorney flagged. Operator-facing only — never shown to the firm.';


-- ── 2. The queue query ─────────────────────────────────────────────────────
--
-- The operator script asks one question: which submitted intakes are waiting?
-- That is a scan of `status = 'submitted'` ordered by submitted_at, and it runs
-- across ALL firms rather than within one — the only query in the intake that
-- does, which is why the existing firm_id indexes do not serve it.
--
-- Partial on the submitted status so the index holds only rows that can be in
-- the queue, and not every intake the platform has ever recorded. Deliveries
-- that have already happened stay in it, because a resubmission after delivery
-- (D8-2) puts a row back in the queue without changing its status — the script
-- filters those by comparing submitted_at against policy_delivered_at, and it
-- needs the index to find them.

create index if not exists idx_intake_sessions_delivery_queue
  on public.intake_sessions (submitted_at)
  where status = 'submitted';
