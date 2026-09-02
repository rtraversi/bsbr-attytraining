import { describe, it, expect } from 'vitest'
import {
  LANGUAGES,
  getQuestion,
  languageOptionsFor,
  optionsForQuestion,
  stateOptionsFor,
} from '@/lib/intake/questions'
import { isAnswered, missingRequired, visibleQuestions } from '@/lib/intake/branching'
import { formatAnswer } from '@/lib/intake/review'
import { assemble } from '@/lib/policy/assemble'
import { otherValue, type AnswerMap, type Question } from '@/lib/intake/types'

/**
 * `foreign_languages` as a picked list rather than free text.
 *
 * Max, walking the intake in a browser 2026-09-02: "best to have a list and not
 * free text ... bc they can 100 just type, idk lol, like i am going to do rn."
 * The answer names the languages in a policy clause, so free text put whatever
 * someone typed into a legal document.
 */

const q = (key: string): Question => {
  const found = getQuestion(key)
  if (!found) throw new Error(`test bug: no question "${key}"`)
  return found
}

describe('the LANGUAGES list', () => {
  it('holds 95 entries', () => {
    // Max approved 95 (2026-09-02). A count test rather than a range: the size
    // was a decision, so a change to it should be deliberate.
    expect(LANGUAGES).toHaveLength(95)
  })

  it('has no duplicate values', () => {
    // Values are STORED. A duplicate would make one of the two unselectable and
    // the other ambiguous.
    const values = LANGUAGES.map((l) => l.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('has no duplicate labels', () => {
    const labels = LANGUAGES.map((l) => l.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('every entry has a non-empty value and label', () => {
    for (const l of LANGUAGES) {
      expect(l.value.trim()).not.toBe('')
      expect(l.label.trim()).not.toBe('')
    }
  })

  it('leads with the languages a US firm is most likely to need', () => {
    // Ordered by US prevalence, not alphabetically, so the common picks are
    // visible before anyone types.
    expect(LANGUAGES[0].value).toBe('es')
    const topTen = LANGUAGES.slice(0, 10).map((l) => l.value)
    expect(topTen).toContain('zh-cmn')
    expect(topTen).toContain('vi')
    expect(topTen).toContain('ar')
  })

  it('carries no em dashes', () => {
    // The 2026-09-02 purge applies to anything new too.
    for (const l of LANGUAGES) expect(l.label).not.toContain('—')
  })
})

describe('the question itself', () => {
  it('is no longer free text', () => {
    expect(q('foreign_languages').type).toBe('languages')
  })

  it('is still required, and still branches off drafting_foreign_language', () => {
    expect(q('foreign_languages').required).toBe(true)
    expect(q('foreign_languages').showIf).toEqual({
      key: 'drafting_foreign_language',
      is: 'yes',
    })
  })

  it('counts as answered only when something is picked', () => {
    const question = q('foreign_languages')
    expect(isAnswered(question, { foreign_languages: [] as never })).toBe(false)
    expect(isAnswered(question, {})).toBe(false)
    expect(isAnswered(question, { foreign_languages: ['es'] as never })).toBe(true)
  })

  it('an Other-only answer still counts as answered', () => {
    // A firm serving a language off the list must not be blocked from sending.
    const question = q('foreign_languages')
    const answers: AnswerMap = { foreign_languages: [otherValue('Cherokee')!] as never }
    expect(isAnswered(question, answers)).toBe(true)
  })

  it('a firm that picks nothing is stopped at Send', () => {
    const base: AnswerMap = {
      drafting_uses: ['substantive'] as never,
      drafting_client_data: 'client_data',
      drafting_foreign_language: 'yes',
      foreign_language_content: 'client_data',
    }
    expect(missingRequired(base).map((x) => x.key)).toContain('foreign_languages')
    const filled = { ...base, foreign_languages: ['es'] as never }
    expect(missingRequired(filled).map((x) => x.key)).not.toContain('foreign_languages')
  })
})

describe('optionsForQuestion resolves the bulk list, not just the extras', () => {
  it('for languages', () => {
    // Reading question.options directly yields ONLY the extras, which for this
    // question is none — every language would render as a bare ISO code.
    expect(optionsForQuestion(q('foreign_languages'))).toHaveLength(LANGUAGES.length)
    expect(languageOptionsFor(q('foreign_languages'))).toHaveLength(LANGUAGES.length)
  })

  it('and still for states, unchanged', () => {
    expect(optionsForQuestion(q('jurisdictions'))).toEqual(stateOptionsFor(q('jurisdictions')))
  })

  it('falls through to plain options for every other type', () => {
    const tools = q('ai_tools')
    expect(optionsForQuestion(tools)).toEqual(tools.options ?? [])
  })
})

describe('how it reads back to the firm', () => {
  it('one language renders as its name, never its code', () => {
    expect(formatAnswer(q('foreign_languages'), { foreign_languages: ['es'] as never }))
      .toBe('Spanish')
  })

  it('several render as a readable list', () => {
    const out = formatAnswer(q('foreign_languages'), {
      foreign_languages: ['es', 'vi', 'ht'] as never,
    })
    expect(out).toBe('Spanish · Vietnamese · Haitian Creole')
    expect(out).not.toContain('other:')
  })

  it('an Other value renders as the words the firm typed', () => {
    const out = formatAnswer(q('foreign_languages'), {
      foreign_languages: ['es', otherValue('Cherokee')!] as never,
    })
    expect(out).toBe('Spanish · Cherokee')
    // The storage prefix must never surface.
    expect(out).not.toContain('other:')
  })
})

describe('🔴 how it renders into a policy clause', () => {
  // The reason the control exists at all: this value ends up naming the
  // languages in a legal document.
  //
  // renderAnswer is module-private, so this drives it the way the product does
  // — through assemble() — and asserts on the assembled policy text.
  function policyText(answers: AnswerMap): string {
    return assemble(answers)
      .policy.sections.flatMap((s) => s.blocks)
      .map((b) => b.text)
      .join('\n')
  }

  const base: AnswerMap = {
    firm_name: 'Byron LLP',
    drafting_uses: ['substantive'] as never,
    drafting_client_data: 'client_data',
    drafting_foreign_language: 'yes',
    foreign_language_content: 'client_data',
  }

  it('assembles without throwing for every shape of answer', () => {
    // Single, multiple, Other-only, and mixed.
    for (const value of [
      ['es'],
      ['es', 'vi', 'ht'],
      [otherValue('Cherokee')!],
      ['es', otherValue('Cherokee')!],
    ]) {
      expect(() => policyText({ ...base, foreign_languages: value as never })).not.toThrow()
    }
  })

  it('never leaks a raw code or the other: prefix into the document', () => {
    const text = policyText({
      ...base,
      foreign_languages: ['es', 'zh-cmn', otherValue('Cherokee')!] as never,
    })
    expect(text).not.toContain('other:')
    expect(text).not.toContain('zh-cmn')
  })
})

describe('the whole question set still holds together', () => {
  it('the new type does not break question visibility', () => {
    expect(visibleQuestions({}).length).toBeGreaterThan(0)
  })
})
