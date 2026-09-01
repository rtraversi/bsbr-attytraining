// =============================================================================
// policyForFirm() — the join between the intake and the assembler.
//
// The assembler is covered by 400-odd tests and the intake by its own. What was
// untested until this file is the SEAM: which sessions produce a policy, which
// are refused, and where the firm's name comes from. Those are the three
// decisions this module makes, and none of them is visible from either side.
//
// The Supabase client is faked rather than mocked with a library. It needs to
// answer four call shapes and no more, and a hand-written stub that fails
// loudly on an unexpected table is a better test than a permissive mock that
// silently returns undefined for a query somebody changed.
// =============================================================================

import { describe, expect, it } from 'vitest'

import { policyFilename, policyForFirm } from '@/lib/policy/for-firm'
import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

interface FakeState {
  session: Record<string, unknown> | null
  answers: { question_key: string; value: unknown }[]
  firmName: string | null
}

/**
 * The narrowest client that satisfies latestSession(), loadAnswers() and the
 * firms lookup. Any other table throws — a query nobody anticipated should fail
 * the test, not return undefined and be papered over downstream.
 */
function fakeAdmin(state: FakeState): AdminClient {
  const thenable = (data: unknown) => {
    const chain: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order', 'limit']) {
      chain[method] = () => chain
    }
    chain.maybeSingle = async () => ({ data, error: null })
    // loadAnswers awaits the builder itself rather than calling maybeSingle().
    chain.then = (resolve: (v: unknown) => unknown) => resolve({ data, error: null })
    return chain
  }

  return {
    from(table: string) {
      switch (table) {
        case 'intake_sessions':
          return thenable(state.session)
        case 'intake_answers':
          return thenable(state.answers)
        case 'intake_sensitive':
          return thenable([])
        case 'firms':
          return thenable(state.firmName === null ? null : { name: state.firmName })
        default:
          throw new Error(`unexpected table "${table}"`)
      }
    },
  } as unknown as AdminClient
}

const SUBMITTED = {
  id: 'session-1',
  status: 'submitted',
  submitted_at: '2026-08-01T00:00:00Z',
  policy_delivered_at: null,
  reopened_count: 0,
}

const ANSWERS = [
  { question_key: 'firm_name', value: 'Chavez Law' },
  { question_key: 'jurisdictions', value: ['NC'] },
]

describe('which sessions produce a policy', () => {
  it('a submitted intake does', async () => {
    const found = await policyForFirm(
      fakeAdmin({ session: SUBMITTED, answers: ANSWERS, firmName: 'Chavez Law LLC' }),
      'firm-1',
    )
    expect(found.ok).toBe(true)
    if (!found.ok) return
    expect(found.state).toBe('submitted')
    expect(found.result.policy.sections.length).toBeGreaterThan(0)
  })

  it('a DELIVERED intake does too — this is the ordinary case', async () => {
    const found = await policyForFirm(
      fakeAdmin({
        session: { ...SUBMITTED, policy_delivered_at: '2026-08-10T00:00:00Z' },
        answers: ANSWERS,
        firmName: 'Chavez Law LLC',
      }),
      'firm-1',
    )
    expect(found.ok).toBe(true)
    if (found.ok) expect(found.state).toBe('delivered')
  })

  it('no session at all is refused as no-intake', async () => {
    const found = await policyForFirm(fakeAdmin({ session: null, answers: [], firmName: 'X' }), 'f')
    expect(found).toEqual({ ok: false, reason: 'no-intake' })
  })

  it('🔴 an OPEN intake is refused, and that is not the old delivery lock', async () => {
    // D8-2 lets a firm reopen at any time. While it is open the answers are
    // mid-edit — half settled position, half whatever has been typed so far —
    // and a policy assembled from that would carry the authority of a finished
    // document about a state the firm is not in.
    const found = await policyForFirm(
      fakeAdmin({
        session: { ...SUBMITTED, status: 'in_progress' },
        answers: ANSWERS,
        firmName: 'X',
      }),
      'f',
    )
    expect(found).toEqual({ ok: false, reason: 'intake-open' })
  })

  it('🔴 reopened and resubmitted after delivery still produces a policy', async () => {
    // The state D8-2 created: policy_delivered_at set, submitted_at later.
    // intakeStateOf reads it as `submitted` — a fresh policy is due, and this
    // is exactly where the firm goes to get it.
    const found = await policyForFirm(
      fakeAdmin({
        session: {
          ...SUBMITTED,
          policy_delivered_at: '2026-08-10T00:00:00Z',
          submitted_at: '2026-08-20T00:00:00Z',
        },
        answers: ANSWERS,
        firmName: 'X',
      }),
      'f',
    )
    expect(found.ok).toBe(true)
    if (found.ok) expect(found.state).toBe('submitted')
  })
})

describe('the firm name', () => {
  it('prefers the ANSWER over firms.name', async () => {
    // The answer is what the policy's own title block resolves (P1's slot). A
    // document whose heading and body disagreed about the firm's name would be
    // worse than one using a slightly stale name consistently.
    const found = await policyForFirm(
      fakeAdmin({ session: SUBMITTED, answers: ANSWERS, firmName: 'Stale Name LLC' }),
      'f',
    )
    expect(found.ok && found.firmName).toBe('Chavez Law')
  })

  it('falls back to firms.name when the answer is missing', async () => {
    const found = await policyForFirm(
      fakeAdmin({ session: SUBMITTED, answers: [], firmName: 'Fallback LLC' }),
      'f',
    )
    expect(found.ok && found.firmName).toBe('Fallback LLC')
  })

  it('falls back again rather than rendering an empty heading', async () => {
    const found = await policyForFirm(
      fakeAdmin({ session: SUBMITTED, answers: [{ question_key: 'firm_name', value: '   ' }], firmName: null }),
      'f',
    )
    expect(found.ok && found.firmName).toBe('Your firm')
  })
})

describe('the download filename', () => {
  it('names the firm and the document', () => {
    expect(policyFilename('Chavez Law', 'policy')).toBe('Chavez-Law-AI-Policy.docx')
    expect(policyFilename('Chavez Law', 'action-items')).toBe('Chavez-Law-AI-Action-Items.docx')
  })

  it('🔴 cannot inject into the Content-Disposition header', () => {
    // This string crosses a response header. A quote or a newline in a firm
    // name would be a header-injection bug, not a cosmetic one.
    const nasty = policyFilename('Ev"il\r\nX-Injected: 1', 'policy')
    expect(nasty).not.toMatch(/["\r\n]/)
    expect(nasty).toBe('Ev-il-X-Injected-1-AI-Policy.docx')
  })

  it('never produces a nameless file', () => {
    expect(policyFilename('！！！', 'policy')).toBe('firm-AI-Policy.docx')
    expect(policyFilename('', 'action-items')).toBe('firm-AI-Action-Items.docx')
  })
})
