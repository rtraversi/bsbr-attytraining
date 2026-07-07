-- =============================================================================
-- 0010_rise_embed_url.sql
-- Adds the Articulate Rise 360 course link to courses, and backfills the
-- existing course row with the confirmed Quick Share URL.
--
-- The link opens in a NEW TAB (not an iframe): Articulate's Quick Share sends
-- `frame-ancestors 'self'` + `X-Frame-Options: sameorigin`, so it cannot be
-- framed from our domain.
-- =============================================================================

alter table public.courses
  add column if not exists rise_embed_url text;

update public.courses
  set rise_embed_url = 'https://share.articulate.com/g5IsRaevWCyhu8oIoRM-m';
