-- =============================================================================
-- 0002_audit_and_queue.sql
-- Tables: training_events, cert_generation_queue
-- Satisfies: AUDIT-01, AUDIT-02, AUDIT-03, AUTO-02, FND-02
-- =============================================================================

-- =============================================================================
-- 9. training_events  (append-only audit log — AUDIT-01, AUDIT-02)
-- =============================================================================
create table public.training_events (
  id              uuid        primary key default gen_random_uuid(),
  firm_id         uuid        not null references public.firms (id) on delete cascade,
  -- firm_member_id: on delete restrict because event rows must survive member PII redaction
  -- (DASH-09: redact name/email on the firm_members row, not delete the row itself)
  firm_member_id  uuid        not null references public.firm_members (id) on delete restrict,
  event_type      text        not null check (event_type in (
                                'invite_sent',
                                'login',
                                'video_started',
                                'video_completed',
                                'quiz_attempt',
                                'identity_attestation',
                                'cert_issued',
                                'cert_downloaded',
                                'seat_reassigned',
                                'employee_record_deleted'
                              )),
  ip_address      text,
  user_agent      text,
  metadata        jsonb,
  event_timestamp timestamptz not null default now()
);

create index idx_training_events_firm_id        on public.training_events (firm_id);
create index idx_training_events_firm_member_id on public.training_events (firm_member_id);
create index idx_training_events_event_type     on public.training_events (event_type);
-- Composite: drives the audit log chronological export query (DASH-06)
create index idx_training_events_firm_ts        on public.training_events (firm_id, event_timestamp);

alter table public.training_events enable row level security;

-- Firm admins can read their firm's full audit log (DASH-06 CSV export)
create policy "firm_admin_read_training_events" on public.training_events
  for select
  using (firm_id = public.firm_id() and public.firm_role() = 'admin');

-- Employees can read events that belong to their own firm_members row
create policy "employee_read_own_training_events" on public.training_events
  for select
  using (
    exists (
      select 1 from public.firm_members fm
      where fm.id = training_events.firm_member_id
        and fm.user_id = auth.uid()
        and fm.firm_id = public.firm_id()
    )
  );

-- Employees can insert events for themselves (video_started, quiz_attempt,
-- identity_attestation, cert_downloaded). Service role inserts the rest
-- (invite_sent, cert_issued, seat_reassigned, employee_record_deleted) bypassing RLS.
create policy "employee_insert_own_training_events" on public.training_events
  for insert
  with check (
    firm_id = public.firm_id()
    and exists (
      select 1 from public.firm_members fm
      where fm.id = training_events.firm_member_id
        and fm.user_id = auth.uid()
        and fm.firm_id = public.firm_id()
    )
  );

-- No UPDATE or DELETE policies → denied for all client roles (AUDIT-02: append-only)
-- Service role can still UPDATE/DELETE if the operator ever runs a cleanup script (AUDIT-03)

-- =============================================================================
-- 10. cert_generation_queue  (dead-letter queue — AUTO-02)
-- =============================================================================
create table public.cert_generation_queue (
  id               uuid        primary key default gen_random_uuid(),
  firm_id          uuid        not null references public.firms (id) on delete cascade,
  enrollment_id    uuid        not null references public.enrollments (id) on delete cascade,
  quiz_attempt_id  uuid        not null references public.quiz_attempts (id) on delete cascade,
  status           text        not null default 'pending'
                                 check (status in (
                                   'pending',
                                   'processing',
                                   'failed',
                                   'succeeded',
                                   'alerted'
                                 )),
  attempt_count    int         not null default 0 check (attempt_count >= 0),
  last_error       text,
  -- next_retry_at drives the 5-minute cron trigger's exponential backoff query
  next_retry_at    timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_cert_queue_firm_id       on public.cert_generation_queue (firm_id);
create index idx_cert_queue_enrollment_id on public.cert_generation_queue (enrollment_id);
-- Partial index: the cron trigger only queries rows that still need processing
create index idx_cert_queue_retry         on public.cert_generation_queue (next_retry_at)
  where status in ('pending', 'failed');

alter table public.cert_generation_queue enable row level security;

-- No client-facing RLS policies: all access is via service role (cert Worker + cron trigger).
-- RLS enabled so anon/authenticated roles have zero access by default.

-- keep updated_at current on every modification
create or replace function public.set_updated_at() returns trigger
  language plpgsql
  as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

create trigger trg_cert_queue_updated_at
  before update on public.cert_generation_queue
  for each row execute function public.set_updated_at();
