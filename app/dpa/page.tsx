import { Footer } from '@/app/_components/footer'

export const metadata = {
  title: 'Data Processing Addendum — AI Staff Compliance Training',
}

export default function DpaPage() {
  return (
    <>
      <main className="min-h-screen bg-zinc-950 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Built Smart by Rob</p>
          <h1 className="text-3xl text-white mb-2" style={{ fontFamily: 'var(--font-gyrotrope)' }}>
            Data Processing Addendum
          </h1>
          <p className="text-sm text-zinc-500 mb-12">Last updated: [DATE] — [ATTORNEY TO COMPLETE]</p>

          <div className="space-y-10 text-sm text-zinc-400 leading-relaxed">
            <Section title="1. Scope and Purpose">
              <p>[ATTORNEY TO COMPLETE — describe the scope of this DPA: it governs the processing
              of personal data by Built Smart by Rob (as data processor) on behalf of the subscribing
              law firm (as data controller) in connection with the AI Staff Compliance Training
              platform.]</p>
            </Section>

            <Section title="2. Data Processor Obligations">
              <p>[ATTORNEY TO COMPLETE — describe processor obligations, including: processing
              personal data only on documented controller instructions, ensuring staff confidentiality,
              implementing appropriate technical and organizational security measures, assisting the
              controller with data subject rights requests, and notifying the controller of any
              personal data breach.]</p>
            </Section>

            <Section title="3. Categories of Personal Data Processed">
              <p>[ATTORNEY TO COMPLETE — enumerate the categories of personal data processed under
              this DPA, including: staff names, email addresses, training completion records, quiz
              scores, certificate issuance and expiry dates, IP addresses, and user-agent strings
              collected at quiz submission for identity attestation.]</p>
            </Section>

            <Section title="4. Sub-Processors">
              <p>[ATTORNEY TO COMPLETE — list all sub-processors authorized to process personal data
              in connection with the service, including: Supabase (Supabase Inc., database and
              authentication services), Stripe (Stripe Inc., payment processing), Resend (Resend Inc.,
              transactional email delivery), and Cloudflare (Cloudflare Inc., infrastructure, CDN,
              and serverless compute). Commit to notifying the controller of new sub-processors.]</p>
            </Section>

            <Section title="5. Data Subject Rights">
              <p>[ATTORNEY TO COMPLETE — describe how the processor will assist the controller in
              responding to data subject rights requests (access, rectification, erasure, restriction,
              portability), including timelines and the mechanism for submitting such requests.]</p>
            </Section>

            <Section title="6. Data Retention and Return">
              <p>[ATTORNEY TO COMPLETE — describe retention periods (minimum 7 years for certificate
              records per AUDIT-03) and the process for returning or deleting personal data upon
              termination of the agreement. Note that certain records may be retained longer as
              required by applicable law.]</p>
            </Section>

            <Section title="7. Security Measures">
              <p>[ATTORNEY TO COMPLETE — describe technical and organizational security measures
              (Article 32 GDPR / equivalent), including: encryption in transit (TLS 1.2+), encryption
              at rest, access controls, audit logging, and any applicable security certifications
              held by sub-processors.]</p>
            </Section>

            <Section title="8. Breach Notification">
              <p>[ATTORNEY TO COMPLETE — describe the processor&apos;s obligation to notify the controller
              of a personal data breach without undue delay (and within 72 hours where the controller
              is subject to GDPR or similar regulation), including the information to be included in
              such notification.]</p>
            </Section>

            <Section title="9. Contact">
              <p>[ATTORNEY TO COMPLETE — provide contact details for the processor&apos;s data protection
              point of contact for DPA-related inquiries.]</p>
              <p className="mt-2">
                Current contact:{' '}
                <a href="mailto:info@aistaffcompliance.com" className="text-teal-400 hover:text-teal-300 transition-colors">
                  info@aistaffcompliance.com
                </a>
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-200 mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
