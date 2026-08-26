// =============================================================================
// Policy intake — the upload bucket.
//
// One file per intake at most: the firm's existing AI policy, attached when
// they answer yes to `existing_policy`. A human reads it. It is never parsed,
// and it is never sent to a model.
// =============================================================================

/**
 * 🔴 CAPITAL I. Supabase Storage bucket ids are case-sensitive, the bucket was
 * created this way on staging, and it CANNOT be renamed. `intake-uploads` is a
 * different bucket that does not exist, and Storage answers for it with a 404
 * rather than an error that names the problem.
 *
 * This is the only place the literal appears. Import it; do not type it.
 */
export const INTAKE_UPLOAD_BUCKET = 'Intake-uploads'

/**
 * 🔴 STAGING ONLY as of 2026-08-26. The bucket does not exist on production.
 * Creating it is a Storage dashboard action — a migration cannot do it — and it
 * has to happen before the intake ships.
 */
export const INTAKE_UPLOAD_BUCKET_EXISTS_ON_PROD = false

/** 10 MB. Enforced server-side at upload; the client limit is a courtesy. */
export const INTAKE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024

/**
 * PDF and Word only. Not a security control — a content type is whatever the
 * uploader claims — but it keeps the honest 95% from attaching a screenshot or
 * a zip that Katy then cannot open.
 */
export const INTAKE_UPLOAD_CONTENT_TYPES: readonly string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

/** For the file picker's `accept`. Extensions, because browsers match on those. */
export const INTAKE_UPLOAD_ACCEPT = '.pdf,.doc,.docx'
