-- =============================================================================
-- 0001_initial_schema.sql
-- AI Compliance Training Platform — full schema
-- Tables: firms, courses, seats, firm_members, enrollments,
--         quiz_attempts, certificates, processed_stripe_events
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper: pull firm_id from the caller's JWT app_metadata
-- ---------------------------------------------------------------------------
create or replace function public.firm_id() returns uuid
  language sql stable
  as $$
    select nullif(
      (auth.jwt() -> 'app_metadata' ->> 'firm_id'),
      ''
    )::uuid
  $$;

-- ---------------------------------------------------------------------------
-- Helper: pull role from the caller's JWT app_metadata
-- ---------------------------------------------------------------------------
create or replace function public.firm_role() returns text
  language sql stable
  as $$
    select auth.jwt() -> 'app_metadata' ->> 'role'
  $$;

-- =============================================================================
-- 1. firms
-- =============================================================================
create table public.firms (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  owner_id               uuid not null references auth.users (id) on delete restrict,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  tier                   text not null check (tier in ('basic', 'standard', 'pro')),
  max_seats              int  not null check (max_seats > 0),
  status                 text not null default 'active'
                           check (status in ('active', 'payment_failed', 'cancelled')),
  current_period_end     timestamptz,
  created_at             timestamptz not null default now()
);

alter table public.firms enable row level security;

-- Firm admin: full access to their own firm row
create policy "firm_admin_own_firm" on public.firms
  for all
  using  (id = public.firm_id() and public.firm_role() = 'admin')
  with check (id = public.firm_id() and public.firm_role() = 'admin');

-- Employees: read-only access to their firm row (e.g., to show firm name)
create policy "employee_read_own_firm" on public.firms
  for select
  using (id = public.firm_id());

-- =============================================================================
-- 2. courses  (operator-managed; all authenticated users can read)
-- =============================================================================
create table public.courses (
  id                        uuid primary key default gen_random_uuid(),
  title                     text not null,
  description               text,
  cloudflare_stream_video_id text not null,
  pass_threshold            int  not null default 80 check (pass_threshold between 1 and 100),
  is_published              boolean not null default false,
  created_at                timestamptz not null default now()
);

alter table public.courses enable row level security;

-- Any authenticated user can read published courses
create policy "authenticated_read_published_courses" on public.courses
  for select
  to authenticated
  using (is_published = true);

-- =============================================================================
-- 3. seats  (one row per firm — authoritative seat cap + usage snapshot)
-- =============================================================================
create table public.seats (
  id         uuid primary key default gen_random_uuid(),
  firm_id    uuid not null references public.firms (id) on delete cascade,
  max_seats  int  not null check (max_seats > 0),
  used_seats int  not null default 0 check (used_seats >= 0),
  updated_at timestamptz not null default now(),
  unique (firm_id)
);

create index idx_seats_firm_id on public.seats (firm_id);

alter table public.seats enable row level security;

create policy "firm_admin_manage_seats" on public.seats
  for all
  using  (firm_id = public.firm_id() and public.firm_role() = 'admin')
  with check (firm_id = public.firm_id() and public.firm_role() = 'admin');

create policy "employee_read_seats" on public.seats
  for select
  using (firm_id = public.firm_id());

-- =============================================================================
-- 4. firm_members
-- =============================================================================
create table public.firm_members (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references public.firms (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'employee' check (role in ('admin', 'employee')),
  status      text not null default 'invited'  check (status in ('invited', 'active', 'deactivated')),
  invited_at  timestamptz not null default now(),
  activated_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (firm_id, user_id)
);

create index idx_firm_members_firm_id on public.firm_members (firm_id);
create index idx_firm_members_user_id on public.firm_members (user_id);

alter table public.firm_members enable row level security;

-- Admins see/manage everyone in their firm
create policy "firm_admin_manage_members" on public.firm_members
  for all
  using  (firm_id = public.firm_id() and public.firm_role() = 'admin')
  with check (firm_id = public.firm_id() and public.firm_role() = 'admin');

-- Employees see their own record only
create policy "employee_read_own_membership" on public.firm_members
  for select
  using (firm_id = public.firm_id() and user_id = auth.uid());

-- =============================================================================
-- 5. enrollments
-- =============================================================================
create table public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  firm_id      uuid not null references public.firms (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  course_id    uuid not null references public.courses (id) on delete restrict,
  status       text not null default 'not_started'
                 check (status in ('not_started', 'in_progress', 'passed', 'failed')),
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (firm_id, user_id, course_id)
);

create index idx_enrollments_firm_id   on public.enrollments (firm_id);
create index idx_enrollments_user_id   on public.enrollments (user_id);
create index idx_enrollments_course_id on public.enrollments (course_id);

alter table public.enrollments enable row level security;

create policy "firm_admin_manage_enrollments" on public.enrollments
  for all
  using  (firm_id = public.firm_id() and public.firm_role() = 'admin')
  with check (firm_id = public.firm_id() and public.firm_role() = 'admin');

create policy "employee_read_own_enrollments" on public.enrollments
  for select
  using (firm_id = public.firm_id() and user_id = auth.uid());

-- Employees can update their own enrollment status (in_progress → passed/failed)
create policy "employee_update_own_enrollment_status" on public.enrollments
  for update
  using  (firm_id = public.firm_id() and user_id = auth.uid())
  with check (firm_id = public.firm_id() and user_id = auth.uid());

-- =============================================================================
-- 6. quiz_attempts
-- =============================================================================
create table public.quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  firm_id       uuid not null references public.firms (id) on delete cascade,
  enrollment_id uuid not null references public.enrollments (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  score         int  not null check (score between 0 and 100),
  passed        boolean not null,
  answers       jsonb,
  attempted_at  timestamptz not null default now()
);

create index idx_quiz_attempts_firm_id       on public.quiz_attempts (firm_id);
create index idx_quiz_attempts_enrollment_id on public.quiz_attempts (enrollment_id);
create index idx_quiz_attempts_user_id       on public.quiz_attempts (user_id);

alter table public.quiz_attempts enable row level security;

create policy "firm_admin_read_quiz_attempts" on public.quiz_attempts
  for select
  using (firm_id = public.firm_id() and public.firm_role() = 'admin');

create policy "employee_insert_own_quiz_attempt" on public.quiz_attempts
  for insert
  with check (firm_id = public.firm_id() and user_id = auth.uid());

create policy "employee_read_own_quiz_attempts" on public.quiz_attempts
  for select
  using (firm_id = public.firm_id() and user_id = auth.uid());

-- =============================================================================
-- 7. certificates
-- =============================================================================
create table public.certificates (
  id                 uuid primary key default gen_random_uuid(),
  firm_id            uuid not null references public.firms (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,
  enrollment_id      uuid not null references public.enrollments (id) on delete cascade,
  certificate_number text not null unique,
  storage_path       text not null,
  issued_at          timestamptz not null default now(),
  expires_at         timestamptz not null,
  unique (enrollment_id)
);

create index idx_certificates_firm_id      on public.certificates (firm_id);
create index idx_certificates_user_id      on public.certificates (user_id);
create index idx_certificates_enrollment_id on public.certificates (enrollment_id);

alter table public.certificates enable row level security;

create policy "firm_admin_read_certificates" on public.certificates
  for select
  using (firm_id = public.firm_id() and public.firm_role() = 'admin');

create policy "employee_read_own_certificates" on public.certificates
  for select
  using (firm_id = public.firm_id() and user_id = auth.uid());

-- Certificates are immutable from the client — inserts/updates only via service role
-- (triggered by the cert-generation Worker using the service role key)

-- =============================================================================
-- 8. processed_stripe_events  (idempotency table — service role only)
-- =============================================================================
create table public.processed_stripe_events (
  event_id     text primary key,
  processed_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;

-- No client-facing RLS policies: all access via service role in the webhook handler.
-- RLS is enabled so the anon/authenticated roles have zero access by default.

-- =============================================================================
-- Certificate number sequence (human-readable: CERT-YYYYMMDD-XXXXX)
-- =============================================================================
create sequence public.certificate_number_seq start 10000;

create or replace function public.generate_certificate_number() returns text
  language sql
  as $$
    select 'CERT-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.certificate_number_seq')::text, 5, '0')
  $$;

-- =============================================================================
-- Trigger: auto-increment seats.used_seats when a member is activated
-- =============================================================================
create or replace function public.sync_used_seats() returns trigger
  language plpgsql security definer
  as $$
  begin
    if TG_OP = 'INSERT' and NEW.status = 'active' then
      update public.seats set used_seats = used_seats + 1, updated_at = now()
        where firm_id = NEW.firm_id;

    elsif TG_OP = 'UPDATE' then
      if OLD.status != 'active' and NEW.status = 'active' then
        update public.seats set used_seats = used_seats + 1, updated_at = now()
          where firm_id = NEW.firm_id;
      elsif OLD.status = 'active' and NEW.status != 'active' then
        update public.seats set used_seats = greatest(used_seats - 1, 0), updated_at = now()
          where firm_id = NEW.firm_id;
      end if;

    elsif TG_OP = 'DELETE' and OLD.status = 'active' then
      update public.seats set used_seats = greatest(used_seats - 1, 0), updated_at = now()
        where firm_id = OLD.firm_id;
    end if;

    return coalesce(NEW, OLD);
  end;
  $$;

create trigger trg_sync_used_seats
  after insert or update of status or delete on public.firm_members
  for each row execute function public.sync_used_seats();
