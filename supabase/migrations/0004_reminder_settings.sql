-- =============================================================================
-- 0004_reminder_settings.sql
-- Satisfies: AUTO-03 (expiry + inactivity reminders), DASH-09/DASH-05 fix
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add reminder_days to firms
--    Admins can configure 3 / 7 / 14 days via the dashboard dropdown.
-- ---------------------------------------------------------------------------
alter table public.firms
  add column if not exists reminder_days integer not null default 7;

-- ---------------------------------------------------------------------------
-- 2. Expand training_events.event_type to include reminder event types.
--    The original CHECK was defined inline so Postgres auto-named it
--    training_events_event_type_check.
-- ---------------------------------------------------------------------------
alter table public.training_events
  drop constraint if exists training_events_event_type_check;

alter table public.training_events
  add constraint training_events_event_type_check
  check (event_type in (
    'invite_sent',
    'login',
    'video_started',
    'video_completed',
    'quiz_attempt',
    'identity_attestation',
    'cert_issued',
    'cert_downloaded',
    'seat_reassigned',
    'employee_record_deleted',
    'expiry_reminder_sent',
    'inactivity_reminder_sent'
  ));

-- ---------------------------------------------------------------------------
-- 3. Expand firm_members.status to include 'deleted' and 'reassigned'.
--    These statuses were introduced in DASH-09 and DASH-05 but were absent
--    from the original inline CHECK constraint.
-- ---------------------------------------------------------------------------
alter table public.firm_members
  drop constraint if exists firm_members_status_check;

alter table public.firm_members
  add constraint firm_members_status_check
  check (status in ('invited', 'active', 'deactivated', 'deleted', 'reassigned'));
