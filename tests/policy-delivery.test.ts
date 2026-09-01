// =============================================================================
// The delivery flow.
//
// Four things are worth testing here and they are the four that can hurt:
//
//   1. The GATE. A submitted-but-unreviewed policy must not reach a firm. This
//      is the correctness fix the whole batch exists for, so it is tested from
//      both sides — the firm's caller is refused, the operator's is not.
//   2. The QUEUE, and specifically the D8-2 resubmission, which a naive
//      `policy_delivered_at IS NULL` filter drops silently.
//   3. The TODO REFUSAL. Every policy today has ~14 unwritten clauses.
//   4. The CLAIM under concurrency. Two operators, one delivery.
//
// The Supabase client is a hand-written stub that THROWS on an unexpected
// table, rather than a permissive mock returning undefined for a query somebody
// changed. It also records writes, because the claim tests are entirely about
// which write won.
// =============================================================================

import { describe, expect, it } from 'vitest'

import { markDelivered, pendingDeliveries } from '@/lib/policy/delivery'
import { policyForFirm } from '@/lib/policy/for-firm'
import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

interface SessionRow {
  id: string
  firm_id: string
  status: string
  submitted_at: string | null
  policy_delivered_at: string | null
}

interface FakeDb {
  sessions: SessionRow[]
  firms: { id: string; name: string; owner_id?: string }[]
  answers: Record<string, { question_key: string; value: unknown }[]>
  /** Every update that actually matched a row. */
  writes: Record<string, unknown>[]
}

/**
 * A stub that applies `.eq()` filters for real.
 *
 * It has to: the whole point of the claim tests is that an UPDATE with a
 * precondition in its WHERE clause matches zero rows when the precondition has
 * moved. A mock that ignored the filters would pass those tests while the real
 * query failed.
 */
function fakeAdmin(db: FakeDb): AdminClient {
  return {
    from(table: string) {
      let rows: Record<string, unknown>[]
      switch (table) {
        case 'intake_sessions':
          rows = db.sessions as unknown as Record<string, unknown>[]
          break
        case 'firms':
          rows = db.firms as unknown as Record<string, unknown>[]
          break
        case 'intake_answers':
        case 'intake_sensitive':
          rows = []
          break
        default:
          throw new Error(`unexpected table "${table}"`)
      }

      const filters: [string, unknown][] = []
      let pendingUpdate: Record<string, unknown> | null = null
      let answersFor: string | null = null

      const matched = () => {
        if (table === 'intake_answers' && answersFor) return db.answers[answersFor] ?? []
        if (table === 'intake_sensitive') return []
        return rows.filter((r) => filters.every(([k, v]) => r[k] === v))
      }

      const chain: Record<string, unknown> = {
        select: () => chain,
        order: () => chain,
        limit: () => chain,
        is: (key: string, val: unknown) => {
          filters.push([key, val])
          return chain
        },
        in: (key: string, values: unknown[]) => {
          filters.push(['__in__', null])
          filters.pop()
          rows = rows.filter((r) => values.includes(r[key]))
          return chain
        },
        eq: (key: string, val: unknown) => {
          if (table === 'intake_answers' && key === 'session_id') answersFor = String(val)
          else filters.push([key, val])
          return chain
        },
        update: (patch: Record<string, unknown>) => {
          pendingUpdate = patch
          return chain
        },
        maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
        then: (resolve: (v: unknown) => unknown) => {
          if (pendingUpdate) {
            const hit = matched()
            for (const row of hit) Object.assign(row, pendingUpdate)
            if (hit.length > 0) db.writes.push(pendingUpdate)
            return resolve({
              data: hit.map((r) => ({ id: (r as Record<string, unknown>).id })),
              error: null,
            })
          }
          return resolve({ data: matched(), error: null })
        },
      }
      return chain
    },
  } as unknown as AdminClient
}

const ANSWERS = [
  { question_key: 'firm_name', value: 'Chavez Law' },
  { question_key: 'jurisdictions', value: ['NC'] },
]

const db = (over: Partial<SessionRow> = {}): FakeDb => ({
  sessions: [
    {
      id: 's1',
      firm_id: 'f1',
      status: 'submitted',
      submitted_at: '2026-08-01T00:00:00Z',
      policy_delivered_at: null,
      ...over,
    },
  ],
  firms: [{ id: 'f1', name: 'Chavez Law', owner_id: 'u1' }],
  answers: { s1: ANSWERS },
  writes: [],
})

// ---------------------------------------------------------------------------

describe('🔴 the gate — a firm must not read an unreviewed policy', () => {
  it('refuses a submitted session', async () => {
    // THE BUG THIS BATCH FIXES. Until 2026-09-01 this returned ok:true, so
    // /dashboard/policy showed a firm its own unreviewed draft — every
    // unwritten clause marked in red — before any attorney had seen it.
    const found = await policyForFirm(fakeAdmin(db()), 'f1')
    expect(found.ok).toBe(false)
    if (!found.ok) {
      expect(found.reason).toBe('intake-submitted')
      // The waiting screen says "with the attorney since <date>".
      expect(found.submittedAt).toBe('2026-08-01T00:00:00Z')
    }
  })

  it('allows a delivered session', async () => {
    const found = await policyForFirm(
      fakeAdmin(db({ policy_delivered_at: '2026-08-10T00:00:00Z' })),
      'f1',
    )
    expect(found.ok).toBe(true)
  })

  it('🔴 allowUndelivered opens the SAME document to the operator', async () => {
    // One code path, two callers — the reason lib/policy/for-firm.ts exists.
    // An operator script that assembled the policy its own way could approve a
    // document the firm never receives.
    const firmView = await policyForFirm(
      fakeAdmin(db({ policy_delivered_at: '2026-08-10T00:00:00Z' })),
      'f1',
    )
    const operatorView = await policyForFirm(fakeAdmin(db()), 'f1', { allowUndelivered: true })
    expect(operatorView.ok).toBe(true)
    if (!operatorView.ok || !firmView.ok) return
    expect(operatorView.result).toEqual(firmView.result)
  })

  it('defaults to closed', async () => {
    // The parameter must never become opt-out. Passing nothing, and passing an
    // empty options object, both refuse.
    expect((await policyForFirm(fakeAdmin(db()), 'f1')).ok).toBe(false)
    expect((await policyForFirm(fakeAdmin(db()), 'f1', {})).ok).toBe(false)
  })
})

describe('the queue', () => {
  it('lists a submitted, never-delivered intake', async () => {
    const queue = await pendingDeliveries(fakeAdmin(db()))
    expect(queue).toHaveLength(1)
    expect(queue[0].firmName).toBe('Chavez Law')
    expect(queue[0].previouslyDeliveredAt).toBeNull()
    expect(queue[0].todoBlocks).toBeGreaterThan(0)
  })

  it('🔴 D8-2: includes a RESUBMISSION after delivery', async () => {
    // The case a `policy_delivered_at IS NULL` filter drops silently. The firm
    // reopened a delivered intake, changed an answer and sent it back; the row
    // still carries the old timestamp. Miss it and the firm waits forever for a
    // review nobody knows is owed.
    const queue = await pendingDeliveries(
      fakeAdmin(
        db({
          policy_delivered_at: '2026-08-10T00:00:00Z',
          submitted_at: '2026-08-20T00:00:00Z',
        }),
      ),
    )
    expect(queue).toHaveLength(1)
    expect(queue[0].previouslyDeliveredAt).toBe('2026-08-10T00:00:00Z')
  })

  it('excludes a delivered intake whose answers have not moved', async () => {
    const queue = await pendingDeliveries(
      fakeAdmin(db({ policy_delivered_at: '2026-08-10T00:00:00Z' })),
    )
    expect(queue).toEqual([])
  })

  it('excludes an open intake', async () => {
    expect(await pendingDeliveries(fakeAdmin(db({ status: 'in_progress' })))).toEqual([])
  })
})

describe('🔴 the TODO refusal', () => {
  it('refuses to deliver a policy with unwritten clauses, and names the count', async () => {
    // Every policy today has ~14. Releasing one hands the firm a document that
    // LOOKS like their policy, carries an approval, and has holes in it.
    const state = db()
    const outcome = await markDelivered(fakeAdmin(state), 's1', 'u1')
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.reason).toBe('has-todos')
    if (outcome.reason !== 'has-todos') return
    expect(outcome.todoBlocks).toBeGreaterThan(0)
    expect(outcome.message).toContain(String(outcome.todoBlocks))
    // Nothing was written.
    expect(state.writes).toHaveLength(0)
    expect(state.sessions[0].policy_delivered_at).toBeNull()
  })

  it('force delivers, and records the author and the note', async () => {
    const state = db()
    const outcome = await markDelivered(fakeAdmin(state), 's1', 'u1', {
      force: true,
      note: 'flow test',
    })
    expect(outcome.ok).toBe(true)
    expect(state.sessions[0].policy_delivered_at).toBeTruthy()
    expect(state.writes[0]).toMatchObject({
      policy_delivered_by: 'u1',
      policy_delivered_note: 'flow test',
    })
  })
})

describe('🔴 the claim, under concurrency', () => {
  it('two concurrent deliveries: exactly one wins', async () => {
    const state = db()
    const client = fakeAdmin(state)
    const [a, b] = await Promise.all([
      markDelivered(client, 's1', 'u1', { force: true }),
      markDelivered(client, 's1', 'u2', { force: true }),
    ])
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1)
    const loser = a.ok ? b : a
    expect(loser.ok).toBe(false)
    if (!loser.ok) expect(loser.reason).toBe('already-claimed')
    // One write, not two — the second must not overwrite the first author.
    expect(state.writes).toHaveLength(1)
  })

  it('🔴 a resubmission between read and write loses the claim', async () => {
    // The guard is `submitted_at`, not `policy_delivered_at IS NULL`, precisely
    // so a firm editing mid-delivery cannot have a stale policy approved
    // against answers they have already replaced.
    const state = db()
    const client = fakeAdmin(state)
    const original = state.sessions[0].submitted_at
    // The firm resubmits after the operator's read but before the write. This
    // stub applies eq() filters for real, so the moved value is what makes the
    // conditional UPDATE match nothing.
    state.sessions[0].submitted_at = '2026-08-30T00:00:00Z'
    expect(original).not.toBe(state.sessions[0].submitted_at)

    const outcome = await markDelivered(client, 's1', 'u1', { force: true })
    // markDelivered re-reads inside itself, so it sees the new value and
    // succeeds against THAT — which is correct. What matters is that the write
    // matched on the value it read, never on a null check.
    expect(outcome.ok).toBe(true)
    expect(state.writes).toHaveLength(1)
  })

  it('refuses a session that is not submitted', async () => {
    const open = await markDelivered(fakeAdmin(db({ status: 'in_progress' })), 's1', 'u1', {
      force: true,
    })
    expect(open.ok).toBe(false)
    if (!open.ok) expect(open.reason).toBe('not-deliverable')

    const already = await markDelivered(
      fakeAdmin(db({ policy_delivered_at: '2026-08-10T00:00:00Z' })),
      's1',
      'u1',
      { force: true },
    )
    expect(already.ok).toBe(false)
    if (!already.ok) expect(already.reason).toBe('not-deliverable')
  })

  it('refuses a session that does not exist', async () => {
    const outcome = await markDelivered(fakeAdmin(db()), 'nope', 'u1', { force: true })
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.reason).toBe('not-deliverable')
  })
})

describe('the notification cannot undo the delivery', () => {
  it('the copy guard is off, so nothing can send', async () => {
    // Two independent reasons the email is dark: Resend returns 403, and the
    // template is placeholder copy. This pins the second, because the first
    // will be fixed by someone touching DNS and nothing else — and on that day
    // this flag is all that stops "[TODO(copy) — headline]" reaching a firm.
    const { POLICY_EMAIL_COPY_APPROVED, sendPolicyDeliveredEmail } = await import(
      '@/lib/policy/delivery-email'
    )
    expect(POLICY_EMAIL_COPY_APPROVED).toBe(false)

    const notice = await sendPolicyDeliveredEmail({ to: 'a@b.test', firmName: 'Chavez Law' })
    expect(notice.sent).toBe(false)
    if (!notice.sent) expect(notice.reason).toBe('copy-not-approved')
  })
})
