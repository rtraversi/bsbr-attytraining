// §5 Approved Tools and Data Protection — POLICY-ENGINE-MAP.md §11.2
//
// The section a firm has to read before any activity section makes sense:
// which tools it may use, and with what data. Katy's Part 2 orders it the same
// way (§11.1, consequence 1).
//
// Sources: Part 2 Confidentiality, Third party software, shrinkwrap/clickwrap,
// approved vs non-approved tools; P7, P8, P12; G-Q6 and G-Q8.

import type { Block } from '@/lib/policy/types'

export const SECTION_5_BLOCKS: readonly Block[] = [
  {
    id: 'confidentiality',
    clause: 'Part 2 — Confidentiality',
    text: {
      kind: 'verbatim',
      // Curly quotes around “in the cloud” are the source’s.
      text:
        'Confidentiality: Attorney is required to make reasonable efforts to safeguard ' +
        'client confidentiality.  This does not mean that the attorney cannot use the ' +
        'Internet, nor that client data cannot be stored off-site “in the cloud” nor that ' +
        'client data cannot ever move in an out through secure channels.  Attorney must be ' +
        'satisfied that third party software is sufficiently secure that client information ' +
        'will not be inadvertently disclosed or accessed by unauthorized individuals.',
      sourceLine: 354,
    },
  },
  {
    id: 'no-training-agreement',
    clause: 'Part 2 — no-training requirement for every tool touching client data',
    // Reads tool_grid[].noTraining per the map. The grid is only shown when the
    // firm named tools, so `answered` is the honest gate.
    when: { key: 'tool_grid', answered: true },
    text: {
      kind: 'verbatim',
      // “if there is every any” is the source’s typo for “if there is ever any”.
      // Left alone. The wording still needs to branch on tool_grid[].noTraining
      // per D7 §12.1 — that is a BRANCH to add around this clause, not an edit
      // to it.
      text:
        'All AI tools, including third party tools, custom built tools, tools inside other ' +
        'tools, and public tools must always be used under an express agreement that data ' +
        'will NOT be used for training the models if there is every any access to client ' +
        'data.',
      sourceLine: 356,
    },
  },
  {
    id: 'third-party-software-factors',
    clause: 'Part 2 — third-party vendor factors',
    text: {
      kind: 'verbatim',
      // G-Q6 would add security certifications and termination handling as
      // intake questions. The clause already names both as factors; what is
      // missing is the question, not the text.
      text:
        'Third party software: Factor the experience, reputation, and stability of the ' +
        'country, whether the TOS include an express agreement about handling of client ' +
        'information, security measures employed by the company, what the TOS will happen ' +
        'to data if the services are terminated or the company should go out of business.',
      sourceLine: 359,
    },
  },
  {
    id: 'shrinkwrap-clickwrap',
    clause: 'Part 2 — shrinkwrap / clickwrap caution',
    text: {
      kind: 'verbatim',
      // The source line opens with a bare “: ” left over from Katy’s bullet
      // formatting (line 358 is the “-How data can be moved” bullet it hangs
      // off). The clause starts at “Firm”. “entrie” is her typo, left alone.
      text:
        'Firm will be particularly cautious about providers that practice “shrinkwrap ' +
        'agreements” where the entrie license agreement is considered accepted once a user ' +
        'simply opens the product.  Also a “clickwrap” agreement where agreement is ' +
        'accepted by checking a box.  Information in such tools may not be protected ' +
        'sufficiently',
      sourceLine: 360,
    },
  },
  {
    id: 'approved-vs-non-approved',
    clause: 'Part 2 — approved vs non-approved tools',
    text: {
      kind: 'verbatim',
      // Split from line 406 below, one block per source line — the fidelity
      // test checks a block against ONE line. G-Q8 (who may approve a new
      // tool, and by what process) is what would make this firm-specific.
      text:
        'Distinguish “approved tools” vs “non-approved tools” for confidential or case ' +
        'specific information.',
      sourceLine: 405,
    },
  },
  {
    id: 'non-approved-tools',
    clause: 'Part 2 — approved vs non-approved tools',
    text: {
      kind: 'verbatim',
      // “chatbox” is the source’s typo for “chatbot”. Left alone.
      text:
        'Non-approved tools are chatbox consumer versions with training on.  These can be ' +
        'used for simple web searches',
      sourceLine: 406,
    },
  },
  {
    id: 'p7-prohibited-tools',
    clause: 'P7',
    when: { key: 'prohibited_tools', answered: true },
    text: {
      kind: 'todo',
      reason:
        'Katy wrote an instruction, not a clause. Needs prepared text naming the ' +
        'tools the firm prohibited, filled from the prohibited_tools free text.',
      sourceLine: 276,
    },
  },
  {
    id: 'p8-personal-devices',
    clause: 'P8',
    when: { key: 'personal_devices', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Katy wrote an instruction, not a clause, though it dictates the substance: ' +
        'strict compliance, and never personally identifiable client or case information.',
      sourceLine: 278,
    },
  },
  {
    id: 'p12-general-llms',
    clause: 'P12',
    when: { key: 'research_tools', includesAny: ['general_llms'] },
    text: {
      kind: 'verbatim',
      // Ends “(DEFINITIONS AT END)”, which points at §22 — a cross-reference
      // Katy wrote, and it stays pointing at an entry that is still G-B4.
      text:
        'Any general purpose LLMs (not legal-specific research tools) may only be used in a ' +
        'manner that protects client data.  Specifically inquiries shall be so general that ' +
        'a client’s case cannot be determined from the prompt, or that the data shall only ' +
        'go through a professional level of data protection (DEFINITIONS AT END)',
      sourceLine: 286,
    },
  },
  {
    id: 'gq8-tool-approval',
    clause: 'G-Q8',
    text: {
      kind: 'todo',
      reason:
        'G-Q8 — who may approve a new tool, and by what process. Approved for build ' +
        '(D3); the intake question does not exist yet. Out of scope this batch.',
      sourceLine: null,
    },
  },
  {
    id: 'gq6-vendor-diligence',
    clause: 'G-Q6',
    when: { key: 'tool_grid', answered: true },
    text: {
      kind: 'todo',
      reason:
        'G-Q6 — vendor TOS reviewed for security certifications and for data handling ' +
        'on termination. Approved for build (D3); question does not exist yet.',
      sourceLine: null,
    },
  },
]
