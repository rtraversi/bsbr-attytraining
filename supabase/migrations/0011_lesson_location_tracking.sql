-- =============================================================================
-- 0011_lesson_location_tracking.sql
-- Adds real per-lesson tracking + a time-spent counter for the embedded Rise
-- course, using signals the SCORM driver already emits (confirmed by
-- instrumenting scorm-content.tsx this session):
--   * cmi.core.lesson_location changes exactly when the learner crosses into a
--     new lesson (and the export blocks skipping ahead > 1 lesson, so it's
--     trustworthy) → recorded as a 'lesson_location_changed' training event.
--   * cmi.core.session_time ticks up ~every 20s → accumulated into a single
--     counter column on the enrollment (see the deliberate exception below).
--
-- Follows the 0004/0005/0006/0009 pattern: drop the named CHECK constraint and
-- re-add it with the full event-type list (never ALTER a CHECK in place). Full
-- list carried forward from 0009 (the most recent to touch it) + the new type.
--
-- 'lesson_location_changed' metadata jsonb stores:
--   { "lessonNumber": 1-5, "lessonId": string, "location": string }
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
    'knowledge_check_completed',
    'lesson_location_changed'
  ));

-- ---------------------------------------------------------------------------
-- total_training_seconds: a DELIBERATE exception to the "no separate progress
-- table, derive everything from append-only training_events" architecture
-- documented in lib/training/progress.ts.
--
-- Rationale: cmi.core.session_time ticks roughly every 20 seconds. Recording
-- one training_events row per tick would bloat the audit table by thousands of
-- rows per learner for a value that is PURE TELEMETRY — it gates nothing
-- (completion + lesson-check clearance remain the only gates). So this single
-- accumulator column is the right home for it; it is not a hidden second source
-- of truth for anything the events already own.
-- ---------------------------------------------------------------------------
alter table public.enrollments
  add column if not exists total_training_seconds integer not null default 0;

-- Atomic increment, called via .rpc() rather than read-modify-write from the
-- app: multiple tabs or a reconnect can post session_time deltas concurrently,
-- and a read-modify-write would drop increments under that race.
create or replace function public.increment_training_seconds(
  p_enrollment_id uuid,
  p_delta integer
) returns void
  language plpgsql
  as $$
  begin
    update public.enrollments
      set total_training_seconds = total_training_seconds + p_delta
      where id = p_enrollment_id;
  end;
  $$;
