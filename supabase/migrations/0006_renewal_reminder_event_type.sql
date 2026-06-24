ALTER TABLE training_events
  DROP CONSTRAINT IF EXISTS training_events_event_type_check;

ALTER TABLE training_events
  ADD CONSTRAINT training_events_event_type_check
  CHECK (event_type IN (
    'invite_sent','login','video_started','video_completed',
    'quiz_attempt','identity_attestation','cert_issued','cert_downloaded',
    'seat_reassigned','employee_record_deleted',
    'expiry_reminder_sent','inactivity_reminder_sent',
    'renewal_enrolled','renewal_reminder_sent'
  ));
