-- Allow multiple enrollment rows per (firm_id, user_id, course_id).
-- RENEW-04 inserts a new enrollment row on each annual renewal cycle;
-- the unique constraint blocked that. All enrollment reads use
-- ORDER BY created_at DESC LIMIT 1 to pick the newest row.
ALTER TABLE enrollments
  DROP CONSTRAINT enrollments_firm_id_user_id_course_id_key;
