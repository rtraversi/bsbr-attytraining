import { describe, it, expect } from 'vitest'
import {
  isVisible,
  visibleQuestions,
  nextUnanswered,
  pruneOrphans,
  orphanKeys,
  progressBySection,
  isComplete,
  missingRequired,
  isAnswered,
  toolGridTools,
  reconcileToolGrid,
  splitBySensitivity,
  rosterTrainingSeats,
  rosterOverSeats,
  canAddTrainingSeat,
} from '@/lib/intake/branching'
import {
  QUESTIONS,
  getQuestion,
  assertQuestionSetInvariants,
  US_STATES,
  stateOptionsFor,
  NOTETAKER_NOT_PERMITTED,
  NONE_VALUE,
  NO_TOOLS_YET,
  EXCLUSIVE_OPTION_VALUES,
} from '@/lib/intake/questions'
import {
  otherValue,
  NOT_DECIDED_YET,
  type AnswerMap,
  type Question,
} from '@/lib/intake/types'

/**
 * The branching engine is pure, so this file drives the real code with no
 * database and no mocks. What it is actually protecting is Katy's export: every
 * failure mode below ends with a policy drafted from something the firm did not
 * say, and neither of them able to see where it came from.
 */

const q = (key: string): Question => {
  const found = getQuestion(key)
  if (!found) throw new Error(`test bug: no question "${key}"`)
  return found
}

const keys = (answers: AnswerMap) => visibleQuestions(answers).map((x) => x.key)

/** Every visible required question answered with something plausible for its type. */
function answerEverything(seed: AnswerMap = {}): AnswerMap {
  const answers: AnswerMap = { ...seed }

  // Iterate to a fixpoint: answering one question can reveal another.
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
            tier: 'team' as const,
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

// ---------------------------------------------------------------------------

describe('the question set itself', () => {
  it('satisfies its own invariants', () => {
    // Also runs at module load. Asserted here so a violation reads as a named
    // test failure rather than an import blowing up somewhere unrelated.
    expect(() => assertQuestionSetInvariants()).not.toThrow()
  })

  it('shares ONE state list between jurisdictions and hiring_states', () => {
    const jurisdictions = stateOptionsFor(q('jurisdictions'))
    const hiring = stateOptionsFor(q('hiring_states'))

    // 50 + DC + 5 territories.
    expect(US_STATES).toHaveLength(56)

    // Same states, different extras — the extras are the only difference.
    expect(jurisdictions.slice(0, US_STATES.length)).toEqual([...US_STATES])
    expect(hiring.slice(0, US_STATES.length)).toEqual([...US_STATES])
    expect(jurisdictions.at(-1)!.value).toBe('FEDERAL')
    expect(hiring.at(-1)!.value).toBe('OUTSIDE_US')
  })

  it('offers a none-style answer on every UNCONDITIONAL required multi-select', () => {
    // ai_tools was the exception until none_yet was added, and an unconditional
    // required multi-select with no way to say "nothing" is a dead end, not a
    // question.
    //
    // Scoped to unconditional ones deliberately. notetaker_scope is required,
    // has no escape, and is correct: it only appears once the firm has said
    // notetakers ARE permitted, so "nowhere" is not an available truth. A branch
    // that guarantees a non-empty answer is its own escape.
    const requiredMulti = QUESTIONS.filter((x) => x.type === 'multi' && x.required && !x.showIf)
    for (const question of requiredMulti) {
      const hasEscape =
        question.allowOther ||
        question.options!.some((o) => EXCLUSIVE_OPTION_VALUES.has(o.value))
      expect({ key: question.key, hasEscape }).toEqual({ key: question.key, hasEscape: true })
    }
    expect(
      getQuestion('ai_tools')!.options!.some((o) => o.value === NO_TOOLS_YET),
    ).toBe(true)
  })

  it('marks exactly the two sensitive questions, and neither of them branches', () => {
    const sensitive = QUESTIONS.filter((x) => x.sensitive)
    expect(sensitive.map((x) => x.key)).toEqual(['prior_ai_error', 'carrier_notified'])
    // The flag decides the destination table and nothing else.
    expect(sensitive.every((x) => x.required && !x.showIf)).toBe(true)
  })
})

describe('the sensitive questions are always visible', () => {
  it('shows both on an empty intake', () => {
    expect(keys({})).toContain('prior_ai_error')
    expect(keys({})).toContain('carrier_notified')
  })

  it('shows both on a fully answered intake, whatever the branches did', () => {
    const answers = answerEverything({ notetaker_stance: NOTETAKER_NOT_PERMITTED })
    expect(keys(answers)).toContain('prior_ai_error')
    expect(keys(answers)).toContain('carrier_notified')
  })

  it('routes them to intake_sensitive and nothing else there', () => {
    const answers = answerEverything()
    const { ordinary, sensitive } = splitBySensitivity(answers)

    expect(Object.keys(sensitive).sort()).toEqual(['carrier_notified', 'prior_ai_error'])
    expect(ordinary['prior_ai_error']).toBeUndefined()
    expect(ordinary['carrier_notified']).toBeUndefined()
    expect(ordinary['firm_name']).toBeDefined()
  })
})

describe('the tool grid', () => {
  it('is hidden when no tools are selected', () => {
    expect(isVisible(q('tool_grid'), {})).toBe(false)
    expect(isVisible(q('tool_grid'), { ai_tools: [] })).toBe(false)
  })

  it('appears once a tool is selected', () => {
    expect(isVisible(q('tool_grid'), { ai_tools: ['chatgpt'] })).toBe(true)
  })

  it('stays hidden when the firm has no tools YET', () => {
    // A firm that has just bought a policy because it is about to start. The
    // question is answered, so `answered: true` alone would show them an empty
    // required table they cannot fill in.
    const answers: AnswerMap = { ai_tools: [NO_TOOLS_YET] }
    expect(isAnswered(q('ai_tools'), answers)).toBe(true)
    expect(isVisible(q('tool_grid'), answers)).toBe(false)
    expect(toolGridTools(answers)).toEqual([])
  })

  it('lets a none-yet firm finish the intake', () => {
    const answers = answerEverything({ ai_tools: [NO_TOOLS_YET] })
    expect(keys(answers)).not.toContain('tool_grid')
    expect(isComplete(answers)).toBe(true)
  })

  it('never derives a row for "none yet", even alongside a real tool', () => {
    // The multi-select treats none_yet as exclusive so this should not arise;
    // the engine must not depend on the UI for it.
    expect(toolGridTools({ ai_tools: ['chatgpt', NO_TOOLS_YET] })).toEqual([
      { value: 'chatgpt', label: 'ChatGPT' },
    ])
  })

  it('derives a row per tool, free-text entries included', () => {
    const answers: AnswerMap = { ai_tools: ['chatgpt', otherValue('Perplexity')!] }
    expect(toolGridTools(answers)).toEqual([
      { value: 'chatgpt', label: 'ChatGPT' },
      { value: 'other:Perplexity', label: 'Perplexity' },
    ])
  })

  it('is not answered until every selected tool has both columns', () => {
    const answers: AnswerMap = {
      ai_tools: ['chatgpt', 'claude'],
      tool_grid: [{ tool: 'chatgpt', tier: 'team', noTraining: 'yes' }],
    }
    expect(isAnswered(q('tool_grid'), answers)).toBe(false)

    answers['tool_grid'] = [
      { tool: 'chatgpt', tier: 'team', noTraining: 'yes' },
      { tool: 'claude', tier: 'personal', noTraining: 'unknown' },
    ]
    expect(isAnswered(q('tool_grid'), answers)).toBe(true)
  })

  it('does not count a row whose tier is still blank', () => {
    const answers: AnswerMap = {
      ai_tools: ['chatgpt'],
      tool_grid: [{ tool: 'chatgpt', tier: null, noTraining: 'yes' }],
    }
    expect(isAnswered(q('tool_grid'), answers)).toBe(false)
  })

  it('drops the row for a tool the firm unticked', () => {
    const answers: AnswerMap = {
      ai_tools: ['chatgpt'],
      tool_grid: [
        { tool: 'chatgpt', tier: 'team', noTraining: 'yes' },
        { tool: 'otter_ai', tier: 'personal', noTraining: 'no' },
      ],
    }
    expect(reconcileToolGrid(answers).map((r) => r.tool)).toEqual(['chatgpt'])
    expect(pruneOrphans(answers)['tool_grid']).toEqual([
      { tool: 'chatgpt', tier: 'team', noTraining: 'yes' },
    ])
  })
})

describe('document review', () => {
  it('hides scale and TAR on a no', () => {
    const answers: AnswerMap = { doc_review: 'no' }
    expect(isVisible(q('doc_review_scale'), answers)).toBe(false)
    expect(isVisible(q('tar'), answers)).toBe(false)
  })

  it('hides both while doc_review is unanswered', () => {
    expect(isVisible(q('doc_review_scale'), {})).toBe(false)
    expect(isVisible(q('tar'), {})).toBe(false)
  })

  it('shows both on a yes', () => {
    const answers: AnswerMap = { doc_review: 'yes' }
    expect(isVisible(q('doc_review_scale'), answers)).toBe(true)
    expect(isVisible(q('tar'), answers)).toBe(true)
  })
})

describe('notetakers', () => {
  it('hides scope and tools when notetakers are not permitted', () => {
    const answers: AnswerMap = { notetaker_stance: NOTETAKER_NOT_PERMITTED }
    expect(isVisible(q('notetaker_scope'), answers)).toBe(false)
    expect(isVisible(q('notetaker_tools'), answers)).toBe(false)
  })

  it('hides both while the stance is unanswered — `not` must not pass vacuously', () => {
    expect(isVisible(q('notetaker_scope'), {})).toBe(false)
    expect(isVisible(q('notetaker_tools'), {})).toBe(false)
  })

  it('shows both under either permitting stance', () => {
    for (const stance of ['all_consent', 'state_law']) {
      const answers: AnswerMap = { notetaker_stance: stance }
      expect(isVisible(q('notetaker_scope'), answers)).toBe(true)
      expect(isVisible(q('notetaker_tools'), answers)).toBe(true)
    }
  })
})

describe('case management', () => {
  it('hides the AI-features question when the firm uses no platform', () => {
    expect(isVisible(q('case_mgmt_ai'), { case_mgmt: [NONE_VALUE] })).toBe(false)
  })

  it('hides it while case_mgmt is unanswered', () => {
    expect(isVisible(q('case_mgmt_ai'), {})).toBe(false)
    expect(isVisible(q('case_mgmt_ai'), { case_mgmt: [] })).toBe(false)
  })

  it('shows it for a real platform, including a free-text one', () => {
    expect(isVisible(q('case_mgmt_ai'), { case_mgmt: ['clio'] })).toBe(true)
    expect(isVisible(q('case_mgmt_ai'), { case_mgmt: [otherValue('In-house')!] })).toBe(true)
  })
})

describe('the existing-policy upload', () => {
  it('appears only on a yes, and never blocks submission', () => {
    expect(isVisible(q('existing_policy_file'), { existing_policy: 'no' })).toBe(false)
    expect(isVisible(q('existing_policy_file'), { existing_policy: 'yes' })).toBe(true)
    expect(q('existing_policy_file').required).toBe(false)
  })
})

describe('pruneOrphans', () => {
  it('drops the notetaker scope when the stance changes to not permitted', () => {
    // The exact sequence from the spec: answer the scope, then go back.
    const answered: AnswerMap = {
      notetaker_stance: 'state_law',
      notetaker_scope: ['client'],
      notetaker_tools: 'Otter.ai',
    }
    expect(orphanKeys(answered)).toEqual([])

    const retracted: AnswerMap = { ...answered, notetaker_stance: NOTETAKER_NOT_PERMITTED }
    expect(orphanKeys(retracted).sort()).toEqual(['notetaker_scope', 'notetaker_tools'])

    const pruned = pruneOrphans(retracted)
    expect(pruned['notetaker_scope']).toBeUndefined()
    expect(pruned['notetaker_tools']).toBeUndefined()
    // The stance itself survives — it is the answer that did the hiding.
    expect(pruned['notetaker_stance']).toBe(NOTETAKER_NOT_PERMITTED)
  })

  it('drops answers for keys belonging to no question at all', () => {
    const pruned = pruneOrphans({ firm_name: 'Byron LLP', practice_areas: ['family'] })
    expect(pruned['practice_areas']).toBeUndefined()
    expect(pruned['firm_name']).toBe('Byron LLP')
  })

  it('collapses a whole chain in one call', () => {
    const answers: AnswerMap = {
      doc_review: 'yes',
      doc_review_scale: 'ediscovery',
      tar: 'yes',
      ai_tools: ['chatgpt'],
      tool_grid: [{ tool: 'chatgpt', tier: 'team', noTraining: 'yes' }],
    }
    const pruned = pruneOrphans({ ...answers, doc_review: 'no', ai_tools: [] })

    expect(pruned['doc_review_scale']).toBeUndefined()
    expect(pruned['tar']).toBeUndefined()
    expect(pruned['tool_grid']).toBeUndefined()
  })

  it('does not mutate the map it is given', () => {
    const answers: AnswerMap = { doc_review: 'no', doc_review_scale: 'regular' }
    pruneOrphans(answers)
    expect(answers['doc_review_scale']).toBe('regular')
  })
})

describe('isComplete', () => {
  it('is false on an empty intake', () => {
    expect(isComplete({})).toBe(false)
  })

  it('is true once every visible required question is answered', () => {
    expect(isComplete(answerEverything())).toBe(true)
  })

  it('a HIDDEN required question does not block submission', () => {
    // notetaker_scope and notetaker_tools are both required and both hidden by
    // this stance. doc_review_scale and tar likewise.
    const answers = answerEverything({
      notetaker_stance: NOTETAKER_NOT_PERMITTED,
      doc_review: 'no',
    })

    expect(keys(answers)).not.toContain('notetaker_scope')
    expect(keys(answers)).not.toContain('doc_review_scale')
    expect(QUESTIONS.filter((x) => x.required).map((x) => x.key)).toContain('notetaker_scope')
    expect(isComplete(answers)).toBe(true)
  })

  it('an unanswered OPTIONAL question does not block submission', () => {
    const answers = answerEverything()
    expect(answers['prohibited_tools']).toBeUndefined()
    expect(isComplete(answers)).toBe(true)
  })

  it('is false again when a branch reveals a new required question', () => {
    const answers = answerEverything({ doc_review: 'no' })
    expect(isComplete(answers)).toBe(true)

    const reopened: AnswerMap = { ...answers, doc_review: 'yes' }
    expect(isComplete(reopened)).toBe(false)
    expect(missingRequired(reopened).map((x) => x.key)).toEqual(['doc_review_scale', 'tar'])
  })

  it('is false when the roster has a row with no email', () => {
    const answers = answerEverything()
    answers['roster'] = [{ name: 'Ada Byron', email: '', isAttorney: true }]
    expect(isComplete(answers)).toBe(false)
  })

  it('accepts the not-decided sentinel as a real answer', () => {
    const answers = answerEverything()
    answers['discipline'] = NOT_DECIDED_YET
    expect(isAnswered(q('discipline'), answers)).toBe(true)
    expect(isComplete(answers)).toBe(true)
  })
})

describe('nextUnanswered', () => {
  it('is the first question on an empty intake', () => {
    expect(nextUnanswered({})?.key).toBe('firm_name')
  })

  it('walks past answered questions', () => {
    expect(nextUnanswered({ firm_name: 'Byron LLP' })?.key).toBe('roster')
  })

  it('never returns a hidden question', () => {
    const answers = answerEverything({ doc_review: 'no' })
    // Those two are required and unanswered — and hidden, so they are not the
    // resume point and must never become one.
    expect(answers['doc_review_scale']).toBeUndefined()
    expect(answers['tar']).toBeUndefined()
    expect(nextUnanswered(answers)?.key).not.toBe('doc_review_scale')
    expect(nextUnanswered(answers)?.key).not.toBe('tar')
  })

  it('DOES return an unanswered optional question — the documented wart', () => {
    // A firm that skipped prohibited_tools and carried on has an unanswered
    // question behind them, and this sends them back to it. That is why
    // intake_sessions.current_question is the authoritative resume point and
    // this function is only the fallback.
    const answers = answerEverything()
    expect(answers['prohibited_tools']).toBeUndefined()
    expect(nextUnanswered(answers)?.key).toBe('prohibited_tools')
  })

  it('is null once every visible question has an answer', () => {
    const answers = answerEverything()
    answers['prohibited_tools'] = 'none'
    expect(nextUnanswered(answers)).toBeNull()
  })
})

describe('progressBySection', () => {
  it('reports per section and never a single running total', () => {
    const progress = progressBySection({})
    expect(progress.map((p) => p.section)).toEqual([
      'firm', 'tools', 'systems', 'data', 'meetings', 'clients', 'staff', 'history',
    ])
    expect(progress.every((p) => p.answered === 0 && !p.complete)).toBe(true)
    // One word each, so the tab strip fits on one line.
    expect(progress.every((p) => !p.label.includes(' '))).toBe(true)
  })

  it('marks a section complete when its visible required questions are answered', () => {
    const answers: AnswerMap = {
      firm_name: 'Byron LLP',
      roster: [{ name: 'Ada Byron', email: 'ada@firm.com', isAttorney: true }],
      jurisdictions: ['NC', 'FEDERAL'],
      contract_attorneys: 'no',
      existing_policy: 'no',
    }
    const firm = progressBySection(answers).find((p) => p.section === 'firm')!
    expect(firm).toMatchObject({ total: 5, answered: 5, complete: true })
  })

  it('shrinks a section total when a branch hides one of its questions', () => {
    const open = progressBySection({ notetaker_stance: 'state_law' }).find((p) => p.section === 'meetings')!
    const shut = progressBySection({ notetaker_stance: NOTETAKER_NOT_PERMITTED }).find((p) => p.section === 'meetings')!

    expect(open.total).toBe(3)
    expect(shut.total).toBe(1)
    expect(shut.complete).toBe(true)
  })

  it('excludes optional questions from the count', () => {
    // Tools has four questions, one of which (prohibited_tools) is optional.
    const tools = progressBySection({ ai_tools: ['chatgpt'] }).find((p) => p.section === 'tools')!
    expect(tools.total).toBe(3)
  })

  it('is complete in every section exactly when the intake is complete', () => {
    const answers = answerEverything()
    expect(progressBySection(answers).every((p) => p.complete)).toBe(isComplete(answers))
  })
})

describe('the roster against the seats bought', () => {
  const roster = (attorneys: number, staff: number) => [
    ...Array.from({ length: attorneys }, (_, i) => ({
      name: `Attorney ${i}`, email: `a${i}@firm.com`, isAttorney: true,
    })),
    ...Array.from({ length: staff }, (_, i) => ({
      name: `Staff ${i}`, email: `s${i}@firm.com`, isAttorney: false,
    })),
  ]

  it('counts only the non-attorney rows as training seats', () => {
    // Attorneys never consume a seat and take the training for free.
    expect(rosterTrainingSeats(roster(3, 2))).toBe(2)
    expect(rosterTrainingSeats(roster(4, 0))).toBe(0)
  })

  it('caps non-attorneys and leaves attorneys unlimited', () => {
    // Max reversed flag-never-block on 2026-08-26: nobody owned the "we will
    // sort the extra out with you afterwards" the old banner promised.
    // Twelve partners and one paralegal still costs one seat.
    expect(canAddTrainingSeat(roster(12, 0), 1)).toBe(true)
    expect(rosterOverSeats(roster(40, 1), 1)).toBe(0)
  })

  // ── the three states of a seat count ─────────────────────────────────────
  //
  // 🔴 KNOWN-AND-ZERO and UNKNOWN were the same value until 2026-08-27, and the
  // callers read that value as "no cap". So a seats row that had not landed —
  // or a read that failed — turned the cap off and let a firm roster unlimited
  // staff, submit, and promote past its seat count: precisely what the cap is
  // for. seatsPurchased() now answers null for unknown and a number otherwise,
  // and these three tests are what keep the two apart.

  it('KNOWN and under: allows the row and reports no shortfall', () => {
    expect(canAddTrainingSeat(roster(1, 4), 9)).toBe(true)
    expect(rosterOverSeats(roster(1, 4), 9)).toBe(0)
  })

  it('KNOWN and over: refuses the row and reports the shortfall', () => {
    expect(canAddTrainingSeat(roster(0, 9), 9)).toBe(false)
    expect(rosterOverSeats(roster(1, 12), 9)).toBe(3)
  })

  it('KNOWN and zero is a real cap of zero, not an absent one', () => {
    // A firm the seats table says bought nothing cannot roster staff who need
    // training. This is the case that used to be indistinguishable from unknown.
    expect(canAddTrainingSeat(roster(1, 0), 0)).toBe(false)
    expect(rosterOverSeats(roster(1, 3), 0)).toBe(3)
    // Attorneys still cost nothing, even against a cap of zero.
    expect(canAddTrainingSeat(roster(12, 0), 0)).toBe(false)
    expect(rosterOverSeats(roster(12, 0), 0)).toBe(0)
  })

  it('UNKNOWN stays permissive in the client — it must not produce a dead form', () => {
    // Nobody should be refused a row because a read was slow. The server is what
    // refuses on null; see the seats === null branch in POST /api/intake/submit.
    expect(canAddTrainingSeat(roster(0, 3), null)).toBe(true)
    expect(canAddTrainingSeat(roster(0, 300), null)).toBe(true)
  })

  it('UNKNOWN reports no shortfall — a firm is never told it is over a count we do not have', () => {
    expect(rosterOverSeats(roster(1, 12), null)).toBe(0)
  })

  it('lets a solo with no staff finish', () => {
    // Katy, 2026-08-25: a solo with zero staff pays for one seat and needs no
    // non-attorney training to be accredited.
    const answers = answerEverything({ roster: roster(1, 0) })
    expect(rosterOverSeats(roster(1, 0), 1)).toBe(0)
    expect(isComplete(answers)).toBe(true)
  })
})
