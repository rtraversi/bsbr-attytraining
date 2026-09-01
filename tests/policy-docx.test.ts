// =============================================================================
// The .docx deliverable — D8-5.
//
// Two things are worth testing here and they are different in kind.
//
// The CONTAINER: a .docx is a ZIP written by hand in lib/policy/docx.ts, and a
// malformed one fails in Word rather than in CI — a firm opens its policy and
// gets "the file is corrupt". So the archive is parsed back with a real ZIP
// reader, not inspected with string matching.
//
// The CONTENT: that every clause assemble() produced reaches the page, that
// Katy's spacing survives, and that a TODO is visually distinct. That last one
// is the same argument the Markdown renderer makes for its blockquotes — a
// section that quietly dropped its unwritten clauses would look finished.
// =============================================================================

import { describe, expect, it } from 'vitest'

import { assemble } from '@/lib/policy/assemble'
import {
  actionItemParagraphs,
  docx,
  documentXml,
  policyDocuments,
  policyParagraphs,
  type Paragraph,
} from '@/lib/policy/docx'
import { MAXIMAL, MINIMAL } from '@/lib/policy/fixtures'

const u16 = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8)
const u32 = (b: Uint8Array, at: number) =>
  (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0

/**
 * The archive's entry names, read from the CENTRAL DIRECTORY.
 *
 * Deliberately not from the local headers: the central directory is what a ZIP
 * reader actually uses, and an archive whose local entries are fine but whose
 * directory is wrong is exactly the failure that opens as a corrupt file.
 */
function entryNames(zip: Uint8Array): string[] {
  // Locate the end-of-central-directory record by its signature, scanning back.
  let eocd = zip.length - 22
  while (eocd >= 0 && u32(zip, eocd) !== 0x06054b50) eocd -= 1
  expect(eocd, 'no end-of-central-directory record').toBeGreaterThanOrEqual(0)

  const count = u16(zip, eocd + 10)
  let at = u32(zip, eocd + 16)
  const names: string[] = []
  const decoder = new TextDecoder()

  for (let i = 0; i < count; i += 1) {
    expect(u32(zip, at), 'central directory entry signature').toBe(0x02014b50)
    const nameLength = u16(zip, at + 28)
    names.push(decoder.decode(zip.subarray(at + 46, at + 46 + nameLength)))
    at += 46 + nameLength + u16(zip, at + 30) + u16(zip, at + 32)
  }
  return names
}

describe('the container', () => {
  const file = docx([{ style: 'Body', text: 'hello' }])

  it('is a ZIP whose central directory lists the five OPC parts', () => {
    expect(entryNames(file)).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'word/_rels/document.xml.rels',
      'word/document.xml',
      'word/styles.xml',
    ])
  })

  it('🔴 puts [Content_Types].xml first, which the OPC spec requires', () => {
    // Word refuses the file outright if it is not the first entry, and the
    // failure is a corrupt-file dialog with nothing to debug from.
    expect(entryNames(file)[0]).toBe('[Content_Types].xml')
    expect(new TextDecoder().decode(file.subarray(30, 49))).toBe('[Content_Types].xml')
  })

  it('starts with the local file header signature', () => {
    expect(u32(file, 0)).toBe(0x04034b50)
  })

  it('🔴 is byte-identical for the same input', () => {
    // assemble() is pure and its whole contract is that the same answers give
    // the same document. Stamping `now` into the archive would break that at
    // the last possible step — see the note on DOS_TIME in docx.ts.
    expect(Array.from(docx([{ style: 'Body', text: 'x' }]))).toEqual(
      Array.from(docx([{ style: 'Body', text: 'x' }])),
    )
  })
})

describe('the XML', () => {
  it('escapes the five predefined entities', () => {
    const xml = documentXml([{ style: 'Body', text: `a & b < c > d " e ' f` }])
    expect(xml).toContain('a &amp; b &lt; c &gt; d &quot; e &apos; f')
    // And nothing raw survived.
    expect(xml.split('<w:t xml:space="preserve">')[1].split('</w:t>')[0]).not.toMatch(/[<>&](?!\w+;)/)
  })

  it('🔴 preserves whitespace, because Katy double-spaces after full stops', () => {
    // "client data.  Specifically inquiries…" — Word collapses that without
    // xml:space="preserve". The transcription kept those spaces deliberately;
    // losing them in the last step would undo that work invisibly.
    const xml = documentXml([{ style: 'Body', text: 'One.  Two.' }])
    expect(xml).toContain('xml:space="preserve"')
    expect(xml).toContain('One.  Two.')
  })

  it('marks a TODO paragraph bold and red, and nothing else', () => {
    expect(documentXml([{ style: 'Todo', text: 'x' }])).toContain('<w:b/><w:color w:val="B3261E"/>')
    expect(documentXml([{ style: 'Body', text: 'x' }])).not.toContain('<w:color')
  })

  it('names every style it uses', () => {
    const styles: Paragraph['style'][] = ['Title', 'SectionHeading', 'Body', 'Todo']
    for (const style of styles) {
      expect(documentXml([{ style, text: 'x' }])).toContain(`<w:pStyle w:val="${style}"/>`)
    }
  })
})

describe('the policy document', () => {
  const result = assemble(MAXIMAL)
  const paragraphs = policyParagraphs(result.policy, 'Chavez Law')

  it('opens with the firm name as the title', () => {
    expect(paragraphs[0]).toEqual({
      style: 'Title',
      text: 'Artificial Intelligence Policy for Chavez Law',
    })
  })

  it('carries every block assemble() produced, and no others', () => {
    const blocks = result.policy.sections.flatMap((s) => s.blocks)
    const body = paragraphs.filter((p) => p.style === 'Body' || p.style === 'Todo')
    expect(body).toHaveLength(blocks.length)
    expect(body.map((p) => p.text)).toEqual(blocks.map((b) => b.text))
  })

  it('gives each section one heading, on the SPINE number', () => {
    // Not sequential. A firm that skips a section keeps the gap, so two firms
    // citing "§11" always mean the same rule.
    const headings = paragraphs.filter((p) => p.style === 'SectionHeading')
    expect(headings).toHaveLength(result.policy.sections.length)
    expect(headings.map((h) => h.text)).toEqual(
      result.policy.sections.map((s) => `§${s.number} ${s.title}`),
    )
    // MINIMAL omits §4, §6, §7 … so the numbers are not 1..n.
    const minimal = policyParagraphs(assemble(MINIMAL).policy, 'Chavez Law')
      .filter((p) => p.style === 'SectionHeading')
      .map((h) => Number(h.text.match(/§(\d+)/)![1]))
    expect(minimal).not.toEqual(minimal.map((_, i) => i + 1))
  })

  it('🔴 keeps every TODO visible, and marked', () => {
    const todos = result.policy.sections
      .flatMap((s) => s.blocks)
      .filter((b) => b.status === 'todo')
    expect(todos.length).toBeGreaterThan(0)
    expect(paragraphs.filter((p) => p.style === 'Todo')).toHaveLength(todos.length)
  })
})

describe('the action item list is a SEPARATE document (D2)', () => {
  it('is its own file, and the policy never contains it', () => {
    // A firm's adopted policy must not contain a list of what the firm has not
    // done yet — see the header of lib/policy/action-items.ts. This is the
    // check that a later convenience refactor would trip over.
    const answers = { ...MINIMAL, carrier_notified: 'not_sure' }
    const result = assemble(answers)
    expect(result.actionItems.length).toBeGreaterThan(0)

    const policy = policyParagraphs(result.policy, 'Chavez Law')
    for (const item of result.actionItems) {
      expect(policy.map((p) => p.text)).not.toContain(item.text)
    }

    const list = actionItemParagraphs(result.actionItems, 'Chavez Law')
    expect(list.map((p) => p.text)).toEqual(
      expect.arrayContaining(result.actionItems.map((i) => i.text)),
    )
  })

  it('is produced even when empty, and says so', () => {
    // A missing file reads as "the renderer did not run"; an empty one reads as
    // "this firm has no homework", and those are different facts.
    const list = actionItemParagraphs([], 'Chavez Law')
    expect(list[0].text).toBe('Action Items for Chavez Law')
    expect(list.at(-1)!.text).toBe('No action items.')
  })

  it('policyDocuments returns two distinct files', () => {
    const documents = policyDocuments(assemble(MINIMAL), 'Chavez Law')
    expect(entryNames(documents.policy)).toHaveLength(5)
    expect(entryNames(documents.actionItems)).toHaveLength(5)
    expect(documents.policy.length).not.toBe(documents.actionItems.length)
  })
})
