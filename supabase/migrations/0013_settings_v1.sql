-- =============================================================================
-- 0013_settings_v1.sql
-- Satisfies: Settings page v1 — notification preferences + avatar storage
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Notification preference flags on firms.
--    notify_cert_earned: email the firm admin when a team member earns a cert.
--    notify_weekly_summary: preference only in this pass — no digest built yet.
-- ---------------------------------------------------------------------------
alter table public.firms
  add column if not exists notify_cert_earned    boolean not null default true,
  add column if not exists notify_weekly_summary boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. Avatars bucket — public read (served via public URL, no signing), one
--    object per user at path `{user_id}` (no extension; content-type carries
--    the format). Writes go through the admin/service-role client only (the
--    avatar upload route), so no additional storage.objects RLS is needed —
--    the public flag alone makes reads work, and the service role bypasses
--    RLS for writes. Same shape as the `certificates` bucket, which was
--    created manually in the dashboard; this one is versioned here instead.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
