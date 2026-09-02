// =============================================================================
// What counts as a firm name, in one place.
//
// The name is captured at /onboarding, re-captured by the middleware gate if it
// is ever blank, and edited again as question one of the intake. Three writers,
// so "trim it, and refuse whitespace" is defined once here rather than three
// times with three slightly different ideas of empty.
//
// ── Why blank is a real state at all ────────────────────────────────────────
//
// app/api/webhooks/stripe/route.ts creates the firm row with name: ''. It used
// to write the literal 'My Firm', and a real buyer then spent the whole intake
// being told we were writing "My Firm"'s policy, because promoteIntake at
// SUBMIT was the only thing that ever corrected it (Max, 2026-09-02).
//
// Empty is therefore the honest initial state, and this module is what stops it
// surviving past the first screen.
// =============================================================================

/** firms.name is `text not null` with no CHECK — '' is a legal value, and is the blank state. */
export const FIRM_NAME_BLANK_MESSAGE = 'Enter your firm’s name.'

/**
 * The one normaliser.
 *
 * Returns the trimmed name, or null when there is no name — which covers a
 * non-string, an empty string, and a whitespace-only string alike. Callers that
 * write to firms.name MUST treat null as a refusal rather than writing it: a
 * whitespace-only name passes `not null`, passes a truthiness check on the raw
 * value, and then renders as blank everywhere.
 */
export function normalizeFirmName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Is what the database holds a usable name?
 *
 * The middleware gate's predicate. Deliberately the same normaliser the writers
 * use, so a value that was accepted on write can never read back as blank and
 * bounce the firm into a gate it already cleared.
 */
export function isFirmNameBlank(stored: string | null | undefined): boolean {
  return normalizeFirmName(stored) === null
}
