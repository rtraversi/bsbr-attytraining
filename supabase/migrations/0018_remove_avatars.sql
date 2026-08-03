-- =============================================================================
-- 0014_remove_avatars.sql
-- Removes the profile-photo feature added in 0013.
--
-- Decision (Rob, 2026-07-28): this product should not hold profile photographs
-- of law firm staff at all. Staff are enrolled by their employer rather than
-- signing up themselves, the photo served no function in the certification
-- record, and 0013 created the bucket as PUBLIC (`public = true`) — meaning any
-- uploaded photo was readable by anyone holding the URL, without
-- authentication. Removing the feature eliminates that exposure outright rather
-- than mitigating it.
--
-- Application code for the feature is removed in the same change:
--   - app/api/account/avatar/route.ts            (deleted)
--   - app/dashboard/settings/_components/avatar-upload.tsx (deleted)
--   - avatar rendering in nav-pill.tsx, certification-forecast.tsx,
--     team-table.tsx, dashboard/page.tsx, dashboard/layout.tsx,
--     dashboard/settings/page.tsx
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Delete any stored objects first.
--    storage.buckets has a foreign key from storage.objects, so the bucket
--    cannot be dropped while it still holds files. This is written to be safe
--    whether or not anyone actually uploaded a photo.
-- ---------------------------------------------------------------------------
delete from storage.objects where bucket_id = 'avatars';

-- ---------------------------------------------------------------------------
-- 2. Drop the bucket.
-- ---------------------------------------------------------------------------
delete from storage.buckets where id = 'avatars';

-- ---------------------------------------------------------------------------
-- 3. NOTE — residual `avatar_url` keys in auth.users.raw_user_meta_data.
--
--    Any user who uploaded a photo still carries an `avatar_url` value in their
--    user_metadata. Those values are now inert: no application code reads the
--    key, and the URL they point at no longer resolves.
--
--    They are deliberately NOT cleaned up here. Writing to the `auth` schema
--    from a migration is discouraged by Supabase — that schema is managed by
--    the Auth service and direct writes can conflict with it. If the keys
--    should be stripped, do it through the Admin API
--    (`auth.admin.updateUserById`, spreading the existing user_metadata minus
--    `avatar_url`) as a one-off script, not as schema history.
-- ---------------------------------------------------------------------------
