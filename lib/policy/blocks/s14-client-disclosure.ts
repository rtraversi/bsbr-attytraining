// §14 Client Disclosure and Client Use of AI — POLICY-ENGINE-MAP.md §11.2
//
// A three-way merge, per the spine's provenance note: Part 2's Disclosure,
// POLICY REGARDING CLIENT USE OF AI, and Give examples become one section.
//
// Sources: Part 2 Disclosure, P33 (G-B3), P27, Part 2 client use, Part 2
// "Give examples" (G-Q4).

import type { Block } from '@/lib/policy/types'

export const SECTION_14_BLOCKS: readonly Block[] = [
  {
    id: 'disclosure-not-every-use',
    clause: 'Part 2 — Disclosure',
    text: {
      kind: 'verbatim',
      text: 'Not every possible use of AI needs to be affirmatively disclosed.',
      sourceLine: 392,
    },
  },
  {
    id: 'disclosure-reasoning',
    clause: 'Part 2 — Disclosure',
    text: {
      kind: 'verbatim',
      // ⚠️ THE CITED LINE MOVED, 391 → 393, and the block SPLIT ACROSS FOUR.
      // Line 391 is a bare heading (“Disclosure : What specific disclosures are
      // required to the clients”) with no clause in it. 392-395 are four
      // separate rules, and the fidelity test checks a block against ONE line,
      // so each is its own block citing its own line.
      // The “ .Generally” mid-sentence is what her markdown leaves behind
      // (“representation **.**Generally”). Left exactly as it normalises, so
      // the transcription check compares like with like.
      text:
        'Disclosure is required to the extent reasonably necessary to permit the client to ' +
        'make informed decisions regarding the representation .Generally, a lawyer need not ' +
        'inform her client that she is using an AI tool to complete ordinary tasks, such as ' +
        'generic case/practice management. However, if a lawyer delegates substantive tasks ' +
        'in furtherance of the representation to an AI tool, the lawyer’s use of the tool ' +
        'is akin to outsourcing legal work to a nonlawyer or other third-party resource or ' +
        'service, for which the client’s advanced informed consent is required.',
      sourceLine: 393,
    },
  },
  {
    id: 'disclosure-billing',
    clause: 'Part 2 — Disclosure',
    text: {
      kind: 'verbatim',
      text:
        'If billing clients for the cost of AI tools then disclosure of that is required ' +
        'prior to being retained.',
      sourceLine: 394,
    },
  },
  {
    id: 'disclosure-tribunal',
    clause: 'Part 2 — Disclosure',
    text: {
      kind: 'verbatim',
      // One of the five disclosure situations, in Katy’s own words.
      text:
        'In all venues where the tribunal requires disclosure the attorney must insure that ' +
        'such disclosure is made.  Some tribunals require every filing to state “No ' +
        'generative AI was used” when this is the case.  In the case that it was then there ' +
        'may be a requirement to state “AI was used and all output was verified”.  Attorney ' +
        'is responsible for ensuring compliance with this requirement.',
      sourceLine: 395,
    },
  },
  {
    id: 'p33-disclosure-situations',
    clause: 'P33',
    // Katy's own trigger: billing for AI, or substantive drafting.
    when: {
      any: [
        { key: 'bill_ai_costs', is: 'yes' },
        { key: 'drafting_uses', includesAny: ['substantive'] },
      ],
    },
    text: {
      kind: 'todo',
      reason:
        'G-B3 — Katy wrote "required if [research the situations]". THE SITUATIONS LIST ' +
        'IS UNWRITTEN and is one of the live v1 gaps. Line 391-395 above is the ' +
        'reasoning it must be derived from.',
      sourceLine: 330,
    },
  },
  {
    id: 'p27-client-use-of-ai',
    clause: 'P27',
    when: { key: 'client_ai', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Katy wrote an instruction, not a clause. Slot-filled from the ' +
        'client_ai_approach longtext, which may carry the NOT_DECIDED_YET sentinel — ' +
        'that case gets prepared template text rather than the firm\'s words.',
      sourceLine: 318,
    },
  },
  {
    id: 'client-use-of-ai-stance',
    clause: 'Part 2 — POLICY REGARDING CLIENT USE OF AI',
    when: { key: 'client_ai', is: 'yes' },
    text: {
      kind: 'todo',
      reason:
        'Katy wrote a directive to the firm ("Determine how the firm wishes to address ' +
        'the clients use of AI"), not policy text. G-Q4 would add the tone/stance ' +
        'question behind it.',
      sourceLine: 403,
    },
  },
  {
    id: 'give-examples',
    clause: 'Part 2 — Give examples',
    text: {
      kind: 'verbatim',
      text:
        'Give examples:  OK to ask in chat “What is correct mailing address for this ' +
        'matter”  “what is filing fee for this form?”',
      sourceLine: 417,
    },
  },
]
