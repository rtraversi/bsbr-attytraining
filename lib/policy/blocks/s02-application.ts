// §2 Application — POLICY-ENGINE-MAP.md §11.2
//
// P1 (firm_name), P2 (jurisdictions), P3 (regulatory_regimes),
// P5 (contract_attorneys), P6 (existing_policy).
//
// The section was named "Scope and Governing Authority" in the first draft of
// the spine and renamed before ratification: both halves of that name were
// deferred material — Scope is benchmark gap B2 (D6) and Governing Authority is
// per-state guidance (D5). "Application" claims only what the section does.

import { FEDERAL_OPTION, NONE_VALUE } from '@/lib/intake/questions'
import type { Block } from '@/lib/policy/types'

export const SECTION_2_BLOCKS: readonly Block[] = [
  {
    id: 'p1-title',
    clause: 'P1',
    text: {
      kind: 'verbatim',
      // The closing brace is Katy's — the source reads `\[FIRM NAME}`. Kept so
      // the transcription is exact and so the slot placeholder below matches a
      // real substring. Do not "fix" it to `]` without fixing her document.
      text: 'ARTIFICIAL INTELLIGENCE POLICY FOR [FIRM NAME}',
      sourceLine: 264,
      slots: [{ placeholder: '[FIRM NAME}', key: 'firm_name' }],
    },
  },
  {
    id: 'p2-jurisdictions',
    clause: 'P2',
    text: {
      kind: 'verbatim',
      text:
        'Attorneys and staff must comply with all requirements of Federal Courts, ' +
        'Agencies, Circuits, as well as state(s) of [STATES OR JURISDICTIONS LISTED]',
      sourceLine: 266,
      // FEDERAL is excluded from the fill, not from the clause. Katy's sentence
      // already opens "comply with all requirements of Federal Courts, Agencies,
      // Circuits", so a firm that also ticked "Federal courts" on `jurisdictions`
      // would read Federal twice in one sentence. The slot is for the STATES
      // half — which is what her placeholder says.
      //
      // A purely federal practice (immigration, patent) may select FEDERAL and
      // no state, leaving the slot empty. The sentence then ENDS AFTER
      // "Circuits" — the trailing "as well as state(s) of …" is cut, because
      // there are no states for it to introduce.
      //
      // 🔴 That is a truncation at a boundary Katy already wrote, not a variant
      // of her clause and not a rewording: the span removed is her own, and
      // assertSpineInvariants() enforces that it is a real substring carrying
      // the placeholder. Neither form ends in a full stop, because her source
      // line does not either.
      slots: [
        {
          placeholder: '[STATES OR JURISDICTIONS LISTED]',
          key: 'jurisdictions',
          exclude: [FEDERAL_OPTION.value],
          dropWhenEmpty: ', as well as state(s) of [STATES OR JURISDICTIONS LISTED]',
        },
      ],
    },
  },
  {
    id: 'p3-regulatory-regimes',
    clause: 'P3',
    // Fires when the firm named any regime. `not: 'none'` also requires the
    // question to be ANSWERED — see the note on `not` in lib/intake/types.ts —
    // so an unanswered intake does not emit this clause vacuously.
    when: { key: 'regulatory_regimes', not: NONE_VALUE },
    text: {
      kind: 'todo',
      // Line 268 is an instruction to a drafter, not a clause: "[IF FIRM STATES
      // THAT IT IS SUBJECT TO ADDITIONAL REGULATORY REGIMES LIKE HIPAA< STATE
      // THAT IT WILL COMPLY WITH THE MOST RESTRICTIVE REGIME]". There is no
      // sentence in the source to transcribe.
      reason:
        'Katy wrote an instruction, not a clause. Needs prepared text stating ' +
        'compliance with the most restrictive regime, naming the regimes the firm selected.',
      sourceLine: 268,
    },
  },
  {
    id: 'p5-contract-attorneys',
    clause: 'P5',
    when: { key: 'contract_attorneys', is: 'yes' },
    text: {
      kind: 'verbatim',
      // Curly quotes are the source's.
      text:
        'All contract attorneys, “of-counsel” attorneys and co-counsel shall be ' +
        'supervised as necessary to ensure compliance with this policy.',
      sourceLine: 272,
    },
  },
  {
    id: 'p6-existing-policy',
    clause: 'P6',
    when: { key: 'existing_policy', is: 'yes' },
    text: {
      kind: 'verbatim',
      // Line 274 is half instruction, half clause. The bracket
      // "[if a technology or confidentiality policy was YES then state]" is the
      // condition — carried by `when` — and the words after it are the clause.
      text: 'All staff will comply with incorporated technology/confidentiality policy',
      sourceLine: 274,
    },
  },
]
