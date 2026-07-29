-- ---------------------------------------------------------------------------
-- 0015 — Fix seat double-counting; make the trigger the single source of truth
--
-- Two independent writers maintained seats.used_seats for the same person: app
-- code incremented it manually at invite time, and the sync_used_seats trigger
-- incremented it again when that member activated. Every employee therefore
-- consumed TWO seats, and a firm hit "No seats available" at half the capacity
-- it had paid for. Seats are the Stripe billing unit (Checkout quantity =
-- seats), so this under-delivered purchased capacity.
--
-- The manual increments are removed from app code alongside this migration
-- (app/api/invite/route.ts, app/api/invite/bulk/route.ts,
-- app/api/onboarding/complete/route.ts). The trigger's in-place
-- `used_seats = used_seats + 1` is also atomic, which closes the read-then-write
-- race the manual writes had.
--
-- This migration additionally introduces firm_members.occupies_seat so that a
-- firm admin who declines training does not silently consume a seat their firm
-- paid for.
-- ---------------------------------------------------------------------------


-- ─── 1a. Explicit seat occupancy ────────────────────────────────────────────
--
-- An explicit column, rather than deriving occupancy from role plus a
-- cross-table enrollments lookup, because the enrollment row is created AFTER
-- the member's status flip — a trigger reading enrollments would race and see
-- stale state.

alter table public.firm_members
  add column if not exists occupies_seat boolean not null default true;

comment on column public.firm_members.occupies_seat is
  'Whether this member consumes one of the firm''s purchased seats. Employees are always true. A firm admin is created false by the Stripe webhook and flipped to true only if they opt into training during onboarding.';


-- ─── 1b. Rewrite sync_used_seats() around one predicate ─────────────────────
--
-- A row occupies a seat when: occupies_seat AND status IN ('invited','active').
--
-- A pending invite DOES reserve a seat (decision: Max, 2026-07-29), so the
-- invited -> active transition is occupying -> occupying and must be a no-op.
-- That silence is precisely what removes the double count.
--
-- Full status domain is ('invited','active','deactivated','deleted',
-- 'reassigned') per 0004_reminder_settings.sql — the three not listed here are
-- all non-occupying.

create or replace function public.sync_used_seats() returns trigger
  language plpgsql security definer
  set search_path = public
  as $$
  declare
    was_occupying boolean;
    now_occupying boolean;
  begin
    if TG_OP = 'INSERT' then
      if NEW.occupies_seat and NEW.status in ('invited', 'active') then
        update public.seats set used_seats = used_seats + 1, updated_at = now()
          where firm_id = NEW.firm_id;
      end if;

    elsif TG_OP = 'UPDATE' then
      was_occupying := OLD.occupies_seat and OLD.status in ('invited', 'active');
      now_occupying := NEW.occupies_seat and NEW.status in ('invited', 'active');

      if not was_occupying and now_occupying then
        update public.seats set used_seats = used_seats + 1, updated_at = now()
          where firm_id = NEW.firm_id;
      elsif was_occupying and not now_occupying then
        update public.seats set used_seats = greatest(used_seats - 1, 0), updated_at = now()
          where firm_id = NEW.firm_id;
      end if;

    elsif TG_OP = 'DELETE' then
      if OLD.occupies_seat and OLD.status in ('invited', 'active') then
        update public.seats set used_seats = greatest(used_seats - 1, 0), updated_at = now()
          where firm_id = OLD.firm_id;
      end if;
    end if;

    return coalesce(NEW, OLD);
  end;
  $$;

-- The trigger MUST watch occupies_seat as well as status. It was declared
-- `update of status` only; under that declaration, flipping occupies_seat
-- alone would not fire it and the admin training opt-in would never register
-- a seat.
drop trigger if exists trg_sync_used_seats on public.firm_members;

create trigger trg_sync_used_seats
  after insert or update of status, occupies_seat or delete on public.firm_members
  for each row execute function public.sync_used_seats();


-- ─── 1c. Backfill + reconcile ───────────────────────────────────────────────

-- Admins with no enrollment row never opted into training, so release the seat
-- they were silently holding. This UPDATE fires the trigger above; the
-- recompute that follows resettles every count regardless, so the intermediate
-- state does not matter.
update public.firm_members m
set occupies_seat = false
where m.role = 'admin'
  and not exists (
    select 1 from public.enrollments e
    where e.user_id = m.user_id and e.firm_id = m.firm_id
  );

-- Recompute every firm's count from scratch, repairing any existing
-- double-counted rows.
update public.seats s
set used_seats = (
  select count(*) from public.firm_members m
  where m.firm_id = s.firm_id
    and m.occupies_seat
    and m.status in ('invited', 'active')
), updated_at = now();
