-- =============================================================================
-- 0012_scorm_suspend_data.sql
-- Real resume for the embedded Rise course.
--
-- Rise 360's resume mechanism reads cmi.suspend_data — the compact string it
-- rewrites every 1–2s to record which slides/cards/blocks the learner has seen
-- and where they are WITHIN a lesson. 0011 only persisted cmi.core.lesson_location
-- (the coarse lesson boundary), which Rise does NOT use to restore state — so on
-- every return to the Content tab Rise found an empty suspend_data and restarted
-- from the top. This adds the two columns needed to seed a real resume.
--
-- These live on firm_members (not enrollments): the member row exists the moment
-- a provisioned employee opens the course, whereas an enrollment may not exist
-- until they first pass (enroll_self / lazy enrollment). Storing here means
-- resume works from the very first session.
--
-- Both are MUTABLE, one-value-per-learner state (overwritten on each save), not
-- append-only audit — so a column, not a training_events row, is the correct home
-- (same reasoning as total_training_seconds in 0011).
-- =============================================================================

alter table public.firm_members
  add column if not exists scorm_suspend_data text,
  add column if not exists scorm_lesson_location text;
