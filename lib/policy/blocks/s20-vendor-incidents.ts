// §20 Vendor Incidents — POLICY-ENGINE-MAP.md §11.2
//
// Source: P29. One of the four Part 1 topics with no Part 2 heading.
//
// ⚠️ vendor_incident_protocol = 'no' is the GAP KATY SAID TO FLAG RATHER THAN
// PAPER OVER (map §2.4). The assembler must not invent a protocol for a firm
// that has none; it names the staff member and the gap goes to review.

import type { Block } from '@/lib/policy/types'

export const SECTION_20_BLOCKS: readonly Block[] = [
  {
    id: 'p29-vendor-breach',
    clause: 'P29',
    text: {
      kind: 'todo',
      reason:
        'Source text EXISTS at this line and needs transcription only. Carries a slot, ' +
        '"[STAFF IDENTIFIED IN INTAKE]", filled from vendor_security_contact — which is ' +
        'a `sensitive` question and lands in intake_sensitive, not intake_answers.',
      sourceLine: 322,
    },
  },
]
