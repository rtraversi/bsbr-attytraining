// =============================================================================
// The assembled policy as a .docx — D8-5.
//
// Katy, 2026-08-31: the deliverable is a Word document, "never a static PDF",
// so the firm can edit it in a word processor or put it "into their own AI
// asking for more cusomtizations". A PDF is a picture of a policy; this is a
// policy the firm owns.
//
// 🔴 NO DEPENDENCY, AND THAT IS A REQUIREMENT RATHER THAN A FLOURISH. This has
// to run in a Cloudflare Worker — the same constraint that chose `pdf-lib` for
// the certificate over anything wanting a headless browser. A .docx is a ZIP of
// XML, both of which can be written by hand, so the whole format is about 120
// lines below and nothing has to be installed, audited or kept up to date.
//
// ── Why the ZIP entries are STORED and not deflated ─────────────────────────
// A ZIP entry may be stored (method 0) or deflated (method 8), and Word opens
// either. Storing keeps this module SYNCHRONOUS and portable: the web-standard
// compressor is `CompressionStream`, which is async, and `node:zlib` does not
// exist in every runtime this may end up in. A policy is tens of kilobytes of
// text. There is nothing here worth an async boundary.
//
// ── What it is NOT ──────────────────────────────────────────────────────────
// Not a Markdown converter and not a general OOXML library. It emits exactly
// the four paragraph shapes the policy has — title, section heading, body,
// TODO — and refuses to grow a fifth without someone deciding what it means.
// =============================================================================

import type { ActionItem, AssembleResult, AssembledPolicy } from '@/lib/policy/types'

// ---------------------------------------------------------------------------
// ZIP
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let c = i
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

interface ZipEntry {
  name: string
  data: Uint8Array
}

/**
 * A ZIP archive, stored (uncompressed), with fixed timestamps.
 *
 * 🔴 THE TIMESTAMPS ARE CONSTANT ON PURPOSE. `assemble()` is a pure function
 * and its whole contract is that the same answers produce the same document
 * (see its header). Stamping `now` into the archive would break that at the
 * last possible step: two identical policies would differ byte for byte and
 * nothing downstream could compare them. 1980-01-01 is the ZIP epoch — the
 * conventional value for exactly this.
 */
function zip(entries: readonly ZipEntry[]): Uint8Array {
  const DOS_TIME = 0
  const DOS_DATE = 33 // 1980-01-01
  const encoder = new TextEncoder()

  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  const u32 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff])
  const u16 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff])
  const concat = (parts: Uint8Array[]) => {
    const total = parts.reduce((n, p) => n + p.length, 0)
    const out = new Uint8Array(total)
    let at = 0
    for (const p of parts) {
      out.set(p, at)
      at += p.length
    }
    return out
  }

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length

    const local = concat([
      u32(0x04034b50),
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method 0 = stored
      u16(DOS_TIME),
      u16(DOS_DATE),
      u32(crc),
      u32(size), // compressed
      u32(size), // uncompressed
      u16(name.length),
      u16(0), // extra
      name,
      entry.data,
    ])
    chunks.push(local)

    central.push(
      concat([
        u32(0x02014b50),
        u16(20), // version made by
        u16(20), // version needed
        u16(0),
        u16(0),
        u16(DOS_TIME),
        u16(DOS_DATE),
        u32(crc),
        u32(size),
        u32(size),
        u16(name.length),
        u16(0), // extra
        u16(0), // comment
        u16(0), // disk
        u16(0), // internal attrs
        u32(0), // external attrs
        u32(offset),
        name,
      ]),
    )
    offset += local.length
  }

  const dir = concat(central)
  return concat([
    concat(chunks),
    dir,
    concat([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(entries.length),
      u16(entries.length),
      u32(dir.length),
      u32(offset),
      u16(0),
    ]),
  ])
}

// ---------------------------------------------------------------------------
// WordprocessingML
// ---------------------------------------------------------------------------

/**
 * The four shapes a policy paragraph can have. There is no fifth.
 *
 * `todo` is the one that earns its place. An untranscribed clause has to stay
 * visible and has to be impossible to mistake for policy language — the same
 * argument the Markdown renderer makes for its blockquotes, and the same reason
 * assemble() emits a loud marker rather than silence. Here it is red and bold.
 */
export type ParagraphStyle = 'Title' | 'SectionHeading' | 'Body' | 'Todo'

export interface Paragraph {
  style: ParagraphStyle
  text: string
}

/** XML text escaping. The five predefined entities, nothing clever. */
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * One `<w:p>`.
 *
 * `xml:space="preserve"` is load-bearing: Katy's clauses carry double spaces
 * after full stops ("client data.  Specifically inquiries…") and Word collapses
 * them without it. Those spaces are hers, the transcription preserved them
 * deliberately, and losing them in the last step would undo that work
 * invisibly.
 */
function paragraphXml(p: Paragraph): string {
  const runProps = p.style === 'Todo' ? '<w:rPr><w:b/><w:color w:val="B3261E"/></w:rPr>' : ''
  return (
    `<w:p><w:pPr><w:pStyle w:val="${p.style}"/></w:pPr>` +
    `<w:r>${runProps}<w:t xml:space="preserve">${esc(p.text)}</w:t></w:r></w:p>`
  )
}

export function documentXml(paragraphs: readonly Paragraph[]): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${paragraphs.map(paragraphXml).join('')}` +
    '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>' +
    '</w:body></w:document>'
  )
}

/**
 * The style definitions the paragraphs above refer to.
 *
 * Written out rather than relying on Word's built-ins so the document looks the
 * same wherever it is opened — Word, Pages, Google Docs and LibreOffice all
 * supply different defaults for a style they are only told the name of. Sizes
 * are in half-points, which is what `w:sz` means.
 */
const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:docDefaults><w:rPrDefault><w:rPr>' +
  '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/>' +
  '</w:rPr></w:rPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/>' +
  '<w:pPr><w:spacing w:after="360"/></w:pPr>' +
  '<w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="SectionHeading"><w:name w:val="heading 1"/>' +
  '<w:pPr><w:keepNext/><w:spacing w:before="360" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr>' +
  '<w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Body"><w:name w:val="Body Text"/>' +
  '<w:pPr><w:spacing w:after="200" w:line="276" w:lineRule="auto"/></w:pPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Todo"><w:name w:val="Todo"/>' +
  '<w:pPr><w:spacing w:after="200" w:line="276" w:lineRule="auto"/></w:pPr></w:style>' +
  '</w:styles>'

const CONTENT_TYPES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '</Types>'

const RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>'

const DOCUMENT_RELS_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>'

/** Paragraphs → the bytes of a .docx file. */
export function docx(paragraphs: readonly Paragraph[]): Uint8Array {
  const encoder = new TextEncoder()
  return zip([
    // [Content_Types].xml must be the FIRST entry. The OPC spec requires it and
    // Word refuses the file outright if it is not.
    { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES_XML) },
    { name: '_rels/.rels', data: encoder.encode(RELS_XML) },
    { name: 'word/_rels/document.xml.rels', data: encoder.encode(DOCUMENT_RELS_XML) },
    { name: 'word/document.xml', data: encoder.encode(documentXml(paragraphs)) },
    { name: 'word/styles.xml', data: encoder.encode(STYLES_XML) },
  ])
}

// ---------------------------------------------------------------------------
// The two deliverables
// ---------------------------------------------------------------------------

/**
 * The policy, as paragraphs.
 *
 * Section numbers are the SPINE's, not sequential — a firm that skips a section
 * keeps the gap, so two firms citing "§11" always mean the same rule. See
 * assemble()'s header, which makes the same point about renumbering.
 */
export function policyParagraphs(policy: AssembledPolicy, firmName: string): Paragraph[] {
  const out: Paragraph[] = [
    { style: 'Title', text: `Artificial Intelligence Policy for ${firmName}` },
  ]

  for (const section of policy.sections) {
    out.push({ style: 'SectionHeading', text: `§${section.number} ${section.title}` })
    for (const block of section.blocks) {
      out.push({ style: block.status === 'todo' ? 'Todo' : 'Body', text: block.text })
    }
  }

  return out
}

/**
 * The action item list, as paragraphs — a SEPARATE document (D2).
 *
 * Never appended to the policy, and the reason is not tidiness: a firm's
 * adopted policy must not contain a list of what the firm has not done yet. See
 * the header of lib/policy/action-items.ts, where that is argued at length.
 *
 * Produced even when empty, and it says so. A missing file reads as "the
 * renderer did not run"; an empty one reads as "this firm has no homework".
 */
export function actionItemParagraphs(
  actionItems: readonly ActionItem[],
  firmName: string,
): Paragraph[] {
  const out: Paragraph[] = [
    { style: 'Title', text: `Action Items for ${firmName}` },
    {
      style: 'Body',
      text:
        'These are things to confirm or decide. They accompany your AI policy and are ' +
        'deliberately not part of it.',
    },
  ]

  if (actionItems.length === 0) {
    out.push({ style: 'Body', text: 'No action items.' })
    return out
  }

  for (const item of actionItems) {
    out.push({ style: item.status === 'todo' ? 'Todo' : 'Body', text: item.text })
  }
  return out
}

export interface PolicyDocuments {
  policy: Uint8Array
  actionItems: Uint8Array
}

/**
 * Both deliverables, as .docx bytes.
 *
 * Two files, never one — D2. The caller decides where they go; this module does
 * no I/O, which is what lets it run unchanged in a Worker and in a script.
 */
export function policyDocuments(result: AssembleResult, firmName: string): PolicyDocuments {
  return {
    policy: docx(policyParagraphs(result.policy, firmName)),
    actionItems: docx(actionItemParagraphs(result.actionItems, firmName)),
  }
}
