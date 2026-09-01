import { describe, it, expect } from 'vitest'
import {
  buildReview,
  formatAnswer,
  intakeStateOf,
  canReopen,
  isSensitiveKey,
  NEVER_SHOWN_TO_FIRM,
} from '@/lib/intake/review'
import { getQuestion, NOTETAKER_NOT_PERMITTED, NO_DRAFTING } from '@/lib/intake/questions'
import { missingRequired, reconcileToolGrid } from '@/lib/intake/branching'
import { otherValue, NOT_DECIDED_YET, type AnswerMap, type Question } from '@/lib/intake/types'

/**
 * Reading a submitted intake back to the firm that gave it.
 *
 * The one that matters is the sensitive exclusion. Everything else here is a
 * formatting bug; that one is a firm-facing screen showing two answers the
 * product promised were Katy's eyes only.
 */

const q = (key: string): Question => {
  const found = getQuestion(key)
  if (!found) throw new Error(`test bug: no question "${key}"`)
  return found
}

/** Every visible required question answered — the same helper shape as the branching suite. */
function answerEverything(seed: AnswerMap = {}): AnswerMap {
  const answers: AnswerMap = { ...seed }
  for (let pass = 0; pass < 10; pass += 1) {
    const missing = missingRequired(answers)
    if (missing.length === 0) break
    for (const question of missing) {
      if (answers[question.key] !== undefined) continue
      switch (question.type) {
        case 'text':
        case 'longtext':
          answers[question.key] = 'something'
          break
        case 'yesno':
          answers[question.key] = 'no'
          break
        case 'single':
          answers[question.key] = question.options![0].value
          break
        case 'multi':
          answers[question.key] = [question.options![0].value]
          break
        case 'states':
          answers[question.key] = ['NC']
          break
        case 'roster':
          answers[question.key] = [{ name: 'Ada Byron', email: 'ada@firm.com', isAttorney: true }]
          break
        case 'tool-grid':
          answers[question.key] = reconcileToolGrid(answers).map((r) => ({
            ...r,
            noTraining: 'yes' as const,
          }))
          break
        case 'upload':
          answers[question.key] = {
            storagePath: 'x/y.pdf',
            originalName: 'y.pdf',
            contentType: 'application/pdf',
            bytes: 10,
          }
          break
      }
    }
  }
  return answers
}

const allKeys = (answers: AnswerMap) =>
  buildReview(answers).flatMap((s) => s.items.map((i) => i.key))

// ---------------------------------------------------------------------------

describe('🔴 the sensitive answers never reach the firm', () => {
  it('omits both, even though loadAnswers hands them over', () => {
    // loadAnswers returns them deliberately — the firm typed them and must be
    // able to correct them while the intake is OPEN. This is the other side of
    // that rule, and it is what stands between "Katy's eyes only" and a
    // firm-facing screen printing a prior malpractice incident.
    const answers = answerEverything({
      prior_ai_error: 'yes',
      carrier_notified: 'no',
    })
    expect(answers['prior_ai_error']).toBe('yes')

    const keys = allKeys(answers)
    expect(keys).not.toContain('prior_ai_error')
    expect(keys).not.toContain('carrier_notified')
  })

  it('omits them by the FLAG, not by a hardcoded pair of keys', () => {
    // The list is derived from the question set, so marking a third question
    // sensitive is covered without anybody remembering to update this file.
    expect([...NEVER_SHOWN_TO_FIRM].sort()).toEqual(['carrier_notified', 'prior_ai_error'])
    for (const key of NEVER_SHOWN_TO_FIRM) {
      expect(isSensitiveKey(key)).toBe(true)
      expect(allKeys(answerEverything())).not.toContain(key)
    }
  })

  it('does not leak them through the History section either', () => {
    // Both sensitive questions are the whole of `history`, so that section must
    // not appear at all rather than appearing empty.
    const sections = buildReview(answerEverything()).map((s) => s.section)
    expect(sections).not.toContain('history')
  })
})

describe('what the firm sees', () => {
  it('shows the questions it was actually asked, not all fifty', () => {
    // A branch never entered is not a question they skipped, and listing it
    // would read as an omission they need to go and fix.
    const answers = answerEverything({
      drafting_uses: [NO_DRAFTING],
      notetaker_stance: NOTETAKER_NOT_PERMITTED,
      doc_review: 'no',
    })
    const keys = allKeys(answers)
    expect(keys).toContain('drafting_uses')
    expect(keys).not.toContain('drafting_client_data')
    expect(keys).not.toContain('notetaker_scope')
    expect(keys).not.toContain('doc_review_scale')
  })

  it('keeps an optional question that was skipped, marked as unanswered', () => {
    const answers = answerEverything()
    expect(answers['prohibited_tools']).toBeUndefined()
    const item = buildReview(answers)
      .flatMap((s) => s.items)
      .find((i) => i.key === 'prohibited_tools')
    expect(item).toBeDefined()
    expect(item!.answer).toBeNull()
  })

  it('groups into the same sections, in the same order, as the intake itself', () => {
    const sections = buildReview(answerEverything()).map((s) => s.section)
    // history is absent — see the sensitive tests above.
    expect(sections).toEqual([
      'firm', 'tools', 'systems', 'drafting', 'courts', 'data', 'records',
      'meetings', 'clients', 'marketing', 'staff',
    ])
    expect(new Set(sections).size).toBe(sections.length)
  })
})

describe('formatting an answer back', () => {
  it('renders LABELS, never the stored value', () => {
    // Values are stable ids so wording can change without touching stored
    // answers. Showing `templates_only` to a firm would be showing them our
    // database.
    const answers: AnswerMap = { drafting_uses: ['form'], drafting_client_data: 'templates_only' }
    expect(formatAnswer(q('drafting_client_data'), answers)).toBe(
      'Generic or template variables only',
    )
  })

  it('renders yes/no as words', () => {
    expect(formatAnswer(q('personal_devices'), { personal_devices: 'yes' })).toBe('Yes')
    expect(formatAnswer(q('personal_devices'), { personal_devices: 'no' })).toBe('No')
  })

  it('renders a multi-select as its labels', () => {
    expect(formatAnswer(q('regulatory_regimes'), { regulatory_regimes: ['hipaa', 'gdpr'] })).toBe(
      'HIPAA · GDPR',
    )
  })

  it('renders a state code as the state name', () => {
    expect(formatAnswer(q('jurisdictions'), { jurisdictions: ['NC', 'FEDERAL'] })).toBe(
      'North Carolina · Federal courts',
    )
  })

  it('renders a free-text `other:` entry as the firm typed it', () => {
    const answers: AnswerMap = { case_mgmt: [otherValue('In-house')!] }
    expect(formatAnswer(q('case_mgmt'), answers)).toBe('In-house')
  })

  it('renders the not-decided sentinel as words, never as the sentinel', () => {
    const answers: AnswerMap = { discipline: NOT_DECIDED_YET }
    expect(formatAnswer(q('discipline'), answers)).toBe('Not decided yet')
    expect(formatAnswer(q('discipline'), answers)).not.toContain('__')
  })

  it('renders the roster one person per line, with their status', () => {
    const answers: AnswerMap = {
      roster: [
        { name: 'Ada Byron', email: 'ada@firm.com', isAttorney: true },
        { name: 'Grace H', email: 'grace@firm.com', isAttorney: false },
      ],
    }
    expect(formatAnswer(q('roster'), answers)).toBe(
      'Ada Byron — ada@firm.com — Attorney\nGrace H — grace@firm.com — Staff',
    )
  })

  it('renders the tool grid with the tool NAME and the agreement in words', () => {
    const answers: AnswerMap = {
      ai_tools: ['chatgpt', otherValue('Perplexity')!],
      tool_grid: [
        { tool: 'chatgpt', noTraining: 'yes' },
        { tool: 'other:Perplexity', noTraining: 'unknown' },
      ],
    }
    expect(formatAnswer(q('tool_grid'), answers)).toBe(
      'ChatGPT — no-training agreement signed\nPerplexity — not known',
    )
  })

  it('renders an upload as the filename the firm recognises', () => {
    const answers: AnswerMap = {
      existing_policy: 'yes',
      existing_policy_file: {
        storagePath: 'firms/x/y.pdf',
        originalName: 'Our AI policy 2024.pdf',
        contentType: 'application/pdf',
        bytes: 100,
      },
    }
    expect(formatAnswer(q('existing_policy_file'), answers)).toBe('Our AI policy 2024.pdf')
  })

  it('answers null for a question that was asked and skipped', () => {
    expect(formatAnswer(q('prohibited_tools'), {})).toBeNull()
  })
})

describe('which screen a session gets', () => {
  const session = (over: Partial<Parameters<typeof intakeStateOf>[0] & object> = {}) => ({
    status: 'submitted',
    submitted_at: '2026-08-01T00:00:00Z',
    policy_delivered_at: null,
    ...over,
  })

  it('no session at all is editable — the firm has not started', () => {
    expect(intakeStateOf(null)).toBe('editable')
  })

  it('in_progress is editable', () => {
    expect(intakeStateOf(session({ status: 'in_progress' }))).toBe('editable')
  })

  it('submitted, undelivered', () => {
    expect(intakeStateOf(session())).toBe('submitted')
  })

  it('delivered', () => {
    expect(intakeStateOf(session({ policy_delivered_at: '2026-09-01T00:00:00Z' }))).toBe('delivered')
  })

  it('🔴 D8-2: BOTH read-only states can be reopened, delivery included', () => {
    // canReopen returned true for 'submitted' only until 2026-09-01, so
    // delivering a policy locked the intake forever. Katy: "they can update
    // their answers indefinitely to update the policy as they aquire more
    // information, or change their mind about free text items."
    expect(canReopen('submitted')).toBe(true)
    expect(canReopen('delivered')).toBe(true)
    // Not a bar — it is already open.
    expect(canReopen('editable')).toBe(false)
  })

  it('🔴 resubmitting after delivery reads as submitted, not delivered', () => {
    // The state D8-2 creates and nothing before it could. Reopen, edit, send
    // again: policy_delivered_at is still set while the answers behind it have
    // moved. Reading that as `delivered` would tell the firm their current
    // answers are the ones their document was written from, which is false.
    expect(
      intakeStateOf({
        status: 'submitted',
        policy_delivered_at: '2026-09-01T00:00:00Z',
        submitted_at: '2026-09-05T00:00:00Z',
      }),
    ).toBe('submitted')

    // And the ordinary case still reads as delivered: sent, then delivered.
    expect(
      intakeStateOf({
        status: 'submitted',
        policy_delivered_at: '2026-09-05T00:00:00Z',
        submitted_at: '2026-09-01T00:00:00Z',
      }),
    ).toBe('delivered')
  })

  it('🔴 a MISSING policy_delivered_at column reads as submitted, not editable', () => {
    // The dangerous shape: a caller that selects a narrow column list gets
    // `undefined`, which is falsy. SESSION_COLUMNS in session.ts is what
    // prevents it; this pins the blast radius if somebody writes their own
    // select anyway. Falling through to `submitted` is the harmless direction —
    // the screen is read-only either way and both offer a reopen now.
    const narrow = { status: 'submitted' } as unknown as Parameters<typeof intakeStateOf>[0]
    expect(intakeStateOf(narrow)).toBe('submitted')
  })
})
