import { Footer } from '@/app/_components/footer'

export const metadata = {
  title: 'Terms of Service — AI Staff Compliance Training',
}

export default function TermsPage() {
  return (
    <>
      <main className="min-h-screen bg-zinc-950 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Built Smart by Rob</p>
          <h1 className="text-3xl text-white mb-2" style={{ fontFamily: 'var(--font-gyrotrope)' }}>
            Terms of Service
          </h1>
          <p className="text-sm text-zinc-500 mb-12">Last updated: [DATE] — [ATTORNEY TO COMPLETE]</p>

          <div className="space-y-10 text-sm text-zinc-400 leading-relaxed">
            <Section title="1. Acceptance of Terms">
              <p>[ATTORNEY TO COMPLETE — describe how acceptance occurs (e.g., by completing purchase
              or accessing the platform), and who may accept (authorized representatives of law firms
              and their designated staff). Note any age or jurisdictional restrictions.]</p>
            </Section>

            <Section title="2. Description of Service">
              <p>[ATTORNEY TO COMPLETE — describe the service: a web-based AI compliance training
              platform that provides interactive course content, a scored certification quiz, and
              downloadable compliance certificates for law firm staff. Note that the certificate
              documents training completion and does not constitute ABA accreditation or legal advice.]</p>
            </Section>

            <Section title="3. Subscription and Fees">
              <p>[ATTORNEY TO COMPLETE — describe the annual per-seat subscription model, volume
              pricing tiers ($35/user for 1–9 seats, $32/user for 10–24 seats, $28/user for 25+ seats),
              automatic renewal terms, and what happens on non-renewal or lapse.]</p>
            </Section>

            <Section title="4. Refund Policy">
              <p>
                Refunds are available within 14 days of purchase <strong className="text-zinc-300">and</strong> only
                if no certificate has yet been issued. Once any certificate is issued, the purchase is
                non-refundable.
              </p>
              <p className="mt-2">[ATTORNEY TO COMPLETE — add any additional refund procedures, how
              to request a refund, and contact information for refund requests.]</p>
            </Section>

            <Section title="5. Acceptable Use">
              <p>[ATTORNEY TO COMPLETE — describe permitted uses (staff completing training, firm
              administrators managing their account) and prohibited uses (sharing accounts, reverse
              engineering, using the platform for purposes other than compliance training).]</p>
            </Section>

            <Section title="6. Intellectual Property">
              <p>[ATTORNEY TO COMPLETE — describe ownership of course content, quiz questions, and
              certificate designs. Confirm that the firm&apos;s compliance records (certificates, audit logs)
              belong to the firm. Describe any license granted to users to access the content.]</p>
            </Section>

            <Section title="7. Disclaimer of Warranties">
              <p>[ATTORNEY TO COMPLETE — standard SaaS disclaimer that the service is provided
              &quot;as is,&quot; without warranties of fitness for a particular purpose. Note that the platform
              does not provide legal advice, and that each attorney remains personally responsible
              for their compliance obligations.]</p>
            </Section>

            <Section title="8. Limitation of Liability">
              <p>[ATTORNEY TO COMPLETE — cap on liability (e.g., limited to fees paid in the prior
              12 months), exclusion of consequential damages, and applicable governing law and
              dispute resolution.]</p>
            </Section>

            <Section title="9. Contact">
              <p>[ATTORNEY TO COMPLETE — contact information for legal notices and questions about
              these Terms.]</p>
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
