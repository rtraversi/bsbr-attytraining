import { LegalPage, LegalSection } from '@/app/_components/legal-page'

export const metadata = {
  title: 'Terms of Service — Iurix Accreditation',
}

// Content is unchanged — still the attorney-review drafts. Only the container
// moved to the shared light template. When the real copy lands, sections 7 and 8
// arrive as all-caps conspicuousness blocks: wrap those in <LegalDisclaimer>.
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="Last updated: [DATE] — [ATTORNEY TO COMPLETE]"
    >
      <LegalSection title="1. Acceptance of Terms">
        <p>[ATTORNEY TO COMPLETE — describe how acceptance occurs (e.g., by completing purchase
        or accessing the platform), and who may accept (authorized representatives of law firms
        and their designated staff). Note any age or jurisdictional restrictions.]</p>
      </LegalSection>

      <LegalSection title="2. Description of Service">
        <p>[ATTORNEY TO COMPLETE — describe the service: a web-based AI compliance training
        platform that provides interactive course content, a scored certification quiz, and
        downloadable compliance certificates for law firm staff. Note that the certificate
        documents training completion and does not constitute ABA accreditation or legal advice.]</p>
      </LegalSection>

      <LegalSection title="3. Subscription and Fees">
        <p>[ATTORNEY TO COMPLETE — describe the annual per-seat subscription model, volume
        pricing tiers ($35/user for 1–9 seats, $32/user for 10–24 seats, $28/user for 25+ seats),
        automatic renewal terms, and what happens on non-renewal or lapse.]</p>
      </LegalSection>

      <LegalSection title="4. Refund Policy">
        <p>
          Refunds are available within 14 days of purchase <strong className="font-semibold text-ink">and</strong> only
          if no certificate has yet been issued. Once any certificate is issued, the purchase is
          non-refundable.
        </p>
        <p>[ATTORNEY TO COMPLETE — add any additional refund procedures, how
        to request a refund, and contact information for refund requests.]</p>
      </LegalSection>

      <LegalSection title="5. Acceptable Use">
        <p>[ATTORNEY TO COMPLETE — describe permitted uses (staff completing training, firm
        administrators managing their account) and prohibited uses (sharing accounts, reverse
        engineering, using the platform for purposes other than compliance training).]</p>
      </LegalSection>

      <LegalSection title="6. Intellectual Property">
        <p>[ATTORNEY TO COMPLETE — describe ownership of course content, quiz questions, and
        certificate designs. Confirm that the firm&apos;s compliance records (certificates, audit logs)
        belong to the firm. Describe any license granted to users to access the content.]</p>
      </LegalSection>

      <LegalSection title="7. Disclaimer of Warranties">
        <p>[ATTORNEY TO COMPLETE — standard SaaS disclaimer that the service is provided
        &quot;as is,&quot; without warranties of fitness for a particular purpose. Note that the platform
        does not provide legal advice, and that each attorney remains personally responsible
        for their compliance obligations.]</p>
      </LegalSection>

      <LegalSection title="8. Limitation of Liability">
        <p>[ATTORNEY TO COMPLETE — cap on liability (e.g., limited to fees paid in the prior
        12 months), exclusion of consequential damages, and applicable governing law and
        dispute resolution.]</p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>[ATTORNEY TO COMPLETE — contact information for legal notices and questions about
        these Terms.]</p>
        <p>Current contact: [CONTACT EMAIL — TBD]</p>
      </LegalSection>
    </LegalPage>
  )
}
