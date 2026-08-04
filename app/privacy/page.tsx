import { LegalPage, LegalSection } from '@/app/_components/legal-page'

export const metadata = {
  title: 'Privacy Policy — Iurix Accreditation',
}

// Content unchanged (still attorney-review drafts); container moved to the
// shared light template. The address in section 7 used to be
// info@aistaffcompliance.com, a retired domain; it is now
// info@iurixaccreditation.com (decided by Rob, 2026-08-03).
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="Last updated: [DATE] — [ATTORNEY TO COMPLETE]"
    >
      <LegalSection title="1. Data We Collect">
        <p>[ATTORNEY TO COMPLETE — describe the categories of personal data collected from firm
        administrators and staff members, including: name, email address, employer/firm name,
        training completion records, quiz scores, certificate issuance dates, payment information
        processed via Stripe, and IP address/user-agent collected at quiz submission.]</p>
      </LegalSection>

      <LegalSection title="2. How We Use Your Data">
        <p>[ATTORNEY TO COMPLETE — describe how collected data is used, including: provisioning
        firm accounts, sending invitations, delivering training and certification services,
        generating compliance certificates, processing payments, sending transactional emails
        (invitations, certificates, reminders), and fulfilling operator obligations under
        ABA Model Rule 5.3.]</p>
      </LegalSection>

      <LegalSection title="3. Data Retention">
        <p>[ATTORNEY TO COMPLETE — describe retention periods. Note: Per AUDIT-03 requirements,
        certificate records and associated training evidence are retained for a minimum of
        7 years following certificate issuance to support attorney compliance documentation
        obligations. Payment records are retained as required by applicable tax law.]</p>
      </LegalSection>

      <LegalSection title="4. Data Sharing and Sub-Processors">
        <p>[ATTORNEY TO COMPLETE — list sub-processors and the data shared with each, including:
        Supabase (database and authentication), Stripe (payment processing), Resend (transactional
        email delivery), Cloudflare (infrastructure and Workers), and Articulate (course content
        hosting if applicable). Confirm that no personal data is sold to third parties.]</p>
      </LegalSection>

      <LegalSection title="5. Your Rights">
        <p>[ATTORNEY TO COMPLETE — describe data subject rights applicable under relevant law
        (e.g., CCPA for California residents), including the right to access, correct, or delete
        personal data, and how to exercise those rights. Provide contact information.]</p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>[ATTORNEY TO COMPLETE — describe security measures in place, including encryption in
        transit (TLS), encryption at rest, access controls, and any relevant certifications or
        audit practices.]</p>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>[ATTORNEY TO COMPLETE — provide a contact name, email address, and mailing address
        for privacy-related inquiries and data subject requests.]</p>
        <p>
          Current contact:{' '}
          <a
            href="mailto:info@iurixaccreditation.com"
            className="text-teal-mid underline underline-offset-4 hover:text-ink"
          >
            info@iurixaccreditation.com
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  )
}
