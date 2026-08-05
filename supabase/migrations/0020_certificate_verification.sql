-- =============================================================================
-- 0020_certificate_verification.sql
-- Satisfies: public certificate verification (launch requirement) + revocation
-- =============================================================================
--
-- WHY A SEPARATE TOKEN AND NOT certificate_number
--
-- The plan for this work justified the token by saying certificate numbers come
-- from a sequential counter. That WAS true under 0001 ('CERT-' || YYYYMMDD ||
-- nextval), but 0014 replaced it with IX-YYYYMMDD-#### where the tail is
-- random. So the "walk the counter" attack no longer exists.
--
-- The conclusion survives anyway, for a different and sharper reason: a 4-digit
-- tail is 10,000 possibilities per calendar date. That is not a search space,
-- it is a morning's work at one request per second. Worse, 0014's own stated
-- goal was to stop the number leaking issuance volume — and a verify endpoint
-- that answers "does this number exist" hands that leak straight back, one
-- probe at a time.
--
-- So: verification is keyed on a 128-bit random token that appears only in the
-- QR code. The printed IX- number stays human-readable for support lookup, and
-- the typed-number path requires the holder's surname as a second factor
-- (app/verify), never a bare existence check.
-- ---------------------------------------------------------------------------

-- pgcrypto ships with Supabase (GoTrue depends on it for password hashing), so
-- this is a guard, not an install. It is created into `extensions` to match
-- Supabase's convention; if it already exists elsewhere, `if not exists` leaves
-- it there and the pinned search_path below still resolves gen_random_bytes.
create extension if not exists pgcrypto with schema extensions;

-- 16 bytes = 128 bits, hex-encoded to 32 characters.
--
-- Deliberately NOT gen_random_uuid(): a v4 uuid spends 6 of its bits on version
-- and variant markers, leaving 122. That is still unguessable, but this column
-- is the only thing standing between a public endpoint and every certificate
-- holder's name and employer, so it gets the full 128 rather than a value
-- chosen for looking familiar.
--
-- security definer + pinned search_path follows generate_certificate_number
-- (0014): the function must behave identically no matter which role calls it.
create or replace function public.generate_verification_token() returns text
  language sql
  security definer
  set search_path = public, extensions
  as $$
    select encode(gen_random_bytes(16), 'hex');
  $$;

revoke execute on function public.generate_verification_token() from public;
revoke execute on function public.generate_verification_token() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Columns.
--
-- Revocation is added now, with the rest, and not later. There is currently no
-- way to invalidate a certificate issued in error or obtained by gaming the
-- training; adding the column alongside the verify endpoint means the endpoint
-- can honour it from day one. Retrofitting it later means a live verify route
-- that reports every revoked certificate as valid until the migration lands.
-- ---------------------------------------------------------------------------
-- holder_name / firm_name are SNAPSHOTS, taken when the certificate is issued.
-- Two independent reasons, either of which would justify them alone:
--
--  1. Verification must agree with the artifact. The PDF prints a name at issue
--     time. Names and firm names both change — someone marries, a partnership
--     renames — and a verify page reading today's profile would then contradict
--     the paper certificate it is supposed to confirm.
--
--  2. It keeps auth.users off the public code path entirely. Without these, the
--     unauthenticated verify route would have to call getUserById to render a
--     name, one accidental field away from publishing an email address. With
--     them, the route reads exactly one table and structurally cannot leak one.
alter table public.certificates
  add column if not exists verification_token text default public.generate_verification_token(),
  add column if not exists revoked_at         timestamptz,
  add column if not exists revoked_reason     text,
  add column if not exists holder_name        text,
  add column if not exists firm_name          text;

-- Backfill. A volatile default already forces a per-row evaluation on ALTER, so
-- this should be a no-op — it is here so the NOT NULL below can never fail on a
-- database where that assumption turns out not to hold.
update public.certificates
   set verification_token = public.generate_verification_token()
 where verification_token is null;

alter table public.certificates
  alter column verification_token set not null;

-- Backfill the snapshots from today's values. This is the one and only time
-- these are read from live sources; from here the generation route writes them.
--
-- full_name is NOT coalesced to the email address, even though lib/cert-pdf.ts
-- does exactly that when it draws the name. Falling back to the email is
-- defensible on a private PDF sent to its own subject; repeating it on a public
-- endpoint would publish that address to anyone holding the link. A holder with
-- no recorded name verifies as a certificate with no recorded name.
update public.certificates c
   set holder_name = nullif(trim(u.raw_user_meta_data ->> 'full_name'), '')
  from auth.users u
 where u.id = c.user_id
   and c.holder_name is null;

update public.certificates c
   set firm_name = f.name
  from public.firms f
 where f.id = c.firm_id
   and c.firm_name is null;

-- Unique is correctness, not just hygiene: a collision would make one
-- certificate's token resolve to another holder's name and firm.
create unique index if not exists idx_certificates_verification_token
  on public.certificates (verification_token);

-- ---------------------------------------------------------------------------
-- Rate limiting for the public verify endpoint.
--
-- Needed because /verify is the only unauthenticated surface in the product
-- that reads real people's names. The token path is unguessable, so this is
-- defence in depth there; the surname path genuinely needs it, because the
-- certificate number's search space is only 10,000 per date.
--
-- Fixed-window counters keyed on (ip, window_start). Fixed rather than sliding
-- because a sliding window needs per-request rows, and this table must not grow
-- faster than the traffic it is protecting against.
--
-- Service-role only: no RLS policies are defined, and RLS is enabled, so anon
-- and authenticated can reach nothing here even though the route is public.
-- ---------------------------------------------------------------------------
create table if not exists public.verification_rate_limit (
  ip           text        not null,
  window_start timestamptz not null,
  attempts     int         not null default 0,
  primary key (ip, window_start)
);

alter table public.verification_rate_limit enable row level security;

create index if not exists idx_verification_rate_limit_window
  on public.verification_rate_limit (window_start);

-- Returns true when the caller is ALLOWED to proceed.
--
-- The insert-then-increment is a single statement so two concurrent requests
-- cannot both read "0 attempts" and both be allowed. Checking the count after
-- incrementing (rather than before) means the limit is exact rather than
-- off-by-one under contention.
create or replace function public.check_verification_rate_limit(
  p_ip             text,
  p_limit          int,
  p_window_seconds int
) returns boolean
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_window_start timestamptz;
    v_attempts     int;
  begin
    -- Floor now() onto the window grid, so every caller in the same window
    -- shares one row rather than each creating their own.
    v_window_start := to_timestamp(
      floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
    );

    insert into public.verification_rate_limit (ip, window_start, attempts)
    values (p_ip, v_window_start, 1)
    on conflict (ip, window_start)
      do update set attempts = public.verification_rate_limit.attempts + 1
    returning attempts into v_attempts;

    -- Opportunistic cleanup, ~1% of calls. A dedicated cron for a table this
    -- small would be more moving parts than the problem deserves, and the
    -- window index makes the delete cheap.
    if random() < 0.01 then
      delete from public.verification_rate_limit
       where window_start < now() - interval '1 day';
    end if;

    return v_attempts <= p_limit;
  end;
  $$;

revoke execute on function public.check_verification_rate_limit(text, int, int) from public;
revoke execute on function public.check_verification_rate_limit(text, int, int) from anon, authenticated;
