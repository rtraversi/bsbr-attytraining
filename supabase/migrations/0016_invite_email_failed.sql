-- =============================================================================
-- 0016_invite_email_failed.sql
-- Makes a failed invite email visible to the firm admin.
--
-- Both invite routes caught the Resend error, console.error'd it, and returned
-- success: true. By that point the auth user exists, the firm_members row
-- exists, and the sync_used_seats trigger has already counted the seat — so a
-- hard send failure produced a paid-for member who never got an email, and an
-- admin who was told it worked. That is how a Resend 403 went unnoticed for
-- days (2026-07-29).
--
-- A column rather than a training_events row: this is current state, not an
-- audit fact. The dashboard needs "does this person still need a resend?",
-- which off an append-only log means comparing the latest invite_sent against
-- the latest failure per member on every render. A boolean the resend path
-- clears answers it directly, and /api/invite/resend is the existing recovery
-- path that clears it.
--
-- Default false so every existing row reads "no known problem" — the flag only
-- ever means "we saw a send fail", never "we didn't check".
-- =============================================================================

alter table public.firm_members
  add column if not exists invite_email_failed boolean not null default false;

comment on column public.firm_members.invite_email_failed is
  'True when the most recent invite email to this member failed to send. Set by '
  '/api/invite and /api/invite/bulk; cleared by a successful /api/invite/resend. '
  'Drives the "invite not delivered" badge on the admin dashboard. Purely '
  'informational — it gates nothing and does not affect seat occupancy.';
