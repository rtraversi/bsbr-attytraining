-- =============================================================================
-- 0029_email_deliverability.sql
-- Whether we can actually REACH the people on a firm's roster.
--
-- ── The gap this fills ──────────────────────────────────────────────────────
--
-- The buyer's IDENTITY is already proven better than an email ever could: a card
-- payment, a Stripe session token, and an email field locked server-side to the
-- session's own address (app/api/onboarding/complete). None of that proves
-- DELIVERABILITY. Stripe Checkout validates an address's SHAPE, not its
-- existence, so "gmial.com" sails through, and Stripe never tells us when its
-- own receipt bounced.
--
-- Roster addresses are riskier still, because the admin types them for OTHER
-- PEOPLE. A transposed character in a paralegal's address is invisible until a
-- certificate fails to arrive a month later.
--
-- ── 🔴 WHY NOT auth.users.email_confirmed_at ────────────────────────────────
--
-- Because it is already true for everybody and means something else entirely.
-- The Stripe webhook (route.ts:332), the invite routes and lib/intake/promote
-- all pass `email_confirm: true` at creation — deliberately, so nobody is
-- blocked on a confirmation email in a product whose whole point is that the
-- firm admin provisions their staff. Reading it as a deliverability signal would
-- report 100% reachable for a roster that is 100% unproven.
--
-- ── 🔴 THIS MUST NEVER BLOCK ANYTHING ───────────────────────────────────────
--
-- Resend returns 403 on every send today (ix-dnszoho). A blocking version of
-- this would brick every firm behind a banner nobody can clear. Nullable
-- columns, no constraint, no default that asserts anything: NULL means "not
-- proven", never "bad".
--
-- ── One notice, two signals ─────────────────────────────────────────────────
--
-- 0016 already added firm_members.invite_email_failed, which records a send that
-- threw. That is the same question from the other end — "we tried and it did not
-- go" versus "we have never had proof it would". The dashboard notice reads both
-- and clears per person as each is answered.
-- =============================================================================

alter table public.firm_members
  add column if not exists email_verified_at        timestamptz,
  add column if not exists email_verification_token text,
  add column if not exists email_verification_sent_at timestamptz;

comment on column public.firm_members.email_verified_at is
  'When this address was PROVEN reachable — a verification link was opened, or the person accepted their invite (which requires having received the email). NULL means unproven, NOT bad. Deliberately not auth.users.email_confirmed_at, which is true for everyone because every creation path passes email_confirm: true.';

comment on column public.firm_members.email_verification_token is
  'Single-use token for the verification link. Cleared when the link is opened, so a link that has been used cannot be replayed. NULL is the normal resting state for both a verified member and one who has never been sent a link.';

comment on column public.firm_members.email_verification_sent_at is
  'When a verification link was last generated. Read to rate-limit re-sends and to tell "never tried" apart from "tried and heard nothing".';

-- Unique so a token identifies exactly one member, partial so the many NULLs do
-- not collide — the resting state for most rows is NULL and always will be.
create unique index if not exists idx_firm_members_email_verification_token
  on public.firm_members (email_verification_token)
  where email_verification_token is not null;

-- The dashboard notice's only query: who in this firm is still unproven.
-- Partial, because a healthy firm has none and the index should cost nothing.
create index if not exists idx_firm_members_email_unverified
  on public.firm_members (firm_id)
  where email_verified_at is null;

-- ---------------------------------------------------------------------------
-- No new RLS policy.
--
-- firm_members already carries "admins manage their own firm" and "employees
-- read their own row" from 0001, and these columns inherit both. That is correct
-- for email_verified_at, which the admin's notice reads.
--
-- ⚠️ It also means a firm admin can read email_verification_token for their own
-- staff. That is not a leak worth closing: the token only proves an address is
-- reachable, the admin TYPED the address, and they can already mint a fresh link
-- for any of their own members through the dashboard. The token is single-use
-- and grants no session — it is not a login.
-- ---------------------------------------------------------------------------
