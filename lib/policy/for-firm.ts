// =============================================================================
// One firm's assembled policy — the join between the intake and the assembler.
//
// Everything either side of this file already existed. lib/intake/session.ts
// knows how to find a firm's intake and read its answers; lib/policy/assemble.ts
// turns an AnswerMap into two deliverables. Nothing connected them, so the
// engine had 440 tests and no way for a firm to see its own policy.
//
// ── Why this is a module and not code in the route ──────────────────────────
// Because there are two callers and they must not disagree. The page renders
// the policy server-side and the route serves the .docx of the SAME policy; if
// each did its own "find the session, load the answers, assemble", a firm could
// read one document on screen and download a different one. That is the failure
// mode worth a file.
//
// 🔴 THE GATE IS NOT HERE. authorizeIntake() runs in the route and the page,
// exactly as it does for the four intake routes — this function is handed a
// firmId that has already been proved. It is deliberately not a second opinion
// about who owns an intake: lib/intake/session.ts's header says that decision
// lives in one place, and adding a rival here is how the two drift.
//
// SERVER ONLY. It reads through the service-role client.
// =============================================================================

import { intakeStateOf, type IntakeState } from '@/lib/intake/review'
import { latestSession, loadAnswers } from '@/lib/intake/session'
import type { createAdminClient } from '@/lib/supabase/admin'
import { assemble } from '@/lib/policy/assemble'
import type { AssembleResult } from '@/lib/policy/types'

type AdminClient = ReturnType<typeof createAdminClient>

export type PolicyUnavailable =
  /** The firm has never started an intake. */
  | 'no-intake'
  /** There is an intake, but it is open — mid-answer, so there is nothing settled to assemble. */
  | 'intake-open'
  /**
   * Submitted, and NOT YET APPROVED BY AN ATTORNEY.
   *
   * 🔴 THIS IS THE CORRECTNESS FIX, AND IT IS WHY THIS TYPE GREW A THIRD
   * MEMBER. Until 2026-09-01 a submitted session returned ok:true, so
   * /dashboard/policy showed a firm its own unreviewed draft — every
   * untranscribed clause, red TODO markers and all — before any attorney had
   * looked at it. A firm reading that could reasonably believe it was their
   * policy, and it is not: it is the engine's output pending review.
   */
  | 'intake-submitted'

export type PolicyForFirm =
  | {
      ok: true
      firmName: string
      sessionId: string
      state: Extract<IntakeState, 'submitted' | 'delivered'>
      submittedAt: string | null
      deliveredAt: string | null
      result: AssembleResult
    }
  | {
      ok: false
      reason: PolicyUnavailable
      /** Present on 'intake-submitted', so the waiting screen can say since when. */
      submittedAt?: string | null
    }

/**
 * Assemble the policy for one firm from its latest intake.
 *
 * ── 🔴 Why a SUBMITTED intake is refused, unless the caller says otherwise ──
 * A submitted intake has settled answers, so it assembles perfectly well. What
 * it has not had is an attorney reading the result. Delivery is the act of
 * approving it (see lib/policy/delivery.ts), and `policy_delivered_at` is the
 * record of that act — so `delivered` is the only state a FIRM may read.
 *
 * `allowUndelivered` is how the operator reads exactly the same document before
 * approving it. One code path, two callers, which is the reason this module
 * exists at all — an operator script that assembled the policy its own way
 * could approve a document the firm never receives.
 *
 * ⚠️ It defaults to FALSE, and every firm-facing caller must leave it that way.
 * The parameter is deliberately not a string option or a config object: it is
 * one boolean, at one call site, in a script that is never deployed.
 *
 * ── Why an OPEN intake is refused ───────────────────────────────────────────
 * D8-2 lets a firm reopen its intake at any time, including after the policy
 * has been delivered. While it is open the answers are mid-edit: half of them
 * are the firm's settled position and half are whatever they have typed so far.
 * A policy assembled from that is a document about a state the firm is not in,
 * and it would carry the authority of a finished one. So this refuses, and the
 * page says why and points back at /intake.
 *
 * Note that this is NOT the old delivery lock. A delivered intake assembles
 * happily — that is the ordinary case.
 *
 * ── The firm name ───────────────────────────────────────────────────────────
 * Taken from the `firm_name` ANSWER first, and only then from firms.name. The
 * answer is what the policy's own title block resolves (P1's slot), so a
 * document whose heading and whose body disagreed about the firm's name would
 * be worse than one that used a slightly stale name consistently.
 */
export async function policyForFirm(
  admin: AdminClient,
  firmId: string,
  { allowUndelivered = false }: { allowUndelivered?: boolean } = {},
): Promise<PolicyForFirm> {
  const session = await latestSession(admin, firmId)
  if (!session) return { ok: false, reason: 'no-intake' }

  const state = intakeStateOf(session)
  if (state === 'editable') return { ok: false, reason: 'intake-open' }
  if (state === 'submitted' && !allowUndelivered) {
    return { ok: false, reason: 'intake-submitted', submittedAt: session.submitted_at }
  }

  const [answers, firm] = await Promise.all([
    loadAnswers(admin, session.id),
    admin.from('firms').select('name').eq('id', firmId).maybeSingle(),
  ])

  const answered = answers['firm_name']
  const firmName =
    (typeof answered === 'string' && answered.trim()) || firm.data?.name?.trim() || 'Your firm'

  return {
    ok: true,
    firmName,
    sessionId: session.id,
    state,
    submittedAt: session.submitted_at,
    deliveredAt: session.policy_delivered_at,
    result: assemble(answers),
  }
}

/**
 * A filename a firm will recognise a year later in their downloads folder.
 *
 * The firm's own name, then what the document is. Everything outside
 * [A-Za-z0-9] collapses to a single hyphen because this string crosses a
 * Content-Disposition header, and a quote or a newline in a firm name would be
 * a header-injection bug rather than a cosmetic one.
 */
export function policyFilename(firmName: string, kind: 'policy' | 'action-items'): string {
  const slug =
    firmName
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'firm'
  return `${slug}-AI-${kind === 'policy' ? 'Policy' : 'Action-Items'}.docx`
}
