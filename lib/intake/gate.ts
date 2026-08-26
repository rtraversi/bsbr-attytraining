// =============================================================================
// Policy intake — the dashboard gate's path rules.
//
// Extracted from middleware.ts so the exemption logic can be driven by tests.
// The middleware itself is not reachable from vitest (it needs a NextRequest and
// a live session), and this is the half where a mistake is silent: a prefix
// match that is one character too loose lets `/dashboard/billing-export` past
// the gate, and nothing about that looks wrong when you read it.
//
// The rule this encodes (Max, 2026-08-26): an admin whose firm has no submitted
// intake goes to /intake, whatever route they arrived by. /dashboard/billing and
// /dashboard/support are the ONLY exemptions, so a firm with a payment problem
// can always reach us.
// =============================================================================

/**
 * Routes an admin may reach with no submitted intake.
 *
 * Two, and there is a reason for each. Billing: a firm whose card failed must be
 * able to fix it — gating that would trap a paying customer between a dashboard
 * they cannot reach and a payment they cannot make. Support: the same firm has
 * to be able to tell us so.
 *
 * Do not add to this list to make a screen "accessible during onboarding". The
 * gate exists because a firm that skips the intake lands on a dashboard with
 * nothing in it, and every exemption is a door back to that.
 */
export const INTAKE_GATE_EXEMPT_PATHS: readonly string[] = [
  '/dashboard/billing',
  '/dashboard/support',
] as const

/** Where a gated admin is sent. /intake resumes at current_question by itself. */
export const INTAKE_GATE_REDIRECT = '/intake'

/**
 * Whether this path is behind the gate.
 *
 * Segment-aware, not a bare `startsWith`. `/dashboard/billing-export` is NOT
 * `/dashboard/billing`, and treating it as exempt would open a route nobody
 * meant to open. Only the exact path or a real child of it (`…/billing/history`)
 * counts.
 */
export function requiresSubmittedIntake(pathname: string): boolean {
  // Normalise a trailing slash so `/dashboard/billing/` matches the exemption
  // rather than reading as a child segment with an empty name.
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  if (path !== '/dashboard' && !path.startsWith('/dashboard/')) return false

  return !INTAKE_GATE_EXEMPT_PATHS.some(
    (exempt) => path === exempt || path.startsWith(`${exempt}/`),
  )
}
