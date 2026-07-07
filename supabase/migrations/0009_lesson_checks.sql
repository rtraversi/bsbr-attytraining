-- =============================================================================
-- 0009_lesson_checks.sql
-- Adds the 'knowledge_check_completed' training event type for the per-lesson
-- knowledge checks that drive the employee Overview gating/progress system.
--
-- Follows the 0004/0005/0006 pattern: drop the named CHECK constraint and
-- re-add it with the full event-type list (never ALTER a CHECK in place).
-- Full list carried forward from 0006 (the most recent to touch it) + the new
-- type appended.
--
-- No new table: attempt counts and clearance state are DERIVED by querying
-- these events per firm_member/lesson (same approach as the DASH-06 audit log).
-- Each 'knowledge_check_completed' row's metadata jsonb stores:
--   { "lesson": 1-5, "score": 0-100, "passed": boolean, "attemptNumber": number }
-- =============================================================================

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
    'inactivity_reminder_sent',
    'renewal_enrolled',
    'renewal_reminder_sent',
    'knowledge_check_completed'
  ));
