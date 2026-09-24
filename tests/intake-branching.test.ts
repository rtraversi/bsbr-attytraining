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
  deriveFirmSize,
  withDerivedAnswers,
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

// ── Modules D, E, F, I, J, U and V were RETIRED from the intake ──────────────
//
// Their tests were removed on 2026-09-07 because the questions they exercised no
// longer exist. Katy's 2026-09-02 list does not ask them, and the clauses they
// used to gate are now unconditional — every firm receives that text, which is
// what she asked for. A test that asserts a deleted question is visible is not
// coverage, it is a false alarm that trains people to ignore the suite.
//
// The RETIREMENT itself is covered: see "the retired questions" below and
// RETIRED_KEYS in lib/intake/branching.ts.

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

    // Same states. hiring_states adds one extra; jurisdictions adds none.
    expect(jurisdictions.slice(0, US_STATES.length)).toEqual([...US_STATES])
    expect(hiring.slice(0, US_STATES.length)).toEqual([...US_STATES])

    // FEDERAL was removed from jurisdictions on 2026-09-04 (Max). §2 already
    // names "Federal Courts, Agencies and Circuits" unconditionally and the §2
    // slot excluded FEDERAL from the state list anyway, so offering it asked
    // for something the clause never used.
    //
    // ⚠️ The §2 `exclude` STAYS regardless: firms that answered before this
    // change still carry 'FEDERAL' in stored answers, and the clause must keep
    // dropping it. See policy-assemble's P2 tests, which pass it deliberately.
    expect(jurisdictions).toHaveLength(US_STATES.length)
    expect(jurisdictions.some((o) => o.value === 'FEDERAL')).toBe(false)

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

describe('the sensitive channel', () => {
  // 🔴 BOTH sensitive questions — prior_ai_error (module O) and carrier_notified
  // (module R) — were retired on 2026-09-02. They were the ONLY two carrying
  // `sensitive: true`, so the intake_sensitive channel currently routes nothing.
  //
  // Katy kept both on 2026-08-26 and then left them off her 2026-09-02 list. Her
  // list is the authority for what the intake asks, so they are gone, and no
  // clause reads either of them: §19 is unconditional and §8 never referenced
  // prior_ai_error.
  //
  // The MECHANISM is still here and still tested, because it is one flag away
  // from carrying an answer again and the split is what keeps a sensitive answer
  // out of intake_answers.
  it('asks no sensitive question today', () => {
    // They remain in QUESTIONS on purpose — retiring hides a question, it does
    // not delete its definition, so stored answers still resolve. What matters
    // is that none is VISIBLE.
    const visible = visibleQuestions(answerEverything())
    expect(visible.filter((question) => question.sensitive)).toEqual([])
    expect(QUESTIONS.some((question) => question.sensitive)).toBe(true)
  })

  it('splits cleanly when nothing is sensitive — everything is ordinary', () => {
    const answers = answerEverything()
    const { ordinary, sensitive } = splitBySensitivity(answers)

    expect(Object.keys(sensitive)).toEqual([])
    expect(ordinary['firm_name']).toBeDefined()
    expect(Object.keys(ordinary).length).toBe(Object.keys(answers).length)
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
    // It still finishes — but since 2026-09-04 it DOES see the grid, because a
    // firm with no AI tools yet still has a case management platform and an
    // interoffice comms platform, and §6 makes claims about both. What it does
    // not get is a row it cannot answer.
    const answers = answerEverything({ ai_tools: [NO_TOOLS_YET] })
    expect(isComplete(answers)).toBe(true)
    expect(keys(answers)).toContain('tool_grid')
    expect(toolGridTools(answers).map((t) => t.value)).not.toContain(NO_TOOLS_YET)
  })

  it('is hidden only when EVERY source says nothing', () => {
    // Each source's own sentinel, all three at once. This is the state that has
    // no row to show, and it is the only one.
    const nothing: AnswerMap = {
      ai_tools: [NO_TOOLS_YET],
      case_mgmt: [NONE_VALUE],
    }
    expect(toolGridTools(nothing)).toEqual([])
    expect(isVisible(q('tool_grid'), nothing)).toBe(false)
  })

  it('derives rows from the case management and comms answers too', () => {
    // The hole this closed: §6 tells the firm to make sure Clio is
    // contractually bound not to train on client data, and the intake never
    // asked whether it is. One grid, in source order — ai_tools, case_mgmt,
    // comms_platforms.
    const answers: AnswerMap = {
      ai_tools: ['chatgpt'],
      case_mgmt: ['clio'],
      comms_platforms: ['slack'],
    }
    expect(toolGridTools(answers)).toEqual([
      { value: 'chatgpt', label: 'ChatGPT' },
      { value: 'clio', label: 'Clio' },
      { value: 'slack', label: 'Slack' },
    ])
  })

  it('gives a row to a firm whose only platform answer is email', () => {
    // comms_platforms has no "none" option, so `email_only` is a REAL answer
    // and not a sentinel: that firm still has a mail provider which is either
    // bound or not. It is also why every firm that finishes the intake has at
    // least one grid row.
    const answers: AnswerMap = { comms_platforms: ['email_only'] }
    expect(toolGridTools(answers)).toEqual([{ value: 'email_only', label: 'Email only' }])
    expect(isVisible(q('tool_grid'), answers)).toBe(true)
  })

  it('shows the grid for a case-management platform even with no AI tools yet', () => {
    const answers: AnswerMap = { ai_tools: [NO_TOOLS_YET], case_mgmt: ['clio'] }
    expect(isVisible(q('tool_grid'), answers)).toBe(true)
    expect(toolGridTools(answers)).toEqual([{ value: 'clio', label: 'Clio' }])
  })

  it('is not answered until the PLATFORM rows are filled in too', () => {
    // Widening the sources widens what "answered" means. A grid covering only
    // the AI tools is the half-filled state, and it must not read as done.
    const answers: AnswerMap = {
      ai_tools: ['chatgpt'],
      case_mgmt: ['clio'],
      comms_platforms: ['email_only'],
      tool_grid: [{ tool: 'chatgpt', noTraining: 'yes' }],
    }
    expect(isAnswered(q('tool_grid'), answers)).toBe(false)

    answers['tool_grid'] = [
      { tool: 'chatgpt', noTraining: 'yes' },
      { tool: 'clio', noTraining: 'no' },
      { tool: 'email_only', noTraining: 'unknown' },
    ]
    expect(isAnswered(q('tool_grid'), answers)).toBe(true)
  })

  it('gives one row to a free-text answer typed on two source questions', () => {
    // Two rows carrying the same `tool` key would look independent on the
    // screen while reconcileToolGrid wrote one answer into both.
    const notion = otherValue('Notion')!
    const answers: AnswerMap = { case_mgmt: [notion], comms_platforms: [notion] }
    expect(toolGridTools(answers)).toEqual([{ value: notion, label: 'Notion' }])
  })

  it('drops a row when the platform that produced it is retracted', () => {
    // The same argument reconcileToolGrid already made for ai_tools. A firm
    // that names Clio, answers its row, then switches to "None" has retracted
    // the platform; a surviving row would put it back in the drafted policy.
    const answers: AnswerMap = {
      case_mgmt: [NONE_VALUE],
      comms_platforms: ['email_only'],
      tool_grid: [
        { tool: 'clio', noTraining: 'no' },
        { tool: 'email_only', noTraining: 'yes' },
      ],
    }
    expect(reconcileToolGrid(answers)).toEqual([{ tool: 'email_only', noTraining: 'yes' }])
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
    // firm_size was question two until 2026-09-24; it is derived from the
    // roster now, so the roster follows the firm name directly.
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
    // filing_courts was the second optional question until it was retired on
    // 2026-09-02. prohibited_tools is now the only one.
    expect(visibleQuestions(answers).filter((x) => !x.required).map((x) => x.key))
      .toEqual(['prohibited_tools'])
    expect(nextUnanswered(answers)).toBeNull()
  })
})

describe('progressBySection', () => {
  it('reports per section and never a single running total', () => {
    const progress = progressBySection({})
    // drafting, courts, records, marketing and history all went with the
    // 2026-09-02 retirement: every question they held was retired, so the
    // section has nothing to show and no tab.
    expect(progress.map((p) => p.section)).toEqual([
      'firm', 'tools', 'systems', 'data', 'meetings', 'clients', 'staff',
    ])
    expect(progress.every((p) => p.answered === 0 && !p.complete)).toBe(true)
    // One word each, so the tab strip fits on one line.
    expect(progress.every((p) => !p.label.includes(' '))).toBe(true)
  })

  it('marks a section complete when its visible required questions are answered', () => {
    const answers: AnswerMap = {
      firm_name: 'Byron LLP',
      roster: [{ name: 'Ada Byron', email: 'ada@firm.com', isAttorney: true }],
      jurisdictions: ['NC'],
      contract_attorneys: 'no',
      existing_policy: 'no',
    }
    const firm = progressBySection(answers).find((p) => p.section === 'firm')!
    // 5, not 6: firm_size stopped being asked on 2026-09-24 (derived from roster).
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
    // Tools has three questions since tool_grid moved to `data` on 2026-09-04,
    // one of which (prohibited_tools) is optional.
    const tools = progressBySection({ ai_tools: ['chatgpt'] }).find((p) => p.section === 'tools')!
    expect(tools.total).toBe(2)
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

  // ── Two tests removed here on 2026-09-07 ─────────────────────────────────
  //
  // "reopens submission the moment a gate is flipped back on" and "costs a
  // skipping firm ten questions and a full firm twenty-one" were both built
  // entirely out of retired keys — retain_prompts, ai_marketing, the drafting
  // chain, the court chain. Every gate they flipped is gone, so they asserted
  // nothing about the intake a firm now walks.
  //
  // The behaviour they covered — a gate turning back on reopens submission — is
  // still covered by the module tests above that use LIVE gates.
})

describe('firm_size, derived from the roster (2026-09-24)', () => {
  const row = (isAttorney: boolean, i: number) => ({ name: `P${i}`, email: `p${i}@firm.com`, isAttorney })
  const roster = (attorneys: number, staff = 0) => [
    ...Array.from({ length: attorneys }, (_, i) => row(true, i)),
    ...Array.from({ length: staff }, (_, i) => row(false, 100 + i)),
  ]

  it('is never asked', () => {
    expect(visibleQuestions({}).map((x) => x.key)).not.toContain('firm_size')
    expect(visibleQuestions(answerEverything()).map((x) => x.key)).not.toContain('firm_size')
  })

  it('counts attorney rows only, onto the existing option values', () => {
    expect(deriveFirmSize({ roster: roster(0, 4) })).toBe('solo')
    expect(deriveFirmSize({ roster: roster(1, 9) })).toBe('solo')
    expect(deriveFirmSize({ roster: roster(2) })).toBe('2_5')
    expect(deriveFirmSize({ roster: roster(5, 3) })).toBe('2_5')
    expect(deriveFirmSize({ roster: roster(6) })).toBe('6_20')
    expect(deriveFirmSize({ roster: roster(20) })).toBe('6_20')
    expect(deriveFirmSize({ roster: roster(21) })).toBe('20_plus')
    // Every derived value is a real option, so a slot resolves its label.
    const values = (getQuestion('firm_size')?.options ?? []).map((o) => o.value)
    for (const n of [0, 2, 6, 21]) expect(values).toContain(deriveFirmSize({ roster: roster(n) }))
  })

  it('is null with no roster, and leaves the answers alone', () => {
    expect(deriveFirmSize({})).toBeNull()
    const answers: AnswerMap = { firm_size: '6_20' }
    expect(withDerivedAnswers(answers)).toBe(answers)
  })

  it('overrides a stored answer from before the question was dropped', () => {
    const answers: AnswerMap = { firm_size: '20_plus', roster: roster(3) }
    expect(withDerivedAnswers(answers)['firm_size']).toBe('2_5')
    // Pure: the input is not mutated.
    expect(answers['firm_size']).toBe('20_plus')
  })
})
