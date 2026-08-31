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
      kind: 'todo',
      reason: 'Source text EXISTS at this line and needs transcription only.',
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
      kind: 'todo',
      reason:
        'Source text EXISTS at this line and needs transcription only. Wording must ' +
        'branch on tool_grid[].noTraining (yes / no / unknown), which is the only ' +
        'tier-shaped signal the intake still collects — see D7 §12.1.',
      sourceLine: 356,
    },
  },
  {
    id: 'third-party-software-factors',
    clause: 'Part 2 — third-party vendor factors',
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line and needs transcription only. G-Q6 would ' +
        'add the security-certification and termination-handling factors the intake ' +
        'does not yet ask about; tool_grid asks noTraining only.',
      sourceLine: 359,
    },
  },
  {
    id: 'shrinkwrap-clickwrap',
    clause: 'Part 2 — shrinkwrap / clickwrap caution',
    text: {
      kind: 'todo',
      reason: 'Source text EXISTS at this line and needs transcription only.',
      sourceLine: 360,
    },
  },
  {
    id: 'approved-vs-non-approved',
    clause: 'Part 2 — approved vs non-approved tools',
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at lines 405-406 and needs transcription only. This is ' +
        'Module W, and both benchmarks lead with tool approval (B10), so G-Q8 — who ' +
        'may approve a new tool and by what process — is what makes it firm-specific.',
      sourceLine: 405,
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
      kind: 'todo',
      reason:
        'Source text EXISTS at this line and needs transcription only. It ends ' +
        '"(DEFINITIONS AT END)" and so depends on G-B4, the one unfinished Definitions ' +
        'entry carried by §22.',
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
