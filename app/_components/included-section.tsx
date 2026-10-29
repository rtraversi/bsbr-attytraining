import Link from "next/link";
import { SectionHead } from "./section-head";
import {
  CertificateIcon,
  MembersIcon,
  MonitoringIcon,
  PolicyIcon,
  TokenIcon,
  TrainingIcon,
} from "./homepage-icons";

// "The Details" — Katy's copy.
//
// PRICE. Katy's copy says "$35 per seat, per year" flat. The Stripe Price
// (tiers_mode=volume) is banded 35/32/28, and
// app/pricing/_components/pricing-slider.tsx hardcodes the same maths. Both are
//
// ⚠️ This comment used to name price_1ThbLNCzT2268ei9nkadS8kD. That object
// belongs to a RETIRED Stripe account and is not what the code charges against
// (CLAUDE.md, corrected 2026-08-03). No price ID is named here now on purpose —
// checkout resolves the Price by lookup key at runtime (lib/stripe-price.ts),
// so there is no ID in source to drift out of date. If you need the current
// one, read it from Stripe, not from a comment.
//
// satisfied by leading with $35 — the true rate for the 1–9 band, which is the
// whole target market (solo and small firms, 1–15 staff) — and stating the two
// lower bands underneath as what they are: a volume reduction, not a plan to
// upgrade to. Do NOT show a flat $35 with no mention of the bands; a 10-seat
// firm would be quoted $350 and charged $320.
const BANDS = [
  { range: "1–9 staff", rate: 35 },
  { range: "10–24 staff", rate: 32 },
  { range: "25+ staff", rate: 28 },
];

// Katy's full list. The tailored policy, the website token, the monitoring feed
// and the members-only decisions page are advertised ahead of being built, on
// Rob's 2026-08-03 decision to publish the whole programme and build to match.
//
// Since 2026-10-29 (Rob) each item has a line icon and its lead phrase in bold.
// The words are unchanged: lead + rest reads as Katy's original sentence.
const INCLUDED = [
  { Icon: PolicyIcon, lead: "A written policy", rest: ", tailored to your firm" },
  { Icon: TrainingIcon, lead: "Online, interactive training", rest: " for every non-attorney team member" },
  { Icon: CertificateIcon, lead: "Individual certifications", rest: " for each team member who completes training" },
  { Icon: TokenIcon, lead: "A yearly Iurix Accredited token", rest: " to display on your website" },
  { Icon: MonitoringIcon, lead: "Ongoing monitoring", rest: " of AI-related sanctions and bar guidance, with training updated as the rules evolve" },
  { Icon: MembersIcon, lead: "A members-only page", rest: " summarising every AI-related sanction decision" },
];

export function IncludedSection() {
  return (
    <section id="included" className="relative scroll-mt-20 border-b border-silver py-20 md:py-28">
      <i data-ribbon="0.02" style={{ top: "40%" }} aria-hidden />
      <i data-ribbon="0.02" style={{ top: "90%" }} aria-hidden />
      <div className="relative z-[2] mx-auto max-w-[1140px] px-6 md:px-8">
        <SectionHead
          num="IV"
          label="The details"
          heading="The details"
          intro="Iurix is built for small firms that don't have the resources to build formal AI governance in-house: no compliance officer, no risk committee, just attorneys and staff trying to use AI responsibly without a roadmap."
        />

        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* Price.
              A dark plate, not a bordered white card with a gradient — that was
              the one generic-SaaS object on an otherwise document-like page.
              teal-ink is the page's mark of authority (the seal, the rulings,
              this, the sign-off), and using it here makes the price the most
              emphatic object on the light half of the page, which is where the
              emphasis belongs on the section that has to convert. */}
          <div>
            <div className="relative overflow-hidden bg-teal-ink px-8 py-[34px] text-marble">
              <span
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(210,166,140,0.16),transparent_68%)]"
                aria-hidden
              />
              <div className="relative">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-gold-soft">
                  Per seat, per year
                </p>
                <p className="font-display mt-4 text-[64px] font-normal leading-none tracking-[-0.02em] text-marble">
                  $35
                </p>
                <p className="mt-3.5 text-[15px] leading-[1.6] text-mint">
                  Accessible without cutting corners.
                </p>

                <dl className="mt-[26px] border-t border-mint-line/30 pt-[18px] text-[14px]">
                  {BANDS.map((b) => (
                    <div
                      key={b.range}
                      className="flex justify-between py-1.5 text-mint"
                    >
                      <dt>{b.range}</dt>
                      <dd className="font-medium text-marble">${b.rate}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-[13px] leading-[1.55] text-silver">
                  The rate drops as your headcount grows: every seat bills at the band
                  you land in, and stays flat when you renew.
                </p>

                <Link
                  href="/pricing"
                  className="mt-[26px] block rounded-[7px] bg-marble px-6 py-3.5 text-center text-[15px] font-medium text-teal-ink transition-colors hover:bg-gold-pale"
                >
                  Accredit your firm
                </Link>
              </div>
            </div>
          </div>

          {/* What's included */}
          <div>
            <p className="mb-9 text-[18px] leading-[1.7] text-ink-soft">
              Every staff member is trained and certified on a per-seat basis, but{" "}
              <strong className="font-semibold text-ink">
                the accreditation belongs to the firm
              </strong>
              . Once your team is enrolled, it&apos;s your firm that&apos;s Iurix
              Accredited, not just the individuals who completed training.
            </p>

            <h3 className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.22em] text-gold-deep">
              What&apos;s included
            </h3>
            <ul className="mt-6 grid gap-7">
              {INCLUDED.map(({ Icon, lead, rest }) => (
                <li
                  key={lead}
                  className="grid grid-cols-[44px_1fr] items-start gap-5 text-[17px] leading-[1.55] text-ink-soft"
                >
                  <Icon className="-mt-1 h-11 w-11" />
                  <span>
                    <strong className="font-semibold text-ink">{lead}</strong>
                    {rest}
                  </span>
                </li>
              ))}
            </ul>

            {/* Fine print, and it names the firm's OWN policy as the standard — not a
                rule number. Rule 5.3 used to be named here as the thing the product was
                keyed to; that framing was corrected 2026-08-24 (Katy, via Max). The
                policy is the product; bar guidance is background the policy is drafted
                against. Do not put a rule citation back in this position. */}
            <p className="mt-7 text-[13px] leading-[1.6] text-ink-mute">
              Your firm&apos;s written policy is the standard your staff is trained and
              attested against. It is drafted against current ABA and state bar guidance on
              AI competence, confidentiality and supervision, and updated as that guidance
              moves.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
