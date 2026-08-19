-- =============================================================================
-- 0027_terms_acceptance.sql
-- ix-termsaccept: record who accepted the Terms, when, and WHICH VERSION.
--
-- Terms §1 asserts the customer has accepted the terms. Nothing in the product
-- ever asked, so that sentence was false for every account that has ever
-- existed. These columns are what make it true going forward.
--
-- Version is stored beside the timestamp deliberately. A boolean "accepted"
-- cannot answer the only question that matters in a dispute: accepted WHAT.
-- app/terms/page.tsx is still an attorney placeholder, so the first recorded
-- version is explicitly a draft marker (lib/legal/terms.ts).
--
-- Nullable on purpose. Firms and members created before this migration never
-- had the chance to accept; NULL states that honestly rather than backfilling a
-- consent that never happened. Do not backfill these columns.
-- =============================================================================

alter table public.firms
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version     text;

comment on column public.firms.terms_accepted_at is
  'When the purchasing admin accepted the Terms, captured at checkout before the Stripe session was created. NULL means this firm predates ix-termsaccept and never accepted.';
comment on column public.firms.terms_version is
  'Which Terms version the purchasing admin accepted (lib/legal/terms.ts CURRENT_TERMS_VERSION at the time).';

alter table public.firm_members
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version     text;

comment on column public.firm_members.terms_accepted_at is
  'When this member accepted the Terms, captured at password-set. NULL for members who predate ix-termsaccept, and for the owner row (the firm-level acceptance covers the buyer).';
comment on column public.firm_members.terms_version is
  'Which Terms version this member accepted.';

-- Both columns move together or not at all. A timestamp with no version cannot
-- be tied to any wording, and a version with no timestamp records nothing.
alter table public.firms
  drop constraint if exists firms_terms_pair_ck;
alter table public.firms
  add constraint firms_terms_pair_ck
  check ((terms_accepted_at is null) = (terms_version is null));

alter table public.firm_members
  drop constraint if exists firm_members_terms_pair_ck;
alter table public.firm_members
  add constraint firm_members_terms_pair_ck
  check ((terms_accepted_at is null) = (terms_version is null));

-- Answers "who has not accepted the current version", which is the query the
-- legal chain will need once the reviewed terms replace the draft.
create index if not exists idx_firms_terms_version
  on public.firms (terms_version);
create index if not exists idx_firm_members_terms_version
  on public.firm_members (terms_version);
