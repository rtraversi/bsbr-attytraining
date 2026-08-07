-- =============================================================================
-- 0024_quiz_sessions.sql
-- Satisfies: ix-quizforge — the certification quiz could be passed with one
--            answer, because the SERVER graded whatever the CLIENT submitted.
-- =============================================================================
--
-- THE HOLE THIS CLOSES
--
-- /api/quiz/attempt used to take the question ids out of the request body, load
-- exactly those rows, and compute `correct / questions.length`. The denominator
-- was therefore the number of SUBMITTED questions. A POST carrying one question
-- the caller already knew the answer to scored 100, flipped the enrollment to
-- 'passed', and enqueued a real certificate. The route is authenticated and
-- seat-gated, so the attacker is an enrolled employee self-certifying — exactly
-- the failure a Rule 5.3 supervision product exists to prevent.
--
-- WHY A DENOMINATOR FIX IS NOT ENOUGH
--
-- Clamping the denominator to QUESTIONS_PER_ATTEMPT looks sufficient only
-- because the pool is 8 today and the attempt size is also 8, so the slice
-- selects nothing. ix-questionpool grows the pool to ~32. At that point a
-- caller can still cherry-pick the 8 questions they happen to know and submit a
-- perfect 8-of-8. The question set has to be chosen by the SERVER, recorded,
-- and graded against the recording. That is what this table is.
--
-- WHY A TABLE AND NOT A SIGNED TOKEN
--
-- A signed token carrying the question ids would avoid the write, but it cannot
-- be marked consumed — replaying the same token is free, so one passing set of
-- answers could be submitted repeatedly. Single-use is the property that
-- matters here, and single-use needs state.
-- ---------------------------------------------------------------------------

create table if not exists public.quiz_sessions (
  id            uuid        primary key default gen_random_uuid(),

  -- The exam is bound to one person, one firm and one course. All three are
  -- re-checked at grading time against the caller's own JWT claims, so a
  -- session id leaking to another employee buys them nothing.
  user_id       uuid        not null references auth.users (id)     on delete cascade,
  firm_id       uuid        not null references public.firms (id)   on delete cascade,
  course_id     uuid        not null references public.courses (id) on delete cascade,

  -- The exam itself. uuid[] rather than a join table: a session is written once,
  -- read once, and never queried BY question — so the join table would buy
  -- nothing and cost a second insert on the hot path. Order is preserved, which
  -- is what the client renders.
  --
  -- No FK is possible on an array element, so a deleted question would leave a
  -- dangling id here. That is handled at grading time: an id with no active
  -- question row still counts toward the denominator and is scored wrong, which
  -- fails CLOSED. Deleting questions mid-exam is not a supported operation.
  question_ids  uuid[]      not null check (array_length(question_ids, 1) > 0),

  issued_at     timestamptz not null default now(),

  -- Expiry exists so an abandoned session cannot be resumed weeks later against
  -- a question pool that has since been rewritten. It is not a time limit on the
  -- quiz itself — the product deliberately has none (QuizRunner shows "No time
  -- limit"), and 4 hours is far past any honest attempt.
  expires_at    timestamptz not null,

  -- Set by the atomic claim in /api/quiz/attempt. Non-null means this exam has
  -- already been graded; a retake starts a new session. This is the column that
  -- makes one set of answers gradeable exactly once.
  consumed_at   timestamptz,

  constraint quiz_sessions_expires_after_issue check (expires_at > issued_at)
);

-- The only lookup on the hot path is by primary key, so the index that matters
-- is the one for reaping: expired-or-consumed rows accumulate forever otherwise
-- (unlimited retakes means one row per attempt per employee, permanently).
create index if not exists idx_quiz_sessions_expires_at
  on public.quiz_sessions (expires_at);

-- Supports the "does this employee already have a live session" question, which
-- /api/quiz/start uses to avoid minting a second exam when a page is reloaded
-- mid-attempt.
create index if not exists idx_quiz_sessions_open
  on public.quiz_sessions (user_id, course_id, expires_at)
  where consumed_at is null;

alter table public.quiz_sessions enable row level security;

-- No client-facing RLS policies, deliberately — the same posture as
-- quiz_questions (0003) and verification_rate_limit (0020). RLS is ON and no
-- policy grants anon or authenticated anything, so the table is reachable only
-- by the service role. The employee never sees a row: /api/quiz/start returns
-- the session id and the question TEXT, and nothing else. If the client could
-- read this table it could read its own question_ids, which is harmless, and
-- WRITE its own consumed_at, which is not.

comment on table public.quiz_sessions is
  'One row per certification-quiz attempt, minted by /api/quiz/start. Records '
  'which questions the SERVER chose to serve, so /api/quiz/attempt can grade '
  'against that set rather than against whatever the client submits. '
  'Single-use: consumed_at is claimed atomically before grading.';

comment on column public.quiz_sessions.question_ids is
  'The exam, in the order it was served. The grading denominator is '
  'array_length(question_ids, 1) — ALWAYS, regardless of how many answers the '
  'client sends back. Unanswered questions score as wrong.';

-- ---------------------------------------------------------------------------
-- quiz_attempts.question_ids — the audit trail.
--
-- quiz_attempts already stores `answers` (what the employee picked) but nothing
-- recording WHICH questions were served, so a score could not be audited
-- against the exam that produced it. For a compliance product whose whole
-- output is an assertion that a named person passed a specific assessment, that
-- is the gap that matters most after the grading hole itself.
--
-- Nullable, and not backfilled: rows written before this migration genuinely do
-- not have this information, and inventing a value for them would be worse than
-- recording its absence. NULL here means "attempt predates 0024", not "no
-- questions were served".
-- ---------------------------------------------------------------------------
alter table public.quiz_attempts
  add column if not exists question_ids uuid[];

comment on column public.quiz_attempts.question_ids is
  'Copied from quiz_sessions.question_ids at grading time, so a score can be '
  'audited against the exam that produced it. NULL for attempts recorded before '
  'migration 0024.';
