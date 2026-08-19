// =============================================================================
// Terms acceptance — the single source of truth for which version is current.
//
// ix-termsaccept. Terms §1 asserts that the customer has accepted these terms.
// Until this shipped, nothing in the product ever asked, so that sentence was
// false for every account. Acceptance is now recorded at the two moments a
// person first becomes bound:
//
//   • firm admins  — at checkout, BEFORE the Stripe session is created, so the
//                    record exists even if the card is later declined.
//   • staff        — at password-set, which is the first time an invited
//                    employee acts as a user rather than an invitee.
//
// 🔴 THIS VERSION STRING IS A DRAFT MARKER. app/terms/page.tsx still reads
// "Last updated: [DATE] — [ATTORNEY TO COMPLETE]". When the reviewed terms
// land, bump CURRENT_TERMS_VERSION in the same commit that publishes them.
// Everyone who accepted an older version has a durable record of WHICH text
// they agreed to, which is the entire point of storing the version alongside
// the timestamp rather than storing a boolean.
// =============================================================================

/**
 * Identifies the exact Terms text a person agreed to.
 *
 * Format: `v<n>-<state>-<YYYY-MM-DD>`. Bump on every substantive change to
 * app/terms/page.tsx. Never reuse a version for changed text — a stored
 * acceptance is only meaningful if the version pins the wording.
 */
export const CURRENT_TERMS_VERSION = 'v1-draft-2026-08-18'

/** Where the text lives, for the acceptance checkbox to link to. */
export const TERMS_PATH = '/terms'
export const PRIVACY_PATH = '/privacy'
export const DPA_PATH = '/dpa'

/**
 * Accept only the version we are currently serving.
 *
 * A client that posts a stale version is running old JS against newly published
 * terms. Refusing is correct: they agreed to text that is no longer what they
 * would be bound by, and a reload puts them in front of the current wording.
 */
export function isCurrentTermsVersion(v: unknown): v is string {
  return typeof v === 'string' && v === CURRENT_TERMS_VERSION
}
