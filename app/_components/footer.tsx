import Link from "next/link";
import { IurixLockup } from "./iurix-lockup";

// Shared by the homepage, /pricing and the legal pages, so it has to read on a
// marketing page and on a long-form document. Marble ground, hairline rules.
//
// The legal links are grouped under a heading because the set is in flux:
// four at launch, five once /accessibility lands, three if the DPA is retired
// (03-copy.md). A column reads fine at any of those counts.
const LEGAL_LINKS: { label: string; href: string }[] = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Data Processing Addendum", href: "/dpa" },
];

const SITE_LINKS: { label: string; href: string }[] = [
  { label: "The standard", href: "/#standard" },
  { label: "Your exposure", href: "/#exposure" },
  { label: "What's included", href: "/#included" },
  { label: "Pricing", href: "/pricing" },
  { label: "Sign in", href: "/login" },
];

export function Footer() {
  return (
    <footer className="border-t border-mint-line bg-marble px-6 py-16 text-ink md:px-8">
      <div className="mx-auto max-w-[1140px]">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand block */}
          <div>
            <IurixLockup />
            <p className="mt-5 text-[15px] text-ink-soft">iurixaccreditation.com</p>
            {/* Contact address decided 2026-08-03 (Rob): info@iurixaccreditation.com,
                a Zoho alias on the domain. The PHONE placeholder is still a genuine
                TBD — it lands when the Twilio voicemail line is provisioned
                (.planning/BACKLOG.md item 7). Do not invent a number. */}
            <p className="mt-1 text-[15px]">
              <a
                href="mailto:info@iurixaccreditation.com"
                className="text-ink-soft underline decoration-mint-line underline-offset-4 transition-colors hover:text-teal-mid"
              >
                info@iurixaccreditation.com
              </a>
              <span className="text-ink-mute"> · [PHONE — TBD]</span>
            </p>
          </div>

          <nav aria-label="Site">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-mute">
              Site
            </h2>
            <ul className="mt-4 space-y-2.5">
              {SITE_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[15px] text-ink-soft transition-colors hover:text-teal-mid"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-mute">
              Legal
            </h2>
            <ul className="mt-4 space-y-2.5">
              {LEGAL_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[15px] text-ink-soft transition-colors hover:text-teal-mid"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Disclaimer — reproduced verbatim from 03-copy.md. It is load-bearing:
            it is the sentence that keeps the marketing copy's use of
            "accreditation" from reading as a bar-accreditation claim. Do not
            shorten it, and do not drop it below 12px. */}
        <div className="mt-14 border-t border-steel pt-8">
          <p className="max-w-3xl text-[13px] leading-relaxed text-ink-soft">
            Iurix Accreditation provides educational training and certification of
            completion for law firm staff. It is not a law firm, does not provide legal
            advice, and its certificates are not CLE-accredited and do not constitute bar
            accreditation or a guarantee of compliance. Attorneys remain responsible for
            their own professional obligations under applicable rules of professional
            conduct.
          </p>
          <p className="mt-6 text-[13px] text-ink-mute">
            © {new Date().getFullYear()} BSBR Holdings, LLC d/b/a Iurix. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
