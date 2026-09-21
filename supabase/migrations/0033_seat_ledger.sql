-- =============================================================================
-- 0033 — the seat ledger: who paid for what seats, when, and until when
--
-- ix-midyearseats (OPEN-ISSUES.md #18). Billing model agreed with Rob
-- 2026-09-21: a mid-year seat addition is a one-time, full-year charge at the
-- firm's CURRENT per-seat rate — never a bump to the live subscription's
-- quantity, which would make Stripe auto-bill that count going forward on the
-- wrong cadence (see app/api/billing/add-seats/route.ts). At the firm's next
-- annual renewal, every seat is re-rated to whatever band the new headcount
-- falls into, and any seat still inside the year it already paid for gets a
-- true-up credit for the days remaining on that paid year.
--
-- `seats` (0001) is one aggregate row per firm — current max/used only, no
-- memory of WHEN a seat was added or at what rate. This table is that memory,
-- and ONLY for that memory: it does not replace `seats`, which stays the
-- fast-path row the seat-cap check (lib/seats.ts) reads on every invite.
--
-- ── Why one row can represent several seats ─────────────────────────────────
-- A single mid-year purchase of N seats added on the same day, at the same
-- rate, has one covers_until for all N — crediting them is `N ×
-- (days_remaining/365) × rate`, which is exactly what one row with a count
-- gives you. Modeling N individual rows would be equivalent arithmetic for
-- more storage and no more information.
--
-- ── Why this only holds mid-year additions, not every seat ──────────────────
-- A seat bought at the firm's normal annual purchase/renewal date has
-- covers_until equal to the NEXT renewal date by construction — the credit
-- formula would always evaluate to zero. Giving it a row would be correct but
-- pointless, so only off-cycle additions get one. A firm with no mid-year
-- additions has zero rows here and that is the expected, common case.
-- =============================================================================

create table public.seat_ledger (
  id              uuid primary key default gen_random_uuid(),
  firm_id         uuid not null references public.firms (id) on delete cascade,
  seat_count      int  not null check (seat_count > 0),
  rate_paid_cents int  not null check (rate_paid_cents > 0),
  added_at        timestamptz not null default now(),
  -- The end of the year this purchase paid for — added_at + 365 days, computed
  -- by the app at insert time rather than as a generated column, because the
  -- exact boundary (a Stripe invoice timestamp) is a fact the app already has
  -- and recomputing it from added_at with calendar math in SQL would be a
  -- second, potentially divergent, source of the same number.
  covers_until    timestamptz not null,
  -- Set by the renewal process once this row's credit has been applied and
  -- folded into the new annual cycle. NULL means "still outstanding, count it
  -- at the next renewal." A matured row is kept, not deleted — it is the
  -- audit trail for why a renewal invoice came out to the amount it did.
  credited_at     timestamptz,
  created_at      timestamptz not null default now(),
  check (covers_until > added_at)
);

create index idx_seat_ledger_firm_id on public.seat_ledger (firm_id);

-- Partial: the renewal process's only query against this table is "outstanding
-- rows for this firm," and a firm that has been running for years accumulates
-- one matured row per mid-year purchase it ever made.
create index idx_seat_ledger_outstanding
  on public.seat_ledger (firm_id, covers_until)
  where credited_at is null;

alter table public.seat_ledger enable row level security;

-- Read-only from the client, same shape as certificates (0001) — this is a
-- record of what was charged, not something a firm admin edits. Written only
-- by the service role, from app/api/billing/add-seats/route.ts and (once
-- built) the renewal process.
create policy "firm_admin_read_seat_ledger" on public.seat_ledger
  for select
  using (firm_id = public.firm_id() and public.firm_role() = 'admin');
