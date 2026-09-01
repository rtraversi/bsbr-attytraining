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
      kind: 'verbatim',
      // The opening brace of “{STAFF IDENTIFIED IN INTAKE]” is Katy’s — the
      // source reads `{STAFF IDENTIFIED IN INTAKE\]`. Kept so the transcription
      // is exact and the slot placeholder matches a real substring.
      // “If  a vendor” carries her double space. Left alone.
      // ⚠️ vendor_security_contact is a `sensitive` question and lands in
      // intake_sensitive, not intake_answers — so this slot only fills where
      // the caller has merged the sensitive answers in.
      text:
        'VENDOR BREACH;  If  a vendor advises that there is a breach then {STAFF IDENTIFIED ' +
        'IN INTAKE] shall be notified of the breach immediately to take action',
      sourceLine: 322,
      slots: [{ placeholder: '{STAFF IDENTIFIED IN INTAKE]', key: 'vendor_security_contact' }],
    },
  },
]
