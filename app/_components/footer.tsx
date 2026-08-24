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
    <footer className="border-t border-silver bg-marble px-6 py-16 text-ink md:px-8">
      <div className="mx-auto max-w-[1140px]">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand block */}
          <div>
            {/* The lockup scales as one unit off font-size. The header sits at
                clamp(1.9rem, 4.5vw, 2.5rem); the 1.25rem default put the footer
                mark at 40px against the header's ~67px, which read as a second,
                smaller logo rather than the same one. 1.75rem keeps it in the
                same family while staying subordinate to the header. */}
            <IurixLockup style={{ fontSize: "1.75rem" }} />
            <p className="mt-5 text-[15px] text-ink-soft">iurixaccreditation.com</p>
            {/* Contact address decided 2026-08-03 (Rob): info@iurixaccreditation.com,
                a Zoho alias on the domain.

                The phone number is deliberately ABSENT rather than shown as a
                "[PHONE — TBD]" placeholder: this ships to the live site, and a
                visible placeholder on a compliance product's footer reads as an
                unfinished page to exactly the buyer we are trying to reassure.
                Add the number here once the Twilio voicemail line is provisioned
                (.planning/BACKLOG.md item 7). Do not invent one. */}
            <p className="mt-1 text-[15px]">
              <a
                href="mailto:info@iurixaccreditation.com"
                className="text-ink-soft underline decoration-silver underline-offset-4 transition-colors hover:text-teal-mid"
              >
                info@iurixaccreditation.com
              </a>
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

        {/* Disclaimer — Katy's wording, 2026-08-24, reproduced verbatim. It
            supersedes the 03-copy.md text that stood here.
            ⚠️ Two clauses were DELETED by that rewrite and their removal was
            deliberate, not an oversight: "does not provide legal advice" and
            "do not constitute bar accreditation or a guarantee of compliance".
            The previous comment called the second one load-bearing — the
            sentence that kept the marketing copy's use of "accreditation" from
            reading as a bar-accreditation claim. Katy is the reviewing attorney
            and made the call knowing that; the disclaiming work now sits in
            Terms §2 ("Certificates are not accreditation") and §11. Do not
            restore either clause here without going back to her.
            Do not shorten this, and do not drop it below 12px. */}
        <div className="mt-14 border-t border-steel/70 pt-8">
          <p className="max-w-3xl text-[13px] leading-relaxed text-ink-soft">
            Iurix Accreditation provides educational training and certification of
            completion for law firm staff. It is not a law firm, but all language is
            reviewed and written by an attorney. Training is for non-attorney staff and
            therefore does not qualify for attorney CLE credit. Attorneys remain
            responsible for their own professional obligations under applicable rules of
            professional conduct.
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
