-- =============================================================================
-- 0028_policy_intake.sql
-- The policy intake — schema only (batch 1 of the build in
-- .planning/intake-spec.md).
--
-- WHAT THE INTAKE IS
--
-- The questionnaire a firm completes immediately after paying, whose answers
-- Katy drafts that firm's written AI use policy from. It is an instrument for a
-- HUMAN drafter: no generator, no template engine, and — decided by Max
-- 2026-08-26 — no model ever reads these answers.
--
-- WHY THE ANSWERS GET THEIR OWN TABLES AND NOT COLUMNS ON firms
--
-- Because they are transient. At submit, the three facts the platform actually
-- needs (firm name, the roster, the seat count) are PROMOTED into firms and
-- firm_members, where they live like any other data. Everything else is wiped
-- once the policy is delivered (Katy, 2026-08-26), and a renewal re-runs the
-- intake from scratch rather than pre-filling. Data with a delete date does not
-- belong beside data without one.
--
-- WHY jsonb AND NOT A COLUMN PER QUESTION
--
-- The question set is versioned in the repo, not in the database. Rewording a
-- question, adding one, or dropping one must never require a migration. jsonb
-- is also what holds the shapes a scalar column cannot: the multi-selects, the
-- roster, and the per-tool grid.
--
-- WHY EVERY WRITE IS SERVICE-ROLE
--
-- There are no insert/update/delete policies anywhere in this file, on purpose.
-- The two operations that matter — promote (at submit) and purge (at delivery)
-- — each have to be one transaction. A client writing its own rows makes both
-- of them a sequence of calls that can half-fail, leaving a firm promoted but
-- not recorded, or purged but still holding an upload.
--
-- DELIBERATELY NOT IN THIS MIGRATION
--
-- lib/seats.ts and the sync_used_seats trigger from 0015 are untouched.
-- is_attorney lands here, but making it change what a seat COSTS is its own
-- batch: access and billing currently derive from one predicate on purpose, and
-- 0015 documents that as intentional. The column added below is inert until
-- that batch moves the trigger with it.
-- =============================================================================


-- =============================================================================
-- 1. firm_members.is_attorney
-- =============================================================================
--
-- Attorney status is orthogonal to `role`, so it cannot reuse it. `role` is
-- ('admin','employee') and answers "what can this person do in the app". This
-- answers "is this person a lawyer". An admin may be a non-attorney office
-- manager; an attorney may be a plain member with no dashboard access. The two
-- axes cross freely and collapsing them would misclassify both cases.
--
-- Default false so that applying this migration moves no existing row's
-- billing. Once the seat split lands (see header), true will mean "does not
-- consume a seat" (Katy, 2026-08-25: attorneys never consume a seat and use the
-- training for free). Today it means nothing to the seat count at all.

alter table public.firm_members
  add column if not exists is_attorney boolean not null default false;

comment on column public.firm_members.is_attorney is
  'Whether this member is an attorney. Orthogonal to `role` — an admin may be a non-attorney office manager, an attorney may be a plain member. Set from the intake roster. Does NOT yet affect seat consumption; that is a later batch which must move the sync_used_seats trigger from 0015 with it.';

-- Answers "how many non-attorney staff does this firm have", which is the seat
-- count once the split lands, and the only way this column is ever queried.
create index if not exists idx_firm_members_firm_is_attorney
  on public.firm_members (firm_id, is_attorney);


-- =============================================================================
-- 2. intake_sessions — one run of the intake
-- =============================================================================
--
-- Outlives its own answers. After the purge this row is the receipt: it says a
-- named firm completed an intake and received a policy on a date, and says
-- nothing whatsoever about what they answered.

create table if not exists public.intake_sessions (
  id                  uuid        primary key default gen_random_uuid(),

  firm_id             uuid        not null references public.firms (id) on delete cascade,

  -- restrict, not cascade, matching firms.owner_id. Cascade would delete the
  -- receipt along with the account, which is the one thing the receipt exists
  -- to survive. Deleting an admin is already blocked by firms.owner_id, so this
  -- forbids nothing that was previously possible.
  started_by          uuid        not null references auth.users (id) on delete restrict,

  status              text        not null default 'in_progress'
                        check (status in ('in_progress', 'submitted', 'purged')),

  -- The resume point. The intake is one question at a time (Katy, 2026-08-25)
  -- and an unfinished one resumes where it stopped, so the question key is
  -- state that has to outlive the browser tab. text, not an enum or an FK: the
  -- question set is versioned in the repo, and a key that no longer exists must
  -- degrade to "start from the top", not to a constraint violation.
  current_question    text,

  submitted_at        timestamptz,

  -- Set by hand when Katy tells Max the policy has gone out. It is what starts
  -- the purge clock; nothing else reads it.
  policy_delivered_at timestamptz,

  purged_at           timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.intake_sessions is
  'One run of the policy intake. Survives the purge as a receipt: submitted_at, '
  'started_by, policy_delivered_at and purged_at are retained after every answer '
  'row is deleted, so the platform can say a firm completed an intake and got a '
  'policy without keeping anything they said.';

comment on column public.intake_sessions.status is
  'in_progress → submitted (answers promoted to firms/firm_members) → purged (answers and uploads deleted, this row kept as the receipt).';
comment on column public.intake_sessions.current_question is
  'The question key the firm stopped on, so an abandoned intake resumes there. A key that no longer exists in the repo''s question set means start from the beginning.';
comment on column public.intake_sessions.policy_delivered_at is
  'When Katy''s drafted policy was delivered to the firm. Starts the 30-day purge backstop.';
comment on column public.intake_sessions.purged_at is
  'When intake_answers, intake_sensitive and the upload for this session were deleted. NULL on a submitted session means the purge has not run yet.';

-- NOT unique per firm outright — a renewal runs the intake again, so a firm
-- legitimately accumulates one row per year. What must never happen is two OPEN
-- intakes racing each other into the promote step and each writing a roster
-- over the other's. Partial unique on the open state is exactly that guarantee
-- and nothing more.
create unique index if not exists idx_intake_sessions_one_open_per_firm
  on public.intake_sessions (firm_id)
  where status = 'in_progress';

-- The only query the purge backstop runs: submitted, delivered, not yet purged.
-- Partial so the index holds only rows in that window rather than every intake
-- the platform has ever recorded.
create index if not exists idx_intake_sessions_purge_due
  on public.intake_sessions (policy_delivered_at)
  where status = 'submitted' and purged_at is null;

alter table public.intake_sessions enable row level security;

-- SELECT only, and admin only. There is no employee-facing view of the intake:
-- the firm admin fills it in, and staff never see it. Writes go through a
-- service-role route (see header).
create policy "firm_admin_read_intake_sessions" on public.intake_sessions
  for select
  to authenticated
  using (firm_id = public.firm_id() and public.firm_role() = 'admin');


-- =============================================================================
-- 3. intake_answers — the ordinary answers
-- =============================================================================

create table if not exists public.intake_answers (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references public.intake_sessions (id) on delete cascade,

  -- Matches a key in the repo's question set (firm_name, roster, tool_grid, …).
  question_key text       not null,

  -- jsonb because the answer shapes are not scalars: multi-selects are arrays,
  -- the roster is an array of objects, the tool grid is a row per tool. Storing
  -- the type-appropriate JSON keeps one code path for all of them.
  value       jsonb       not null,

  answered_at timestamptz not null default now(),

  -- One answer per question per run. Going back and changing an answer updates
  -- the row rather than appending a second one; the intake is a form, not an
  -- event log.
  unique (session_id, question_key)
);

comment on table public.intake_answers is
  'Answers to the non-sensitive intake questions, one row per question per '
  'session. Deleted entirely at purge — this table holds nothing the platform '
  'keeps. Anything it genuinely needs was promoted into firms/firm_members at '
  'submit.';

comment on column public.intake_answers.question_key is
  'The question key from the repo-versioned question set. Deliberately not an FK or enum: rewording, adding or dropping a question must never require a migration.';
comment on column public.intake_answers.value is
  'The answer as JSON. Scalars for yes/no and text, arrays for multi-selects, objects for the roster rows and the per-tool grid.';

-- No separate index on session_id: the unique index above leads with it, so
-- "every answer for this session" and the FK cascade both use it.

alter table public.intake_answers enable row level security;

-- Scoped through the session rather than carrying its own firm_id. A denormalised
-- firm_id would be a second thing to keep true, and the answer rows are only ever
-- read a whole session at a time.
create policy "firm_admin_read_intake_answers" on public.intake_answers
  for select
  to authenticated
  using (
    public.firm_role() = 'admin'
    and exists (
      select 1 from public.intake_sessions s
      where s.id = intake_answers.session_id
        and s.firm_id = public.firm_id()
    )
  );


-- =============================================================================
-- 4. intake_sensitive — Katy's eyes only
-- =============================================================================
--
-- 🔴 THIS TABLE HAS NO POLICY, AND MUST NOT BE GIVEN ONE. 🔴
--
-- Same shape as intake_answers, separate table, because the difference is not
-- the shape — it is who may read it. It holds two admissions, and only two:
--
--   prior_ai_error    — has the firm had an AI-generated error in a filing
--   carrier_notified  — has the malpractice carrier been told the firm uses AI
--
-- Both are answers a firm gives on the understanding that the drafting attorney
-- reads them and nobody else does. They are never rendered in a firm-facing
-- screen, never in the dashboard, and appear in no export except Katy's.
--
-- RLS is ON and no policy grants anon or authenticated anything, so the table is
-- reachable only by the service role — the same posture as quiz_questions
-- (0003), verification_rate_limit (0020) and quiz_sessions (0024). A future
-- session adding "just a read policy for admins" would hand a firm's own admin
-- the ability to read an admission their partner made in confidence.
--
-- Known and accepted (raised with Katy 2026-08-26, she chose to keep both
-- questions): restricting access controls who can READ these. It does not make
-- them privileged and it does not put them beyond a subpoena.

create table if not exists public.intake_sensitive (
  id           uuid        primary key default gen_random_uuid(),
  session_id   uuid        not null references public.intake_sessions (id) on delete cascade,
  question_key text        not null,
  value        jsonb       not null,
  answered_at  timestamptz not null default now(),
  unique (session_id, question_key)
);

comment on table public.intake_sensitive is
  'The two sensitive intake answers (prior_ai_error, carrier_notified). Identical '
  'in shape to intake_answers and separate only because of who may read it: RLS is '
  'enabled with NO POLICY, so nothing but a service-role route can reach it. Do '
  'not add a policy — not even a firm-admin read policy. Purged with the rest of '
  'the answers.';

alter table public.intake_sensitive enable row level security;

-- Intentionally no policy. See the block comment above before changing this.


-- =============================================================================
-- 5. intake_uploads — the firm's existing AI policy, if it has one
-- =============================================================================
--
-- One optional file, attached when the firm answers yes to `existing_policy`.
-- It goes to a private bucket, a human reads it, and it is never parsed. Same
-- lifecycle as the answers: the object and this row both go at purge.

create table if not exists public.intake_uploads (
  id           uuid        primary key default gen_random_uuid(),
  session_id   uuid        not null references public.intake_sessions (id) on delete cascade,

  -- Path within the private Storage bucket. The row is the index; deleting it
  -- does not delete the object, so the purge route has to remove both.
  storage_path text        not null,

  -- What the firm called the file. Kept for display only — never used to build
  -- the storage path.
  original_name text,

  content_type text,
  bytes        bigint,

  uploaded_at  timestamptz not null default now()
);

comment on table public.intake_uploads is
  'The firm''s existing AI policy document, uploaded when `existing_policy` is yes. '
  'Private bucket, read by a human, never parsed. Purged with the answers — the '
  'purge route must delete the storage object as well as this row.';

comment on column public.intake_uploads.storage_path is
  'Path within the private intake bucket. This row indexes the object; deleting the row does not delete the object.';
comment on column public.intake_uploads.original_name is
  'The filename as the firm supplied it, for display only. Never used to construct storage_path.';

-- Unlike intake_answers there is no unique index leading with session_id, so the
-- lookup and the FK cascade need one of their own.
create index if not exists idx_intake_uploads_session_id
  on public.intake_uploads (session_id);

alter table public.intake_uploads enable row level security;

create policy "firm_admin_read_intake_uploads" on public.intake_uploads
  for select
  to authenticated
  using (
    public.firm_role() = 'admin'
    and exists (
      select 1 from public.intake_sessions s
      where s.id = intake_uploads.session_id
        and s.firm_id = public.firm_id()
    )
  );
