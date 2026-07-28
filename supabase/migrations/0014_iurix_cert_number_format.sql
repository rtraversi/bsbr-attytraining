-- =============================================================================
-- 0014_iurix_cert_number_format.sql
-- Satisfies: Iurix rename — certificate numbers move to IX-YYYYMMDD-####
-- =============================================================================
--
-- Was: 'CERT-' || YYYYMMDD || '-' || nextval(certificate_number_seq) padded to 5
-- (0001_initial_schema.sql). The sequential tail leaked issuance volume and the
-- CERT- prefix is off-brand. New shape keeps the date for support lookup and
-- swaps the counter for a random 4-digit tail: IX-20260921-4821.
--
-- Not retroactive — certificates.certificate_number is a stored value, so any
-- already-issued CERT-... numbers keep their original form. Confirmed with Max
-- 2026-07-28: no real certificates have been issued, so there is nothing to
-- reconcile.
--
-- public.certificate_number_seq is intentionally left in place; nothing reads it
-- after this migration, but dropping it is tidy-up, not a requirement.
-- ---------------------------------------------------------------------------

-- A random tail is not collision-proof by construction the way nextval() was,
-- and certificates.certificate_number carries a unique constraint. Generate and
-- retry against existing rows, capped so a pathological case fails loudly
-- instead of spinning. The unique constraint remains the real guarantee — this
-- loop just keeps the insert from failing in practice.
--
-- security definer + pinned search_path so the uniqueness probe sees every row
-- regardless of the caller's RLS context. Today the only caller is the cert
-- generation route via the service role (app/api/certs/generate/route.ts), which
-- bypasses RLS anyway; this keeps the function correct if that ever changes.
create or replace function public.generate_certificate_number() returns text
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    candidate text;
    attempts  int := 0;
  begin
    loop
      candidate := 'IX-' || to_char(now(), 'YYYYMMDD') || '-'
                   || lpad(floor(random() * 10000)::int::text, 4, '0');

      exit when not exists (
        select 1 from public.certificates where certificate_number = candidate
      );

      attempts := attempts + 1;
      if attempts >= 10 then
        raise exception
          'generate_certificate_number: no free number after % attempts for %',
          attempts, to_char(now(), 'YYYYMMDD');
      end if;
    end loop;

    return candidate;
  end;
  $$;
