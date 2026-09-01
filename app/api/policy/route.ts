// =============================================================================
// GET /api/policy — the firm's assembled AI policy.
//
// Two representations of ONE resource, chosen by `?format=`:
//
//   /api/policy                                   → JSON: the policy and the
//                                                   action items, as assemble()
//                                                   produced them
//   /api/policy?format=docx                       → the policy as a .docx
//   /api/policy?format=docx&document=action-items → the action item list as a
//                                                   .docx
//
// ── Why one route and not two ───────────────────────────────────────────────
// Because it is one resource. A second route would need its own copy of the
// gate, its own session lookup and its own assemble() call, and the way that
// goes wrong is not a crash: it is a firm reading one policy on screen and
// downloading a different one. Both formats go through policyForFirm(), so
// there is exactly one answer to "what is this firm's policy".
//
// ── The gate is the intake's, unchanged ─────────────────────────────────────
// authorizeIntake() — admin of a firm, claims read from app_metadata, which the
// user cannot edit. Identical to the four routes under /api/intake, and
// deliberately not a new pattern: the policy is assembled from the intake's
// answers, so anyone who may not read the intake may not read this either.
// The firmId comes from the verified claim and is never taken from the request.
// =============================================================================

import { NextResponse } from 'next/server'

import { authorizeIntake } from '@/lib/intake/session'
import { createAdminClient } from '@/lib/supabase/admin'
import { actionItemParagraphs, docx, policyParagraphs } from '@/lib/policy/docx'
import { policyFilename, policyForFirm, type PolicyUnavailable } from '@/lib/policy/for-firm'

/** What the two refusals mean, in words a firm admin can act on. */
const UNAVAILABLE: Record<PolicyUnavailable, { status: 404 | 409; error: string }> = {
  'no-intake': {
    status: 404,
    error: 'There is no completed intake for this firm yet, so there is no policy to assemble.',
  },
  'intake-open': {
    status: 409,
    error:
      'Your intake is open for editing. Send it again to have your policy assembled from the ' +
      'answers as they now stand.',
  },
}

export async function GET(request: Request) {
  const auth = await authorizeIntake()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const admin = createAdminClient()
  const found = await policyForFirm(admin, auth.actor.firmId)

  if (!found.ok) {
    const { status, error } = UNAVAILABLE[found.reason]
    return NextResponse.json({ error, reason: found.reason }, { status })
  }

  const url = new URL(request.url)
  const format = url.searchParams.get('format')
  const wantsActionItems = url.searchParams.get('document') === 'action-items'

  // ── JSON ────────────────────────────────────────────────────────────────
  if (format !== 'docx') {
    return NextResponse.json({
      firmName: found.firmName,
      state: found.state,
      submittedAt: found.submittedAt,
      deliveredAt: found.deliveredAt,
      // Two deliverables, side by side and never merged — D2. See the header of
      // lib/policy/action-items.ts for why that separation is substantive.
      policy: found.result.policy,
      actionItems: found.result.actionItems,
    })
  }

  // ── .docx ───────────────────────────────────────────────────────────────
  const bytes = wantsActionItems
    ? docx(actionItemParagraphs(found.result.actionItems, found.firmName))
    : docx(policyParagraphs(found.result.policy, found.firmName))

  const filename = policyFilename(found.firmName, wantsActionItems ? 'action-items' : 'policy')

  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(bytes.length),
      // A firm's own policy, assembled from answers they can change at any time
      // (D8-2). Nothing about it is cacheable, and a shared cache holding one
      // firm's policy is the worst version of getting that wrong.
      'Cache-Control': 'no-store, private',
    },
  })
}
