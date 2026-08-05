-- =============================================================================
-- 0018_provisioning_identity.sql
-- Satisfies: ix-doublebill — identity resolution at checkout provisioning
--
-- handleCheckoutCompleted currently uses account creation as its identity
-- check: it calls auth.admin.createUser(email) and treats any failure as an
-- unhandled edge. There is no step that asks who the buyer is. By the time
-- createUser fails the money is captured, the processed_stripe_events row is
-- already written (route.ts:57, before dispatch), and the handler returns 200 —
-- so Stripe never retries and replaying the event from the dashboard is a
-- no-op. The event is burned and there is no recovery path at all.
--
-- This migration adds the two things the webhook needs to do better: a way to
-- ask "who is this buyer?" without paginating every user, and a durable record
-- of the outcome when provisioning is deliberately refused.
--
-- Deliberately NOT in this migration: training_events_event_type_check. Six
-- migrations restate that constraint in full and 0017 is the current one;
-- sourcing it from an older definition silently deletes every value added
-- since. Nothing here needs it, so it stays untouched.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. find_user_id_by_email — identity lookup for the webhook
-- ---------------------------------------------------------------------------
-- There is no getUserByEmail in @supabase/auth-js@2.108.1 (verified), and
-- listUsers accepts only {page, perPage} with no filter. The alternative is
-- paginating the entire user table inside a webhook handler, which gets slower
-- with every customer and would eventually time out the Stripe delivery.
--
-- security definer because auth.users is not readable by the anon or
-- authenticated roles, and search_path is pinned so the auth schema resolves
-- predictably regardless of the caller's settings.
--
-- Emails are compared case-insensitively: Stripe echoes back whatever the buyer
-- typed at checkout, while GoTrue stores the address lowercased. A raw
-- equality test would miss "Name@Firm.com" against a stored "name@firm.com" and
-- silently misread a returning client as a brand new one.
--
-- The order by is a deliberate addition to the shape this was specced with. A
-- bare "limit 1" over a duplicate address returns an arbitrary row, and this
-- function decides which firm a payment attaches to — a nondeterministic answer
-- in a billing path is a bug waiting for a coincidence. Earliest account wins,
-- which is the established identity. With zero or one match (the normal case)
-- it changes nothing.
create or replace function public.find_user_id_by_email(p_email text)
  returns uuid
  language sql
  security definer
  set search_path = public, auth
  stable
  as $$
    select id
      from auth.users
     where lower(email) = lower(p_email)
     order by created_at asc
     limit 1
  $$;

comment on function public.find_user_id_by_email(text) is
  'Resolves an email address to an auth.users id for the Stripe webhook''s '
  'identity check. Service-role only — it reads auth.users, so exposing it to '
  'the authenticated role would hand any logged-in user an account-enumeration '
  'oracle. Case-insensitive because Stripe echoes the buyer''s typed casing '
  'while GoTrue stores lowercase.';

-- Revoking from public is the load-bearing statement, not a formality: Postgres
-- grants EXECUTE on new functions to PUBLIC by default, and both anon and
-- authenticated inherit it. Revoking from those two roles alone would leave the
-- function callable by exactly the roles we are trying to keep out.
revoke execute on function public.find_user_id_by_email(text) from public;
revoke execute on function public.find_user_id_by_email(text) from anon;
revoke execute on function public.find_user_id_by_email(text) from authenticated;
grant  execute on function public.find_user_id_by_email(text) to   service_role;


-- ---------------------------------------------------------------------------
-- 2. provisioning_failures — the recovery ledger
-- ---------------------------------------------------------------------------
-- Because the idempotency row is written before dispatch and must stay there
-- (it is what stops a Stripe retry from double-provisioning), a refused or
-- failed checkout cannot be recovered by replaying the event. This table is the
-- recovery path instead: it records that a real payment landed and did not
-- become a firm, so an operator can act on it and — via
-- /api/onboarding/status — so the customer can be told the truth rather than
-- polling into a timeout and a Refresh button that can never succeed.
--
-- Keyed by stripe_session_id: one checkout session is one provisioning attempt,
-- and it is the id the onboarding page already carries in its URL. A natural
-- primary key also makes a duplicate webhook delivery a no-op insert rather
-- than a second row for the same event.
create table if not exists public.provisioning_failures (
  stripe_session_id      text primary key,
  stripe_customer_id     text        not null,
  stripe_subscription_id text,
  email                  text        not null,
  reason                 text        not null
    check (reason in ('duplicate', 'email_in_use', 'unresolved')),
  created_at             timestamptz not null default now(),
  resolved_at            timestamptz
);

comment on table public.provisioning_failures is
  'One row per checkout session where payment succeeded but a firm was '
  'deliberately not provisioned. Written by the Stripe webhook before the '
  'operator alert is sent, so a mail failure never loses the record. Read by '
  '/api/onboarding/status to tell the customer why setup stopped.';

comment on column public.provisioning_failures.reason is
  'duplicate     — buyer already owns an active firm; the NEW subscription was '
  'cancelled and the existing one left untouched. '
  'email_in_use  — buyer is staff at someone else''s active firm; nothing was '
  'provisioned and nothing was cancelled. '
  'unresolved    — the address was reported as already registered but no user '
  'row could be found for it. Should be unreachable; if rows appear here the '
  'identity lookup and the auth store disagree and that needs a human.';

comment on column public.provisioning_failures.stripe_subscription_id is
  'Nullable: the subscription this session created. For reason=duplicate this '
  'is the subscription that was CANCELLED, never the firm''s surviving one.';

comment on column public.provisioning_failures.resolved_at is
  'Set by hand once an operator has dealt with the row. Null means still open.';

-- Open failures are the operational query — "what needs a human right now?" —
-- and they are a small subset of a table that only ever grows. Partial index so
-- it stays cheap as resolved rows accumulate.
create index if not exists idx_provisioning_failures_open
  on public.provisioning_failures (created_at desc)
  where resolved_at is null;

-- Support lookups start from the customer's address far more often than from a
-- session id they never see.
create index if not exists idx_provisioning_failures_email
  on public.provisioning_failures (email);

alter table public.provisioning_failures enable row level security;

-- No client-facing RLS policies: all access is via the service role (the Stripe
-- webhook writes, /api/onboarding/status reads). RLS is enabled so the anon and
-- authenticated roles have zero access by default — the rows contain another
-- customer's email and Stripe identifiers.
