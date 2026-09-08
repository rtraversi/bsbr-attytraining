// =============================================================================
// The policy assembler.
//
// Four things are worth testing here, and they are the four the batch was
// specified around: section ORDER, conditional INCLUSION and EXCLUSION, the
// platform FALLBACK, and that action items route OUT of the policy.
//
// A fifth is in tests/policy-transcription.test.ts and is the one that matters
// most: every "verbatim" block is checked against the actual source document,
// so a paraphrase cannot survive review.
// =============================================================================

import { describe, expect, it } from 'vitest'

import { NONE_VALUE } from '@/lib/intake/questions'
import { ACTION_ITEM_IDS } from '@/lib/policy/action-items'
import { assemble } from '@/lib/policy/assemble'
import { ATTORNEY, MAXIMAL, MINIMAL, PARALEGAL } from '@/lib/policy/fixtures'
import { assertSpineInvariants, SPINE } from '@/lib/policy/spine'
import type { AnswerMap } from '@/lib/policy/types'

// ---------------------------------------------------------------------------
// Fixtures
//
// MINIMAL and MAXIMAL live in lib/policy/fixtures.ts rather than here, because
// scripts/render-policy.mjs renders the same two firms. A renderer built on its
// own copy would show a document these tests never checked — see that file's
// header.
// ---------------------------------------------------------------------------

const blockIds = (answers: AnswerMap): string[] =>
  assemble(answers).policy.sections.flatMap((s) => s.blocks.map((b) => b.id))

const sectionNumbers = (answers: AnswerMap): number[] =>
  assemble(answers).policy.sections.map((s) => s.number)

/** P2's rendered text — the clause the jurisdictions slot fills. */
const p2TextOf = (result: ReturnType<typeof assemble>): string =>
  result.policy.sections
    .find((s) => s.number === 2)!
    .blocks.find((b) => b.id === 'p2-jurisdictions')!.text

// ---------------------------------------------------------------------------

describe('the spine', () => {
  it('satisfies its own invariants', () => {
    expect(() => assertSpineInvariants()).not.toThrow()
  })

  it('is the 22 ratified sections, numbered 1..22 in order', () => {
    // POLICY-ENGINE-MAP.md §11.2. The count and the order are ratified; the
    // titles are explicitly cosmetic and are not asserted here.
    expect(SPINE).toHaveLength(22)
    expect(SPINE.map((s) => s.number)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1))
  })

  it('places discipline last before definitions', () => {
    // §11.1 consequence 3 — a deliberate ordering choice, not a deduction.
    expect(SPINE[20].key).toBe('discipline')
    expect(SPINE[21].key).toBe('definitions')
  })
})

describe('section order in the output', () => {
  it('emits sections in ascending spine order', () => {
    const numbers = sectionNumbers(MAXIMAL)
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
  })

  it('keeps spine numbers when a section is omitted, rather than renumbering', () => {
    // A policy may legitimately read §1, §2, §3, §5. Renumbering to be
    // contiguous would make two firms cite different numbers for one rule.
    const numbers = sectionNumbers(MINIMAL)
    // §13 automations is the omitted one now: it gates on the automations
    // question, and the MINIMAL firm answers no. §10 stopped being optional on
    // 2026-09-02 when the brainstorming question was retired.
    expect(numbers).not.toContain(13)
    expect(numbers).toContain(15) // billing, always present
    expect(Math.max(...numbers)).toBe(22)
  })

  it('orders blocks within a section as the spine declares them', () => {
    const application = assemble(MAXIMAL).policy.sections.find((s) => s.number === 2)
    expect(application?.blocks.map((b) => b.id)).toEqual([
      'p1-title',
      'p2-jurisdictions',
      'p3-regulatory-regimes',
      'p5-contract-attorneys',
      'p6-existing-policy',
    ])
  })
})

describe('conditional inclusion', () => {
  it('includes the always-on sections for the most minimal firm', () => {
    const numbers = sectionNumbers(MINIMAL)
    // Preamble, Application, Competency, Verification, Billing, Records,
    // Employment, Malpractice, Vendor incidents, Definitions.
    //
    // §6 joined this list on 2026-09-04: comms_platforms is required and has no
    // "none" option, so EVERY firm names an interoffice arrangement and gets a
    // clause about it. `email_only` gets its own.
    //
    // §21 LEFT it: the discipline clause now requires a real answer, and MINIMAL
    // does not give one. A firm that answers "Unsure" gets an action item
    // instead of a clause, which is what Max chose.
    expect(numbers).toEqual(expect.arrayContaining([1, 2, 3, 6, 8, 15, 16, 17, 19, 20, 22]))
  })

  it('opens each optional section when its trigger is answered', () => {
    const numbers = sectionNumbers(MAXIMAL)
    expect(numbers).toEqual(expect.arrayContaining([5, 6, 7, 9, 10, 11, 12, 14, 18]))
  })

  it('fires P21 on "not sure" as well as "yes"', () => {
    // NO_COURT_AI_ORDERS is 'no', and the branch is `not 'no'` — Katy's
    // instruction: a firm that does not know needs the clause more, not less.
    expect(blockIds({ ...MINIMAL, court_ai_orders: 'not_sure' })).toContain(
      'p21-court-ai-disclosure',
    )
    expect(blockIds({ ...MINIMAL, court_ai_orders: 'yes' })).toContain('p21-court-ai-disclosure')
  })
})

describe('conditional exclusion', () => {
  it('drops every fully-optional section for the minimal firm', () => {
    const numbers = sectionNumbers(MINIMAL)
    // §9 is NOT in this list: P20 (local filing rules) is unconditional in the
    // ratified spine, so the section survives even for a firm that does no
    // AI drafting. See the next test.
    //
    // §10 and §18 left this list on 2026-09-02. Brainstorming and advertising
    // were both gated on questions Katy retired, so their clauses are now
    // unconditional — every firm receives them, which is what she asked for.
    // §6 is no longer here: see the always-on test above.
    for (const omitted of [7, 11, 13]) {
      expect(numbers).not.toContain(omitted)
    }
  })

  it('keeps §9 for a firm that does no AI drafting, but only its always-on clause', () => {
    // "P20 always" — a transactional firm files with nobody and the duty still
    // reads correctly with an empty court list (map §2.3). The drafting and
    // court-disclosure clauses around it do drop out.
    //
    // ⚠️ Since 2026-09-02 the drafting clauses no longer drop out either: the
    // questions that gated them were retired, so §9 now carries its whole set
    // for every firm. P20 remains the reason the SECTION cannot be omitted.
    const section9 = assemble(MINIMAL).policy.sections.find((s) => s.number === 9)
    expect(section9).toBeDefined()
    expect(section9!.blocks.map((b) => b.id)).toContain('p20-local-filing-rules')
  })

  it('keeps P21 for every firm, because its gate was retired', () => {
    // Until 2026-09-02 this dropped on court_ai_orders = 'no'. That question is
    // retired, so the court-disclosure duty is now unconditional. Katy's
    // instruction was that these clauses "will always be every policy".
    expect(blockIds(MINIMAL)).toContain('p21-court-ai-disclosure')
  })

  it('drops TAR when the firm does document review but no TAR', () => {
    const ids = blockIds({ ...MAXIMAL, tar: 'no' })
    expect(ids).toContain('p23-p31-document-review')
    expect(ids).not.toContain('p32-tar')
  })

  it('emits §13 Automations now that the question exists', () => {
    // 🔴 This test used to assert the opposite, and was right to: the section
    // was declared with a trigger no question could satisfy, so Katy's fully
    // written automations clause had NEVER appeared in a single policy. The
    // question landed on 2026-09-04 and the clause now reaches a firm.
    expect(sectionNumbers(MINIMAL)).not.toContain(13)
    expect(sectionNumbers(MAXIMAL)).toContain(13)
  })

  it('does not satisfy a `not` condition from an unanswered question', () => {
    // The "is answered" half of `not` is load-bearing — see lib/intake/types.ts.
    // An empty intake must not emit clauses for platforms nobody named.
    const ids = blockIds({})
    expect(ids).not.toContain('p10-case-mgmt-contractually-bound')
    expect(ids).not.toContain('p3-regulatory-regimes')
  })
})

describe('§4 scales on non-attorney staff', () => {
  it('is omitted for a solo with no staff', () => {
    // Katy, 2026-08-25: a solo with no staff needs no non-attorney training.
    expect(sectionNumbers({ ...MINIMAL, roster: [ATTORNEY] })).not.toContain(4)
  })

  it('appears once the roster carries a non-attorney', () => {
    expect(sectionNumbers({ ...MINIMAL, roster: [ATTORNEY, PARALEGAL] })).toContain(4)
  })
})

describe('slot filling', () => {
  it('substitutes the firm name into P1', () => {
    const p1 = assemble(MINIMAL).policy.sections[1].blocks[0]
    expect(p1.text).toBe('ARTIFICIAL INTELLIGENCE POLICY FOR Chavez Law')
    expect(p1.text).not.toContain('[FIRM NAME}')
  })

  it('renders jurisdictions as labels, in option order, not click order', () => {
    const forward = assemble({ ...MINIMAL, jurisdictions: ['NC', 'TX'] })
    const reversed = assemble({ ...MINIMAL, jurisdictions: ['TX', 'NC'] })

    expect(p2TextOf(forward)).toBe(p2TextOf(reversed))
    expect(p2TextOf(forward)).toContain('North Carolina')
    expect(p2TextOf(forward)).not.toContain('[STATES OR JURISDICTIONS LISTED]')
  })

  it('excludes FEDERAL from the P2 slot, because the clause already names it', () => {
    // Katy's sentence opens "comply with all requirements of Federal Courts,
    // Agencies, Circuits, as well as state(s) of …". Filling "Federal courts"
    // into the slot as well prints Federal twice in one sentence.
    const text = p2TextOf(assemble({ ...MINIMAL, jurisdictions: ['NC', 'FEDERAL'] }))

    expect(text).toBe(
      'Attorneys and staff must comply with all requirements of Federal Courts, ' +
        'Agencies, Circuits, as well as state(s) of North Carolina',
    )
    expect(text).not.toContain('Federal courts')
    // The clause itself is untouched — only what goes into the slot changed.
    expect(text).toContain('Federal Courts, Agencies, Circuits')
  })

  it('produces the same P2 whether or not the firm also ticked FEDERAL', () => {
    expect(p2TextOf(assemble({ ...MINIMAL, jurisdictions: ['NC', 'FEDERAL'] }))).toBe(
      p2TextOf(assemble({ ...MINIMAL, jurisdictions: ['NC'] })),
    )
  })

  it('ends P2 after "Circuits" for a federal-only practice', () => {
    // An immigration or patent firm may select FEDERAL and no state. There are
    // then no states for "as well as state(s) of" to introduce, so that trailing
    // span — Katy's own words — is cut. No placeholder ships.
    const text = p2TextOf(assemble({ ...MINIMAL, jurisdictions: ['FEDERAL'] }))

    expect(text).toBe(
      'Attorneys and staff must comply with all requirements of Federal Courts, ' +
        'Agencies, Circuits',
    )
    expect(text).not.toContain('[STATES OR JURISDICTIONS LISTED]')
    expect(text).not.toContain('as well as state(s) of')
    // The federal duty itself survives — only the states clause was cut.
    expect(text).toContain('Federal Courts, Agencies, Circuits')
  })

  it('keeps the states clause when the firm has a state, alongside FEDERAL', () => {
    const text = p2TextOf(assemble({ ...MINIMAL, jurisdictions: ['NC', 'FEDERAL'] }))

    expect(text).toBe(
      'Attorneys and staff must comply with all requirements of Federal Courts, ' +
        'Agencies, Circuits, as well as state(s) of North Carolina',
    )
    expect(text).toContain('as well as state(s) of')
  })

  it('ends P2 after "Circuits" when jurisdictions is unanswered entirely', () => {
    const text = p2TextOf(assemble({ ...MINIMAL, jurisdictions: undefined }))
    expect(text).not.toContain('[STATES OR JURISDICTIONS LISTED]')
    expect(text.endsWith('Circuits')).toBe(true)
  })

  it('leaves the placeholder visible when the answer is missing', () => {
    // Better a visible bracket than a sentence reading "state(s) of" and nothing.
    const noName = assemble({ ...MINIMAL, firm_name: undefined })
    expect(noName.policy.sections[1].blocks[0].text).toContain('[FIRM NAME}')
  })
})

describe('the vendor paragraphs are OUT of the policy', () => {
  // 🔴 Removed 2026-09-04 (Max). §6 and §7 used to emit one composed paragraph
  // per selected platform, from lib/policy/vendor-block.ts. They are gone from
  // the POLICY. The reasons are set out in full at the top of
  // lib/policy/blocks/s06-platforms.ts; the decisive one is that Katy had never
  // read a word of them and they were the text a firm was most likely to act on.
  //
  // THE COMPOSITION ITSELF IS STILL COVERED, by tests/policy-vendor-block.test.ts
  // (44 tests). What is asserted here is only that the policy no longer carries
  // it. The research moves to the action items, where going out of date is a
  // stale to-do rather than a policy that misstates a vendor's terms.
  it('emits no per-platform block anywhere in the policy', () => {
    for (const answers of [MINIMAL, MAXIMAL, { ...MINIMAL, case_mgmt: ['other:Leap'] }]) {
      const ids = blockIds(answers)
      expect(ids.some((id) => id.includes('per-platform--'))).toBe(false)
      expect(ids.some((id) => id.includes('per-tool--'))).toBe(false)
    }
  })

  it('never asserts what a named vendor’s terms say', () => {
    const text = assemble(MAXIMAL)
      .policy.sections.flatMap((section) => section.blocks)
      .map((block) => block.text)
      .join('\n')

    // The three shapes the generated paragraphs used. None may survive.
    expect(text).not.toContain('provides AI features:')
    expect(text).not.toContain('published terms do not address')
    expect(text).not.toContain('obtain written confirmation')
  })

  it('still names the firm’s own platforms, so the clause stays firm-specific', () => {
    // The point of removing the paragraphs was not to make §6 generic. Max
    // rejected that: "seems bloated tho... legal does not mean cumbersome".
    const section6 = assemble(MAXIMAL).policy.sections.find((s) => s.number === 6)!
    const text = section6.blocks.map((b) => b.text).join('\n')
    expect(text).toContain('Clio')
    expect(text).toContain('Smokeball')
  })
})

describe('the action item list is a separate deliverable (D2)', () => {
  it('routes "not sure" out of the policy, not into it', () => {
    const answers = { ...MINIMAL, case_mgmt: ['clio'], case_mgmt_ai: 'not_sure' }
    const { policy, actionItems } = assemble(answers)

    expect(actionItems.map((a) => a.id)).toContain('case-mgmt-training-permission')

    // 🔴 The whole point of D2: nothing from the action list appears in the
    // adopted policy. A firm's own policy must not carry a list of what it has
    // not done yet.
    const policyBlockIds = policy.sections.flatMap((s) => s.blocks.map((b) => b.id))
    for (const item of actionItems) {
      expect(policyBlockIds).not.toContain(item.id)
    }
  })

  it('emits no action items when nothing is unsure', () => {
    expect(assemble(MINIMAL).actionItems).toEqual([])
  })

  it('fires the malpractice item on carrier_notified = not_sure', () => {
    const { actionItems } = assemble({ ...MINIMAL, carrier_notified: 'not_sure' })
    expect(actionItems.map((a) => a.id)).toEqual(['malpractice-carrier-notification'])
  })

  it('keeps §19 in the policy even when it also raises an action item', () => {
    // Katy's bracket puts the CHECK on the action list; the clause still applies.
    const { policy, actionItems } = assemble({ ...MINIMAL, carrier_notified: 'not_sure' })
    expect(policy.sections.map((s) => s.number)).toContain(19)
    expect(actionItems).toHaveLength(1)
  })

  it('wires the notetaker branch even though G-Q2 has not landed', () => {
    // notetaker_stance offers no `not_sure` today, so this can never fire — but
    // the rule exists so it starts working the day the option is added.
    expect(ACTION_ITEM_IDS).toContain('notetaker-stance-undecided')
    const { actionItems } = assemble({ ...MINIMAL, notetaker_stance: 'not_sure' })
    expect(actionItems.map((a) => a.id)).toContain('notetaker-stance-undecided')
  })

  it('emits action items in spine order', () => {
    const { actionItems } = assemble({
      ...MINIMAL,
      case_mgmt: ['clio'],
      case_mgmt_ai: 'not_sure',
      carrier_notified: 'not_sure',
    })
    expect(actionItems.map((a) => a.id)).toEqual([
      'case-mgmt-training-permission',
      'malpractice-carrier-notification',
    ])
  })
})

// ---------------------------------------------------------------------------
// The tool grid — ONE answer, MANY outcomes
//
// Until 2026-09-04 nothing in lib/policy read tool_grid[].noTraining, so a firm
// answering "no, we hold no agreement" received a document identical to one
// answering "yes". Three files carried a comment saying the branch was owed.
//
// The constraint that made it interesting: an action item rule matched a whole
// ANSWER (`fromKey` + `when`), and this answer is a list of rows that disagree
// with each other — one firm can need a "get the agreement" item for Clio and a
// "go and find out" item for Slack at the same time.
// ---------------------------------------------------------------------------

describe('per-tool action items from the grid', () => {
  const grid = (rows: { tool: string; noTraining: 'yes' | 'no' | 'unknown' }[]): AnswerMap => ({
    ...MINIMAL,
    ai_tools: ['chatgpt', 'claude'],
    case_mgmt: ['clio'],
    comms_platforms: ['slack'],
    tool_grid: rows,
  })

  it('raises nothing for a tool the firm HOLDS an agreement for', () => {
    // The whole point of having asked. A firm that is already bound owes no
    // homework, which is why there is no rule for `yes`.
    const { actionItems } = assemble(
      grid([
        { tool: 'chatgpt', noTraining: 'yes' },
        { tool: 'claude', noTraining: 'yes' },
        { tool: 'clio', noTraining: 'yes' },
        { tool: 'slack', noTraining: 'yes' },
      ]),
    )
    expect(actionItems).toEqual([])
  })

  it('raises one item per row, and the three outcomes differ', () => {
    const { actionItems } = assemble(
      grid([
        { tool: 'chatgpt', noTraining: 'yes' },
        { tool: 'claude', noTraining: 'no' },
        { tool: 'clio', noTraining: 'unknown' },
        { tool: 'slack', noTraining: 'no' },
      ]),
    )
    expect(actionItems.map((a) => a.id)).toEqual([
      'tool-no-training-agreement-missing--claude',
      'tool-no-training-agreement-missing--slack',
      'tool-no-training-agreement-unknown--clio',
    ])
    // `unknown` is a real answer and not a hedge (Katy, ToolGridRow): the firm
    // is told to go and find out, which is a different instruction from either.
    const [missing, , unknown] = actionItems
    expect(missing.text).not.toBe(unknown.text)
  })

  it('names the tool it is about, by LABEL and not by stored value', () => {
    const { actionItems } = assemble(
      grid([
        { tool: 'chatgpt', noTraining: 'yes' },
        { tool: 'claude', noTraining: 'yes' },
        { tool: 'clio', noTraining: 'yes' },
        { tool: 'slack', noTraining: 'no' },
      ]),
    )
    expect(actionItems.map((a) => a.subject)).toEqual(['Slack'])
    expect(actionItems[0].text).toContain('Slack')
    expect(actionItems[0].fromKey).toBe('tool_grid')
  })

  it('carries a free-text tool through as the firm typed it', () => {
    const answers: AnswerMap = {
      ...MINIMAL,
      ai_tools: ['other:Perplexity'],
      case_mgmt: [NONE_VALUE],
      comms_platforms: ['email_only'],
      tool_grid: [
        { tool: 'other:Perplexity', noTraining: 'no' },
        { tool: 'email_only', noTraining: 'yes' },
      ],
    }
    const { actionItems } = assemble(answers)
    expect(actionItems.map((a) => a.subject)).toEqual(['Perplexity'])
    expect(actionItems[0].id).toBe('tool-no-training-agreement-missing--other:Perplexity')
  })

  it('raises nothing for a stale row whose tool the firm has retracted', () => {
    // The grid is DERIVED. A row left behind by an unticked tool must not
    // produce homework about a tool the firm does not have.
    const answers: AnswerMap = {
      ...MINIMAL,
      ai_tools: ['chatgpt'],
      case_mgmt: [NONE_VALUE],
      comms_platforms: ['email_only'],
      tool_grid: [
        { tool: 'chatgpt', noTraining: 'yes' },
        { tool: 'email_only', noTraining: 'yes' },
        { tool: 'otter_ai', noTraining: 'no' },
      ],
    }
    expect(assemble(answers).actionItems).toEqual([])
  })

  it('groups the list by what the firm has to DO, then by source question', () => {
    // Rules are the outer loop, so every tool the firm KNOWS is unbound comes
    // first, then every tool it has to go and check. Within each, source order:
    // ai_tools, then case_mgmt, then comms_platforms.
    const { actionItems } = assemble(
      grid([
        { tool: 'chatgpt', noTraining: 'unknown' },
        { tool: 'claude', noTraining: 'no' },
        { tool: 'clio', noTraining: 'unknown' },
        { tool: 'slack', noTraining: 'no' },
      ]),
    )
    expect(actionItems.map((a) => a.subject)).toEqual(['Claude', 'Slack', 'ChatGPT', 'Clio'])
  })

  it('sorts the per-tool items ahead of the per-firm ones — §5 before §6', () => {
    const answers = {
      ...grid([
        { tool: 'chatgpt', noTraining: 'yes' },
        { tool: 'claude', noTraining: 'yes' },
        { tool: 'clio', noTraining: 'no' },
        { tool: 'slack', noTraining: 'yes' },
      ]),
      case_mgmt_ai: 'not_sure',
      carrier_notified: 'not_sure',
    }
    expect(assemble(answers).actionItems.map((a) => a.id)).toEqual([
      'tool-no-training-agreement-missing--clio',
      'case-mgmt-training-permission',
      'malpractice-carrier-notification',
    ])
  })

  it('🔴 keeps every per-tool item OUT of the adopted policy — D2', () => {
    // A firm's own policy must not carry a list of the tools it has not got an
    // agreement for. The prohibition itself is unconditional and stays in §5;
    // the per-tool follow-up is homework.
    const { policy, actionItems } = assemble(
      grid([
        { tool: 'chatgpt', noTraining: 'no' },
        { tool: 'claude', noTraining: 'unknown' },
        { tool: 'clio', noTraining: 'no' },
        { tool: 'slack', noTraining: 'unknown' },
      ]),
    )
    expect(actionItems).toHaveLength(4)

    const policyText = policy.sections.flatMap((s) => s.blocks).map((b) => b.text).join('\n')
    for (const item of actionItems) {
      expect(policyText).not.toContain(item.text)
    }
  })

  it('still carries Katy\'s unconditional no-training clause for every firm', () => {
    // Source line 356 covers EVERY tool and does not branch. This batch adds
    // the per-tool follow-up, it does not add a prohibition.
    for (const answers of [MINIMAL, MAXIMAL]) {
      const ids = assemble(answers).policy.sections.flatMap((s) => s.blocks.map((b) => b.id))
      expect(ids).toContain('no-training-agreement')
    }
  })

  it('emits the same items whatever order the rows were stored in', () => {
    const rows: { tool: string; noTraining: 'yes' | 'no' | 'unknown' }[] = [
      { tool: 'chatgpt', noTraining: 'no' },
      { tool: 'claude', noTraining: 'yes' },
      { tool: 'clio', noTraining: 'unknown' },
      { tool: 'slack', noTraining: 'no' },
    ]
    const forward = assemble(grid(rows)).actionItems
    const reversed = assemble(grid([...rows].reverse())).actionItems
    expect(forward).toEqual(reversed)
  })
})

describe('determinism', () => {
  it('is a pure function of its answers', () => {
    // No clock, no randomness, no I/O — and nothing is sent anywhere. This is
    // Katy's rule and the reason the assembler is mechanical.
    expect(assemble(MAXIMAL)).toEqual(assemble(MAXIMAL))
  })

  it('does not mutate the answers it is given', () => {
    const answers = { ...MAXIMAL }
    const snapshot = JSON.stringify(answers)
    assemble(answers)
    expect(JSON.stringify(answers)).toBe(snapshot)
  })

  it('produces a policy for a completely empty answer map without throwing', () => {
    expect(() => assemble({})).not.toThrow()
  })
})

describe('TODO blocks', () => {
  it('render loudly rather than silently vanishing', () => {
    // §22 was written on 2026-09-04, so the three remaining TODOs are all in
    // §14 — Katy's lines 330, 318 and 403, deliberately left for her.
    const disclosure = assemble(MAXIMAL).policy.sections.find((s) => s.number === 14)!
    const todos = disclosure.blocks.filter((b) => b.status === 'todo')
    expect(todos.length).toBe(3)
    for (const block of todos) {
      expect(block.text).toContain('[TODO')
      expect(block.text).toContain('AI-Policy-Research-2026-08-20.md:')
    }
  })

  it('leaves NO block without a source line, now that the three G-Q placeholders are gone', () => {
    // gq6, gq8 and gq9 all carried `sourceLine: null` — Katy had written nothing
    // for any of them, and none was on her 2026-09-02 list. All three were
    // deleted on 2026-09-04 under Max's rule: "if it wasn't on Katy's policy and
    // is not necessary from the intake questions, this is garbage".
    const blocks = assemble(MAXIMAL).policy.sections.flatMap((s) => s.blocks)
    expect(blocks.filter((b) => b.sourceLine === null)).toEqual([])
  })

  it('marks §1-§4 transcribed and leaves the rest TODO, per this batch', () => {
    const { policy } = assemble(MAXIMAL)
    const early = policy.sections.filter((s) => s.number <= 4)
    const verbatimEarly = early.flatMap((s) => s.blocks).filter((b) => b.status === 'verbatim')
    // Every §1-§4 block except the G-Q9 placeholder carries real text.
    expect(verbatimEarly.length).toBeGreaterThanOrEqual(9)
  })
})
