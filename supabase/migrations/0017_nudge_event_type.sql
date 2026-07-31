-- 0017_nudge_event_type.sql
-- Satisfies: the manual "Nudge" button must leave an audit trail.
--
-- Every automated reminder already writes a training_events row, and
-- app/api/firm/audit-log/export reads those rows to build the firm's Rule 5.3
-- paper trail. The one reminder that wrote nothing was the manual one — so the
-- most deliberate supervision act in the product, a partner personally chasing
-- a staff member, was the only one leaving no evidence.
--
-- 'nudge_sent' is a SEPARATE type, not a reuse of 'inactivity_reminder_sent'
-- (Max's call). Collapsing them would have fixed the cron's dedupe for free,
-- but it would also have destroyed the distinction between "the system
-- auto-sent this" and "the attorney personally chased this person" — which is
-- the entire reason the manual send is worth logging at all.
--
-- Same shape as 0006: drop the CHECK, re-add it with the FULL list. Postgres
-- has no "add a value to a text CHECK" operation, so the list is restated.
-- Adds no column, so types/supabase.ts needs no regeneration.

ALTER TABLE training_events
  DROP CONSTRAINT IF EXISTS training_events_event_type_check;

ALTER TABLE training_events
  ADD CONSTRAINT training_events_event_type_check
  CHECK (event_type IN (
    'invite_sent','login','video_started','video_completed',
    'quiz_attempt','identity_attestation','cert_issued','cert_downloaded',
    'seat_reassigned','employee_record_deleted',
    'expiry_reminder_sent','inactivity_reminder_sent',
    'renewal_enrolled','renewal_reminder_sent',
    'nudge_sent'
  ));
