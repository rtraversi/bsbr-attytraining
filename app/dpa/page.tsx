import { LegalPage, LegalSection } from '@/app/_components/legal-page'

export const metadata = {
  title: 'Data Processing Addendum — Iurix Accreditation',
}

// Content unchanged (still attorney-review drafts); container moved to the
// shared light template. 01-brief.md notes this route may be retired — the
// footer's Legal column reads fine at three links if it is.
export default function DpaPage() {
  return (
    <LegalPage
      title="Data Processing Addendum"
      updated="Last updated: [DATE] — [ATTORNEY TO COMPLETE]"
    >
      <LegalSection title="1. Scope and Purpose">
        <p>[ATTORNEY TO COMPLETE — describe the scope of this DPA: it governs the processing
        of personal data by BSBR Holdings, LLC d/b/a Iurix (as data processor) on behalf of the subscribing
        law firm (as data controller) in connection with the Iurix platform.]</p>
      </LegalSection>

      <LegalSection title="2. Data Processor Obligations">
        <p>[ATTORNEY TO COMPLETE — describe processor obligations, including: processing
        personal data only on documented controller instructions, ensuring staff confidentiality,
        implementing appropriate technical and organizational security measures, assisting the
        controller with data subject rights requests, and notifying the controller of any
        personal data breach.]</p>
      </LegalSection>

      <LegalSection title="3. Categories of Personal Data Processed">
        <p>[ATTORNEY TO COMPLETE — enumerate the categories of personal data processed under
        this DPA, including: staff names, email addresses, training completion records, quiz
        scores, certificate issuance and expiry dates, IP addresses, and user-agent strings
        collected at quiz submission for identity attestation.]</p>
      </LegalSection>

      <LegalSection title="4. Sub-Processors">
        <p>[ATTORNEY TO COMPLETE — list all sub-processors authorized to process personal data
        in connection with the service, including: Supabase (Supabase Inc., database and
        authentication services), Stripe (Stripe Inc., payment processing), Resend (Resend Inc.,
        transactional email delivery), and Cloudflare (Cloudflare Inc., infrastructure, CDN,
        and serverless compute). Commit to notifying the controller of new sub-processors.]</p>
      </LegalSection>

      <LegalSection title="5. Data Subject Rights">
        <p>[ATTORNEY TO COMPLETE — describe how the processor will assist the controller in
        responding to data subject rights requests (access, rectification, erasure, restriction,
        portability), including timelines and the mechanism for submitting such requests.]</p>
      </LegalSection>

      <LegalSection title="6. Data Retention and Return">
        <p>[ATTORNEY TO COMPLETE — describe retention periods (minimum 7 years for certificate
        records per AUDIT-03) and the process for returning or deleting personal data upon
        termination of the agreement. Note that certain records may be retained longer as
        required by applicable law.]</p>
      </LegalSection>

      <LegalSection title="7. Security Measures">
        <p>[ATTORNEY TO COMPLETE — describe technical and organizational security measures
        (Article 32 GDPR / equivalent), including: encryption in transit (TLS 1.2+), encryption
        at rest, access controls, audit logging, and any applicable security certifications
        held by sub-processors.]</p>
      </LegalSection>

      <LegalSection title="8. Breach Notification">
        <p>[ATTORNEY TO COMPLETE — describe the processor&apos;s obligation to notify the controller
        of a personal data breach without undue delay (and within 72 hours where the controller
        is subject to GDPR or similar regulation), including the information to be included in
        such notification.]</p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>[ATTORNEY TO COMPLETE — provide contact details for the processor&apos;s data protection
        point of contact for DPA-related inquiries.]</p>
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
