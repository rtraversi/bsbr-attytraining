import { LegalPage, LegalPlaceholder, LegalSection } from '@/app/_components/legal-page'

export const metadata = {
  title: 'Cookie Policy — IURIX',
}

/**
 * STRUCTURE ONLY — THIS PAGE HAS NO COPY AND MUST NOT SHIP.
 *
 * Deliberately not linked from any nav or footer. The route exists so the copy
 * has somewhere to land; every section below is an empty placeholder.
 *
 * Ownership: Max drafts the copy, Katy or Rob approves it before it ships.
 * Nothing here is legal language and nothing here is a draft — the markers are
 * loud on purpose so this cannot be mistaken for finished text or deployed by
 * accident. Match app/privacy/page.tsx once real copy lands.
 */
export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" updated="🚧 UNWRITTEN PAGE — NOT FOR DEPLOY 🚧">
      <LegalSection title="1. What Cookies Are">
        <Unwritten />
      </LegalSection>

      <LegalSection title="2. Cookies We Set">
        <Unwritten />
      </LegalSection>

      <LegalSection title="3. Third-Party Cookies">
        <Unwritten />
      </LegalSection>

      <LegalSection title="4. How Long Cookies Last">
        <Unwritten />
      </LegalSection>

      <LegalSection title="5. Managing and Disabling Cookies">
        <Unwritten />
      </LegalSection>

      <LegalSection title="6. Changes to This Policy">
        <Unwritten />
      </LegalSection>

      <LegalSection title="7. Contact">
        <Unwritten />
      </LegalSection>
    </LegalPage>
  )
}

function Unwritten() {
  return (
    <LegalPlaceholder>
      ▮▮▮ NO COPY WRITTEN ▮▮▮ Max to draft · Katy/Rob to approve · do not deploy
    </LegalPlaceholder>
  )
}
