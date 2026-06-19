import { Clock, FileText, Scale } from 'lucide-react'

const FEATURES = [
  {
    Icon: Clock,
    title: 'Rapid Deployment',
    description:
      "Ensure full firm compliance in under an hour. Our streamlined modules respect your team's billable time.",
  },
  {
    Icon: FileText,
    title: 'Automated Records',
    description:
      'No more manual tracking. Certificates are generated instantly and stored securely for audit readiness.',
  },
  {
    Icon: Scale,
    title: 'Legal Accuracy',
    description:
      'Content meticulously curated to align with ABA Model Rule 5.3 standards and contemporary best practices.',
  },
]

export function FeaturesSection() {
  return (
    <>
      {/* Section 2 — Features */}
      <section className="bg-white py-24 px-6 md:px-[80px]" id="how-it-works">
        <div className="max-w-[1280px] mx-auto">

          {/* Three feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map(({ Icon, title, description }) => (
              <div
                key={title}
                className="glass-card group p-8 rounded-xl hover:bg-[#efeded] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-[#ffdcc6] flex items-center justify-center text-[#8e4a0d] mb-6">
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <h3 className="font-host-grotesk text-2xl font-medium text-[#1b1c1c] mb-2">
                  {title}
                </h3>
                <p className="font-host-grotesk text-base text-[#544439] leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>

          {/* Bento row */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-8">

            {/* "Designed for the Modern Law Firm" — 8 columns */}
            <div className="md:col-span-8 glass-card p-10 rounded-2xl relative overflow-hidden h-[400px] flex flex-col justify-end"
              style={{
                background: 'linear-gradient(135deg, #f0e8df 0%, #e4d8ce 40%, #d4c4b5 100%)',
              }}
            >
              {/* Subtle warm overlay for depth */}
              <div className="absolute inset-0 bg-white/30" />
              <div className="relative z-10">
                <span className="font-host-grotesk text-xs font-bold uppercase tracking-[0.08em] text-[#8e4a0d] mb-2 block">
                  Our Methodology
                </span>
                <h2 className="font-host-grotesk text-4xl md:text-5xl font-bold leading-tight text-[#1b1c1c] max-w-lg mb-4">
                  Designed for the Modern Law Firm.
                </h2>
                <p className="font-host-grotesk text-lg text-[#544439] max-w-xl leading-relaxed">
                  We understand that compliance isn&apos;t just about rules; it&apos;s about culture. Built Smart
                  by Rob bridges the gap between complex legal mandates and practical daily operations.
                </p>
              </div>
            </div>

            {/* 100% stat card — 4 columns */}
            <div className="md:col-span-4 bg-[#ffdcc6] rounded-2xl p-10 flex flex-col justify-center glass-card">
              <div className="mb-6">
                <div className="font-host-grotesk text-6xl font-bold text-[#1b1c1c] mb-2">100%</div>
                <div className="font-host-grotesk text-xs font-bold uppercase tracking-[0.08em] text-[#1b1c1c]/80">
                  Audit Success Rate
                </div>
              </div>
              <p className="font-host-grotesk text-base text-[#1b1c1c]/80 leading-relaxed">
                Our clients have consistently passed professional responsibility audits with our
                training documentation as their primary compliance proof.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#d9c2b4]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-[80px] py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-host-grotesk text-xl font-bold text-[#1b1c1c]">
            Built Smart by Rob
          </div>
          <div className="flex gap-6">
            <a
              href="#"
              className="font-host-grotesk text-xs font-bold uppercase tracking-[0.06em] text-[#474746] underline hover:text-[#8e4a0d] transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="font-host-grotesk text-xs font-bold uppercase tracking-[0.06em] text-[#474746] underline hover:text-[#8e4a0d] transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="font-host-grotesk text-xs font-bold uppercase tracking-[0.06em] text-[#474746] underline hover:text-[#8e4a0d] transition-colors"
            >
              Contact
            </a>
          </div>
          <p className="font-host-grotesk text-xs text-[#474746]/60">
            © 2026 Built Smart by Rob. Legal Compliance Training.
          </p>
        </div>
      </footer>
    </>
  )
}
