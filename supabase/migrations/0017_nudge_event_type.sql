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
-- Follows the 0004/0005/0006/0009/0011 pattern: drop the named CHECK and re-add
-- it with the FULL list, because Postgres cannot append a value to a text CHECK.
--
-- ⚠ The base list is carried forward from 0011, the MOST RECENT migration to
-- redefine this constraint — not from 0006. Six migrations touch it (0004,
-- 0005, 0006, 0009, 0011, and this one), and because each one restates the
-- whole list, copying from anything but the latest silently DROPS every value
-- added since. Sourcing from 0006 would have deleted 'knowledge_check_completed'
-- (0009) and 'lesson_location_changed' (0011), which are not dormant: they are
-- what lib/training/progress.ts derives lesson state from, what the Overview
-- activity feed renders, and what the reassignment progress lock reads. Losing
-- them would have failed every knowledge-check submit and every lesson-boundary
-- write at the constraint. Always diff against the latest definition.
--
-- 0011's 16 values + 'nudge_sent' = 17.
--
-- Adds no column, so types/supabase.ts needs no regeneration.

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
    'lesson_location_changed',
    'nudge_sent'
  ));
