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

import { NONE_VALUE, NO_DRAFTING } from '@/lib/intake/questions'
import type { RosterRow } from '@/lib/intake/types'
import { ACTION_ITEM_IDS } from '@/lib/policy/action-items'
import { assemble } from '@/lib/policy/assemble'
import { genericPlatformText } from '@/lib/policy/platform-block'
import { assertSpineInvariants, SPINE } from '@/lib/policy/spine'
import type { AnswerMap } from '@/lib/policy/types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ATTORNEY: RosterRow = { name: 'A. Partner', email: 'partner@firm.test', isAttorney: true }
const PARALEGAL: RosterRow = { name: 'P. Staff', email: 'staff@firm.test', isAttorney: false }

/**
 * A firm that answers "no" or "none" to everything optional.
 *
 * This is the floor: whatever survives here is in EVERY policy, so it is the
 * fixture that proves exclusion works.
 */
const MINIMAL: AnswerMap = {
  firm_name: 'Chavez Law',
  roster: [ATTORNEY],
  jurisdictions: ['NC'],
  contract_attorneys: 'no',
  existing_policy: 'no',
  research_tools: [NONE_VALUE],
  case_mgmt: [NONE_VALUE],
  comms_platforms: ['email_only'],
  regulatory_regimes: [NONE_VALUE],
  drafting_uses: [NO_DRAFTING],
  court_ai_orders: 'no',
  personal_devices: 'no',
  brainstorming: 'no',
  doc_review: 'no',
  client_ai: 'no',
  ai_marketing: 'no',
  hiring_ai: 'no',
  bill_ai_costs: 'no',
  retain_prompts: 'no',
  notetaker_stance: 'not_permitted',
  carrier_notified: 'yes',
}

/** A firm that takes nearly every branch. */
const MAXIMAL: AnswerMap = {
  ...MINIMAL,
  roster: [ATTORNEY, PARALEGAL],
  jurisdictions: ['NC', 'FEDERAL'],
  contract_attorneys: 'yes',
  existing_policy: 'yes',
  regulatory_regimes: ['hipaa'],
  research_tools: ['cocounsel', 'general_llms'],
  case_mgmt: ['clio', 'smokeball'],
  comms_platforms: ['slack', 'teams'],
  tool_grid: [{ tool: 'chatgpt', noTraining: 'yes' }],
  prohibited_tools: 'DeepSeek',
  personal_devices: 'yes',
  drafting_uses: ['form', 'substantive'],
  drafting_client_data: 'client_data',
  drafting_foreign_language: 'yes',
  court_ai_orders: 'not_sure',
  brainstorming: 'yes',
  doc_review: 'yes',
  tar: 'yes',
  client_ai: 'yes',
  ai_marketing: 'yes',
  hiring_ai: 'yes',
  bill_ai_costs: 'yes',
}

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
    expect(numbers).not.toContain(10) // no brainstorming
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
    // Employment, Malpractice, Vendor incidents, Discipline, Definitions.
    expect(numbers).toEqual(expect.arrayContaining([1, 2, 3, 8, 15, 16, 17, 19, 20, 21, 22]))
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
    for (const omitted of [6, 7, 10, 11, 13, 18]) {
      expect(numbers).not.toContain(omitted)
    }
  })

  it('keeps §9 for a firm that does no AI drafting, but only its always-on clause', () => {
    // "P20 always" — a transactional firm files with nobody and the duty still
    // reads correctly with an empty court list (map §2.3). The drafting and
    // court-disclosure clauses around it do drop out.
    const section9 = assemble(MINIMAL).policy.sections.find((s) => s.number === 9)
    expect(section9).toBeDefined()
    expect(section9!.blocks.map((b) => b.id)).toEqual(['p20-local-filing-rules'])
  })

  it('drops P21 when the firm answered "no"', () => {
    expect(blockIds(MINIMAL)).not.toContain('p21-court-ai-disclosure')
  })

  it('drops TAR when the firm does document review but no TAR', () => {
    const ids = blockIds({ ...MAXIMAL, tar: 'no' })
    expect(ids).toContain('p23-p31-document-review')
    expect(ids).not.toContain('p32-tar')
  })

  it('never emits §13 Automations, because G-Q7 does not exist yet', () => {
    // The section is declared with its real trigger so it starts working the
    // day the question lands. Until then `automations` is unanswerable and the
    // condition cannot be satisfied.
    expect(sectionNumbers(MINIMAL)).not.toContain(13)
    expect(sectionNumbers(MAXIMAL)).not.toContain(13)
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

  it('leaves the placeholder visible for a federal-only practice', () => {
    // ⚠️ KNOWN EDGE, flagged rather than papered over. An immigration or patent
    // firm may select FEDERAL and nothing else; the slot is then empty. The
    // placeholder stays rather than the sentence trailing off at "state(s) of",
    // which is loud and catchable — but the real fix is a variant of P2 for
    // firms with no state jurisdictions, and that is Katy's call.
    expect(p2TextOf(assemble({ ...MINIMAL, jurisdictions: ['FEDERAL'] }))).toContain(
      '[STATES OR JURISDICTIONS LISTED]',
    )
  })

  it('leaves the placeholder visible when the answer is missing', () => {
    // Better a visible bracket than a sentence reading "state(s) of" and nothing.
    const noName = assemble({ ...MINIMAL, firm_name: undefined })
    expect(noName.policy.sections[1].blocks[0].text).toContain('[FIRM NAME}')
  })
})

describe('the platform fallback', () => {
  it('emits the named generic block for every selected case management platform', () => {
    const ids = blockIds(MAXIMAL)
    expect(ids).toContain('p14-case-mgmt-per-platform--clio')
    expect(ids).toContain('p14-case-mgmt-per-platform--smokeball')
  })

  it('uses the exact text from POLICY-BLOCKS-RESEARCH.md §7', () => {
    const clio = assemble(MAXIMAL)
      .policy.sections.find((s) => s.number === 6)!
      .blocks.find((b) => b.id === 'p14-case-mgmt-per-platform--clio')!
    expect(clio.text).toBe(genericPlatformText('Clio'))
    expect(clio.text).toBe(
      "The firm uses Clio. The firm shall confirm whether Clio's AI features are enabled, " +
        "review Clio's terms of service for data-training language, and record the result.",
    )
  })

  it('is what makes an unresearched vendor harmless — no empty section', () => {
    // Smokeball's row in policy-blocks.csv is still empty (tier 2). The firm
    // must still get a true instruction, not silence.
    const section6 = assemble({ ...MINIMAL, case_mgmt: ['smokeball'] }).policy.sections.find(
      (s) => s.number === 6,
    )
    expect(section6).toBeDefined()
    expect(section6!.blocks.some((b) => b.text.includes('Smokeball'))).toBe(true)
  })

  it('names platforms with their intake labels', () => {
    const ids = blockIds({ ...MINIMAL, case_mgmt: ['monday'] })
    expect(ids).toContain('p14-case-mgmt-per-platform--monday')
    const text = assemble({ ...MINIMAL, case_mgmt: ['monday'] })
      .policy.sections.find((s) => s.number === 6)!
      .blocks.find((b) => b.id === 'p14-case-mgmt-per-platform--monday')!.text
    expect(text).toContain('Monday.com')
  })

  it('emits no platform block for non-vendor values', () => {
    // `none`, `email_only` and `general_llms` are not vendors — research brief §8.
    expect(blockIds({ ...MINIMAL, case_mgmt: [NONE_VALUE] })).not.toContain(
      'p14-case-mgmt-per-platform--none',
    )
    expect(blockIds(MINIMAL).some((id) => id.startsWith('p16-comms-per-platform--'))).toBe(false)
    expect(blockIds(MAXIMAL)).not.toContain('p9-research-per-tool--general_llms')
  })

  it('still emits a research block for a real research tool alongside general_llms', () => {
    expect(blockIds(MAXIMAL)).toContain('p9-research-per-tool--cocounsel')
  })

  it('handles a free-text "other:" platform', () => {
    const answers = { ...MINIMAL, case_mgmt: ['other:Leap'] }
    const text = assemble(answers)
      .policy.sections.find((s) => s.number === 6)!
      .blocks.find((b) => b.id === 'p14-case-mgmt-per-platform--other:Leap')!.text
    expect(text).toBe(genericPlatformText('Leap'))
  })

  it('orders platform blocks by option order, not selection order', () => {
    const a = blockIds({ ...MINIMAL, case_mgmt: ['clio', 'neos'] })
    const b = blockIds({ ...MINIMAL, case_mgmt: ['neos', 'clio'] })
    expect(a).toEqual(b)
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
    const definitions = assemble(MINIMAL).policy.sections.find((s) => s.number === 22)!
    const p38 = definitions.blocks[0]
    expect(p38.status).toBe('todo')
    expect(p38.text).toContain('[TODO')
    expect(p38.text).toContain('AI-Policy-Research-2026-08-20.md:342')
  })

  it('says so explicitly when Katy wrote no text at all', () => {
    const staff = assemble({ ...MINIMAL, roster: [ATTORNEY, PARALEGAL] }).policy.sections.find(
      (s) => s.number === 4,
    )!
    const gq9 = staff.blocks.find((b) => b.id === 'gq9-training-owner')!
    expect(gq9.sourceLine).toBeNull()
    expect(gq9.text).toContain('no source line')
  })

  it('marks §1-§4 transcribed and leaves the rest TODO, per this batch', () => {
    const { policy } = assemble(MAXIMAL)
    const early = policy.sections.filter((s) => s.number <= 4)
    const verbatimEarly = early.flatMap((s) => s.blocks).filter((b) => b.status === 'verbatim')
    // Every §1-§4 block except the G-Q9 placeholder carries real text.
    expect(verbatimEarly.length).toBeGreaterThanOrEqual(9)
  })
})
