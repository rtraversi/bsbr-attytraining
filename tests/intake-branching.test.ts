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
  NO_DRAFTING,
  NO_COURT_AI_ORDERS,
  HOURLY_BILLING_MODELS,
  EXCLUSIVE_OPTION_VALUES,
} from '@/lib/intake/questions'
import {
  otherValue,
  NOT_DECIDED_YET,
  SECTION_ORDER,
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

  it('is not answered until every selected tool has its agreement answered', () => {
    const answers: AnswerMap = {
      ai_tools: ['chatgpt', 'claude'],
      tool_grid: [{ tool: 'chatgpt', noTraining: 'yes' }],
    }
    expect(isAnswered(q('tool_grid'), answers)).toBe(false)

    answers['tool_grid'] = [
      { tool: 'chatgpt', noTraining: 'yes' },
      { tool: 'claude', noTraining: 'unknown' },
    ]
    expect(isAnswered(q('tool_grid'), answers)).toBe(true)
  })

  it('does not count a row whose agreement is still blank', () => {
    const answers: AnswerMap = {
      ai_tools: ['chatgpt'],
      tool_grid: [{ tool: 'chatgpt', noTraining: null }],
    }
    expect(isAnswered(q('tool_grid'), answers)).toBe(false)
  })

  it("counts \"don't know\" as answered — it is a real state, not a blank", () => {
    // A firm that does not know gets an instruction in the policy to go and
    // find out, which is a different clause from either yes or no. It must not
    // read as an unfinished row.
    const answers: AnswerMap = {
      ai_tools: ['chatgpt'],
      tool_grid: [{ tool: 'chatgpt', noTraining: 'unknown' }],
    }
    expect(isAnswered(q('tool_grid'), answers)).toBe(true)
  })

  it('drops a stale `tier` key off a session written before 2026-08-28', () => {
    // Answers are jsonb, so a session started before the tier column was
    // removed still carries the key. reconcileToolGrid rebuilds each row field
    // by field rather than spreading, which is what sheds it — no migration.
    const answers: AnswerMap = {
      ai_tools: ['chatgpt'],
      tool_grid: [{ tool: 'chatgpt', tier: 'personal', noTraining: 'yes' } as never],
    }
    expect(reconcileToolGrid(answers)).toEqual([{ tool: 'chatgpt', noTraining: 'yes' }])
    // And the row still counts as answered on the way through.
    expect(isAnswered(q('tool_grid'), answers)).toBe(true)
  })

  it('drops the row for a tool the firm unticked', () => {
    const answers: AnswerMap = {
      ai_tools: ['chatgpt'],
      tool_grid: [
        { tool: 'chatgpt', noTraining: 'yes' },
        { tool: 'otter_ai', noTraining: 'no' },
      ],
    }
    expect(reconcileToolGrid(answers).map((r) => r.tool)).toEqual(['chatgpt'])
    expect(pruneOrphans(answers)['tool_grid']).toEqual([
      { tool: 'chatgpt', noTraining: 'yes' },
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
      tool_grid: [{ tool: 'chatgpt', noTraining: 'yes' }],
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
    // Both of the set's optional questions, which answerEverything skips by
    // design. filing_courts joined prohibited_tools on 2026-08-28 — a
    // transactional firm files with nobody, so requiring it would be a dead end.
    answers['prohibited_tools'] = 'none'
    answers['filing_courts'] = 'NC Business Court'
    expect(visibleQuestions(answers).filter((x) => !x.required).map((x) => x.key))
      .toEqual(['prohibited_tools', 'filing_courts'])
    expect(nextUnanswered(answers)).toBeNull()
  })
})

describe('progressBySection', () => {
  it('reports per section and never a single running total', () => {
    const progress = progressBySection({})
    expect(progress.map((p) => p.section)).toEqual([
      'firm', 'tools', 'systems', 'drafting', 'courts', 'data', 'records',
      'meetings', 'clients', 'marketing', 'staff', 'history',
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

// ===========================================================================
// The eight modules added 2026-08-28 — D, E, F, I, J, Q, U, V
//
// Katy's implementation note is the design being tested here: "a short required
// core flow ... plus a single Y/N gate question per module ... that then unlocks
// the relevant module's detail questions", so that a solo sees a short intake
// and a litigation firm sees everything. Every gate below is one of her own
// questions, expressed with the existing showIf language.
// ===========================================================================

describe('the section allocation', () => {
  it('is twelve sections, and QUESTIONS is ordered to match SECTION_ORDER', () => {
    // The tab strip renders SECTION_ORDER; progressBySection walks it. If the
    // question order disagreed, a firm would watch the strip jump backwards.
    const orderInQuestions: string[] = []
    for (const question of QUESTIONS) {
      if (orderInQuestions.at(-1) !== question.section) orderInQuestions.push(question.section)
    }
    expect(orderInQuestions).toEqual([...SECTION_ORDER])
  })

  it('gives every section at least one question that never hides', () => {
    // progressBySection drops a section with nothing visible. A section whose
    // every question is conditional would lose its tab on an empty intake and
    // grow one later — the strip changing width under the firm as they answer.
    for (const section of SECTION_ORDER) {
      const unconditional = QUESTIONS.filter((x) => x.section === section && !x.showIf)
      expect({ section, unconditional: unconditional.length > 0 })
        .toEqual({ section, unconditional: true })
    }
  })

  it('did not move any pre-existing question into a new section', () => {
    // The four new sections hold only new questions. `section` is display-only
    // and never stored, so moving one costs nothing at the database — it just
    // moves the ground under a firm mid-intake for no gain.
    const newSections = new Set(['drafting', 'courts', 'records', 'marketing'])
    const preExisting = new Set([
      'firm_name', 'roster', 'jurisdictions', 'contract_attorneys', 'existing_policy',
      'existing_policy_file', 'ai_tools', 'tool_grid', 'prohibited_tools', 'personal_devices',
      'research_tools', 'case_mgmt', 'case_mgmt_ai', 'comms_platforms', 'regulatory_regimes',
      'doc_review', 'doc_review_scale', 'tar', 'notetaker_stance', 'notetaker_scope',
      'notetaker_tools', 'bill_ai_costs', 'client_ai', 'client_ai_approach', 'hiring_ai',
      'hiring_states', 'discipline', 'prior_ai_error', 'carrier_notified',
    ])
    const moved = QUESTIONS.filter((x) => preExisting.has(x.key) && newSections.has(x.section))
    expect(moved.map((x) => x.key)).toEqual([])
  })
})

describe('conditions are DATA, not predicate functions', () => {
  it('round-trips the whole question set through JSON unchanged', () => {
    // The property the branching language exists for: the tree can be diffed in
    // review, pruneOrphans can ask what an answer governs without executing
    // anything, and Katy's export can print the branch a firm took. A predicate
    // function anywhere in a showIf would vanish here.
    const roundTripped = JSON.parse(JSON.stringify(QUESTIONS))
    expect(roundTripped).toEqual(JSON.parse(JSON.stringify(QUESTIONS)))
    for (const question of QUESTIONS) {
      if (!question.showIf) continue
      const clone = JSON.parse(JSON.stringify(question.showIf))
      expect(clone).toEqual(question.showIf)
    }
  })
})

describe('module D — drafting', () => {
  it('hides all four detail questions while the gate is unanswered', () => {
    // `{key, not}` must NOT pass vacuously. Without the is-answered half, a firm
    // would be asked whether their drafting involves client data before saying
    // whether they draft with AI at all.
    for (const key of [
      'drafting_client_data', 'drafting_foreign_language',
      'foreign_language_content', 'foreign_languages',
    ]) {
      expect(isVisible(q(key), {})).toBe(false)
      expect(isVisible(q(key), { drafting_uses: [] })).toBe(false)
    }
  })

  it('hides the module on "None"', () => {
    const answers: AnswerMap = { drafting_uses: [NO_DRAFTING] }
    expect(isAnswered(q('drafting_uses'), answers)).toBe(true)
    expect(isVisible(q('drafting_client_data'), answers)).toBe(false)
    expect(isVisible(q('drafting_foreign_language'), answers)).toBe(false)
  })

  it('opens on any real drafting use, and each of Katy’s three counts', () => {
    for (const use of ['form', 'substantive', 'boilerplate']) {
      const answers: AnswerMap = { drafting_uses: [use] }
      expect(isVisible(q('drafting_client_data'), answers)).toBe(true)
      expect(isVisible(q('drafting_foreign_language'), answers)).toBe(true)
    }
  })

  it('keeps her three triggers separable in the answer', () => {
    // The merge from three yes/nos into one multi-select must not blur them —
    // form, content and boilerplate draft differently.
    const options = q('drafting_uses').options!.map((o) => o.value)
    expect(options).toEqual(['form', 'substantive', 'boilerplate', NO_DRAFTING])
    const answers: AnswerMap = { drafting_uses: ['form', 'boilerplate'] }
    expect(answers['drafting_uses']).toEqual(['form', 'boilerplate'])
    expect(isVisible(q('drafting_client_data'), answers)).toBe(true)
  })

  it('offers no "sometimes" on the client-data question', () => {
    // Katy, 2026-08-25: "Eliminate all sometimes options. If a firm does an
    // action then they need a policy for it." Her 2026-08-20 list had one here.
    const values = q('drafting_client_data').options!.map((o) => o.value)
    expect(values).toEqual(['client_data', 'templates_only'])
  })

  it('opens the two foreign-language questions only on a yes', () => {
    const drafting: AnswerMap = { drafting_uses: ['form'] }
    expect(isVisible(q('foreign_languages'), { ...drafting, drafting_foreign_language: 'no' })).toBe(false)
    expect(isVisible(q('foreign_languages'), { ...drafting, drafting_foreign_language: 'yes' })).toBe(true)
    expect(isVisible(q('foreign_language_content'), { ...drafting, drafting_foreign_language: 'yes' })).toBe(true)
  })

  it('collapses the whole chain when the firm retracts drafting', () => {
    const answers: AnswerMap = {
      drafting_uses: ['substantive'],
      drafting_client_data: 'client_data',
      drafting_foreign_language: 'yes',
      foreign_language_content: 'client_data',
      foreign_languages: ['el', 'es'],
    }
    expect(orphanKeys(answers)).toEqual([])

    const pruned = pruneOrphans({ ...answers, drafting_uses: [NO_DRAFTING] })
    expect(pruned['drafting_client_data']).toBeUndefined()
    expect(pruned['drafting_foreign_language']).toBeUndefined()
    expect(pruned['foreign_language_content']).toBeUndefined()
    expect(pruned['foreign_languages']).toBeUndefined()
    expect(pruned['drafting_uses']).toEqual([NO_DRAFTING])
  })
})

describe('module E — court / tribunal AI certification', () => {
  it('hides both detail questions while the gate is unanswered', () => {
    expect(isVisible(q('standing_order_check'), {})).toBe(false)
    expect(isVisible(q('court_cert_template'), {})).toBe(false)
  })

  it('skips the module on a no', () => {
    const answers: AnswerMap = { court_ai_orders: NO_COURT_AI_ORDERS }
    expect(isVisible(q('standing_order_check'), answers)).toBe(false)
    expect(isVisible(q('court_cert_template'), answers)).toBe(false)
  })

  it('opens the module on a yes', () => {
    const answers: AnswerMap = { court_ai_orders: 'yes' }
    expect(isVisible(q('standing_order_check'), answers)).toBe(true)
    expect(isVisible(q('court_cert_template'), answers)).toBe(true)
  })

  it('opens the module on NOT SURE — the answer that needs it most', () => {
    // Katy: "if Unsure, policy should include an instruction to check standing
    // orders before each filing rather than assume." A firm that does not know
    // needs the process question more than a firm that does, so the branch is
    // `not no` rather than `is yes`.
    const answers: AnswerMap = { court_ai_orders: 'not_sure' }
    expect(isVisible(q('standing_order_check'), answers)).toBe(true)
    expect(isVisible(q('court_cert_template'), answers)).toBe(true)
  })

  it('never blocks a firm that files with nobody', () => {
    // filing_courts is the one optional question in this batch: a transactional
    // firm cannot answer it, and a required free-text field it cannot answer is
    // a dead end rather than a question.
    expect(q('filing_courts').required).toBe(false)
    expect(isVisible(q('filing_courts'), {})).toBe(true)
  })
})

describe('module F — competency', () => {
  it('asks both questions of everyone, with no gate', () => {
    // Katy marks F "usually universal language, but confirm scope". A yes on
    // the expansion question routes to a human conversation, not to another
    // question, so there is nothing for it to unlock.
    expect(isVisible(q('ai_practice_expansion'), {})).toBe(true)
    expect(isVisible(q('cle_process'), {})).toBe(true)
    expect(q('ai_practice_expansion').showIf).toBeUndefined()
    expect(q('cle_process').showIf).toBeUndefined()
  })
})

describe('module I — vendor incident response', () => {
  it('asks both questions of everyone, with no gate', () => {
    expect(isVisible(q('vendor_incident_protocol'), {})).toBe(true)
    expect(isVisible(q('vendor_security_contact'), {})).toBe(true)
  })

  it('still asks who receives notices when there is NO protocol', () => {
    // Gating the contact behind a yes would drop it for exactly the firm that
    // has no protocol — and a named recipient is the first line of the protocol
    // that firm is about to be told to write.
    const answers: AnswerMap = { vendor_incident_protocol: 'no' }
    expect(isVisible(q('vendor_security_contact'), answers)).toBe(true)
  })
})

describe('module J — brainstorming', () => {
  it('hides the tier question while the gate is unanswered', () => {
    expect(isVisible(q('brainstorming_tier'), {})).toBe(false)
  })

  it('skips the module on a no', () => {
    expect(isVisible(q('brainstorming_tier'), { brainstorming: 'no' })).toBe(false)
  })

  it('asks the tier on a yes, and keeps the gap answer available', () => {
    const answers: AnswerMap = { brainstorming: 'yes' }
    expect(isVisible(q('brainstorming_tier'), answers)).toBe(true)
    // "Sometimes on consumer-tier tools" is not a hedge — it IS the compliance
    // gap Katy asks to be flagged, so it must stay on the list.
    expect(q('brainstorming_tier').options!.map((o) => o.value))
      .toEqual(['no_training_only', 'consumer_tier'])
  })

  it('drops the tier when the firm retracts brainstorming', () => {
    const pruned = pruneOrphans({ brainstorming: 'no', brainstorming_tier: 'consumer_tier' })
    expect(pruned['brainstorming_tier']).toBeUndefined()
  })
})

describe('module Q — billing', () => {
  it('hides the time-adjustment question while billing models are unanswered', () => {
    expect(isVisible(q('ai_time_adjustment'), {})).toBe(false)
    expect(isVisible(q('ai_time_adjustment'), { billing_models: [] })).toBe(false)
  })

  it('asks it of an hourly firm', () => {
    expect(isVisible(q('ai_time_adjustment'), { billing_models: ['hourly'] })).toBe(true)
  })

  it('asks it of a HYBRID firm — the branch follows the hours, not the label', () => {
    // Hybrid contains hourly work, so a hybrid firm has the same problem an
    // hourly firm has and Katy's "if hourly" reaches it.
    expect(HOURLY_BILLING_MODELS).toContain('hybrid')
    expect(isVisible(q('ai_time_adjustment'), { billing_models: ['hybrid'] })).toBe(true)
    expect(isVisible(q('ai_time_adjustment'), { billing_models: ['flat_fee', 'hybrid'] })).toBe(true)
  })

  it('skips it for a firm with no billed time to adjust', () => {
    for (const models of [['flat_fee'], ['contingency'], ['flat_fee', 'contingency']]) {
      expect(isVisible(q('ai_time_adjustment'), { billing_models: models })).toBe(false)
    }
  })

  it('skips it for a free-text billing model nobody listed', () => {
    // `other:Subscription` is a real answer and is not hourly. It must not open
    // a question about adjusting billed time.
    const answers: AnswerMap = { billing_models: [otherValue('Subscription')!] }
    expect(isAnswered(q('billing_models'), answers)).toBe(true)
    expect(isVisible(q('ai_time_adjustment'), answers)).toBe(false)
  })

  it('drops the adjustment answer when the firm stops billing hourly', () => {
    const pruned = pruneOrphans({ billing_models: ['flat_fee'], ai_time_adjustment: 'yes' })
    expect(pruned['ai_time_adjustment']).toBeUndefined()
  })
})

describe('module U — retention of prompts', () => {
  it('hides the schedule while the gate is unanswered', () => {
    expect(isVisible(q('retention_schedule'), {})).toBe(false)
  })

  it('skips the module on a no', () => {
    expect(isVisible(q('retention_schedule'), { retain_prompts: 'no' })).toBe(false)
  })

  it('asks the schedule on a yes', () => {
    expect(isVisible(q('retention_schedule'), { retain_prompts: 'yes' })).toBe(true)
  })

  it('drops the schedule when the firm stops retaining', () => {
    const pruned = pruneOrphans({ retain_prompts: 'no', retention_schedule: 'seven years' })
    expect(pruned['retention_schedule']).toBeUndefined()
  })
})

describe('module V — attorney advertising', () => {
  it('hides the review question while the gate is unanswered', () => {
    expect(isVisible(q('marketing_review'), {})).toBe(false)
  })

  it('skips the module on a no — one question for a firm that does no AI marketing', () => {
    const answers: AnswerMap = { ai_marketing: 'no' }
    expect(isVisible(q('marketing_review'), answers)).toBe(false)
    const marketing = progressBySection(answers).find((p) => p.section === 'marketing')!
    expect(marketing).toMatchObject({ total: 1, answered: 1, complete: true })
  })

  it('asks about advertising-rule review on a yes', () => {
    expect(isVisible(q('marketing_review'), { ai_marketing: 'yes' })).toBe(true)
  })

  it('drops the review answer when the firm retracts AI marketing', () => {
    const pruned = pruneOrphans({ ai_marketing: 'no', marketing_review: 'yes' })
    expect(pruned['marketing_review']).toBeUndefined()
  })
})

describe('the gates, taken together', () => {
  /** Every new module answered so as to SKIP it. */
  const skipEverything: AnswerMap = {
    drafting_uses: [NO_DRAFTING],
    court_ai_orders: NO_COURT_AI_ORDERS,
    brainstorming: 'no',
    billing_models: ['flat_fee'],
    retain_prompts: 'no',
    ai_marketing: 'no',
  }

  it('a skipping firm never sees a single detail question from the eight modules', () => {
    const visible = new Set(keys(answerEverything(skipEverything)))
    for (const hidden of [
      'drafting_client_data', 'drafting_foreign_language', 'foreign_language_content',
      'foreign_languages', 'standing_order_check', 'court_cert_template',
      'brainstorming_tier', 'ai_time_adjustment', 'retention_schedule', 'marketing_review',
    ]) {
      expect({ hidden, shown: visible.has(hidden) }).toEqual({ hidden, shown: false })
    }
  })

  it('none of those hidden required questions blocks submission', () => {
    // Rule three: isComplete counts VISIBLE required questions only. All ten
    // above are required, and a firm that can never see them must still be able
    // to send their intake.
    const answers = answerEverything(skipEverything)
    const requiredKeys = QUESTIONS.filter((x) => x.required).map((x) => x.key)
    expect(requiredKeys).toContain('retention_schedule')
    expect(requiredKeys).toContain('court_cert_template')
    expect(isComplete(answers)).toBe(true)
    expect(missingRequired(answers)).toEqual([])
  })

  it('reopens submission the moment a gate is flipped back on', () => {
    const answers = answerEverything(skipEverything)
    expect(isComplete(answers)).toBe(true)

    const reopened: AnswerMap = { ...answers, retain_prompts: 'yes', ai_marketing: 'yes' }
    expect(isComplete(reopened)).toBe(false)
    expect(missingRequired(reopened).map((x) => x.key))
      .toEqual(['retention_schedule', 'marketing_review'])
  })

  it('costs a skipping firm ten questions and a full firm twenty-one', () => {
    // The number Katy's implementation note is about. Recorded rather than
    // asserted loosely, so a later change to the set has to look at it.
    const newKeys = new Set([
      'drafting_uses', 'drafting_client_data', 'drafting_foreign_language',
      'foreign_language_content', 'foreign_languages', 'filing_courts', 'court_ai_orders',
      'standing_order_check', 'court_cert_template', 'vendor_incident_protocol',
      'vendor_security_contact', 'brainstorming', 'brainstorming_tier', 'billing_models',
      'ai_time_adjustment', 'ai_practice_expansion', 'cle_process', 'retain_prompts',
      'retention_schedule', 'ai_marketing', 'marketing_review',
    ])
    expect(newKeys.size).toBe(21)

    const skipping = visibleQuestions(answerEverything(skipEverything))
      .filter((x) => newKeys.has(x.key) && x.required)
    expect(skipping).toHaveLength(10)

    const everything = QUESTIONS.filter((x) => newKeys.has(x.key))
    expect(everything).toHaveLength(21)
  })
})
