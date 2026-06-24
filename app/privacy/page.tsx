import { Footer } from '@/app/_components/footer'

export const metadata = {
  title: 'Privacy Policy — AI Staff Compliance Training',
}

export default function PrivacyPage() {
  return (
    <>
      <main className="min-h-screen bg-zinc-950 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Built Smart by Rob</p>
          <h1 className="text-3xl text-white mb-2" style={{ fontFamily: 'var(--font-gyrotrope)' }}>
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-500 mb-12">Last updated: [DATE] — [ATTORNEY TO COMPLETE]</p>

          <div className="space-y-10 text-sm text-zinc-400 leading-relaxed">
            <Section title="1. Data We Collect">
              <p>[ATTORNEY TO COMPLETE — describe the categories of personal data collected from firm
              administrators and staff members, including: name, email address, employer/firm name,
              training completion records, quiz scores, certificate issuance dates, payment information
              processed via Stripe, and IP address/user-agent collected at quiz submission.]</p>
            </Section>

            <Section title="2. How We Use Your Data">
              <p>[ATTORNEY TO COMPLETE — describe how collected data is used, including: provisioning
              firm accounts, sending invitations, delivering training and certification services,
              generating compliance certificates, processing payments, sending transactional emails
              (invitations, certificates, reminders), and fulfilling operator obligations under
              ABA Model Rule 5.3.]</p>
            </Section>

            <Section title="3. Data Retention">
              <p>[ATTORNEY TO COMPLETE — describe retention periods. Note: Per AUDIT-03 requirements,
              certificate records and associated training evidence are retained for a minimum of
              7 years following certificate issuance to support attorney compliance documentation
              obligations. Payment records are retained as required by applicable tax law.]</p>
            </Section>

            <Section title="4. Data Sharing and Sub-Processors">
              <p>[ATTORNEY TO COMPLETE — list sub-processors and the data shared with each, including:
              Supabase (database and authentication), Stripe (payment processing), Resend (transactional
              email delivery), Cloudflare (infrastructure and Workers), and Articulate (course content
              hosting if applicable). Confirm that no personal data is sold to third parties.]</p>
            </Section>

            <Section title="5. Your Rights">
              <p>[ATTORNEY TO COMPLETE — describe data subject rights applicable under relevant law
              (e.g., CCPA for California residents), including the right to access, correct, or delete
              personal data, and how to exercise those rights. Provide contact information.]</p>
            </Section>

            <Section title="6. Security">
              <p>[ATTORNEY TO COMPLETE — describe security measures in place, including encryption in
              transit (TLS), encryption at rest, access controls, and any relevant certifications or
              audit practices.]</p>
            </Section>

            <Section title="7. Contact">
              <p>[ATTORNEY TO COMPLETE — provide a contact name, email address, and mailing address
              for privacy-related inquiries and data subject requests.]</p>
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
