import Link from "next/link";
import { SectionHead } from "./section-head";

// "The Details" — Katy's copy.
//
// PRICE. Katy's copy says "$35 per seat, per year" flat. The live Stripe Price
// (price_1ThbLNCzT2268ei9nkadS8kD, tiers_mode=volume) is banded 35/32/28, and
// app/pricing/_components/pricing-slider.tsx hardcodes the same maths. Both are
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
const INCLUDED = [
  "A written policy, tailored to your firm",
  "Online, interactive training for every non-attorney team member",
  "Individual certifications for each team member who completes training",
  "A yearly Iurix Accredited token to display on your website",
  "Ongoing monitoring of AI-related sanctions and bar guidance, with training updated as the rules evolve",
  "A members-only page summarising every AI-related sanction decision",
];

export function IncludedSection() {
  return (
    <section id="included" className="scroll-mt-20 border-b border-silver py-20 md:py-28">
      <div className="mx-auto max-w-[1140px] px-6 md:px-8">
        <SectionHead
          num="IV"
          heading="The details"
          intro="Iurix is built for small firms that don't have the resources to build formal AI governance in-house — no compliance officer, no risk committee, just attorneys and staff trying to use AI responsibly without a roadmap."
        />

        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          {/* Price */}
          <div>
            <div className="border border-silver bg-gradient-to-b from-white to-marble-deep px-8 py-9">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.22em] text-gold-deep">
                Per seat, per year
              </p>
              <p className="font-gyrotrope mt-4 text-[64px] font-normal leading-none tracking-[-0.02em] text-ink">
                $35
              </p>
              <p className="mt-4 text-[15px] leading-[1.6] text-ink-soft">
                Accessible without cutting corners.
              </p>

              <dl className="mt-7 border-t border-silver pt-5 text-[14px]">
                {BANDS.map((b) => (
                  <div
                    key={b.range}
                    className="flex justify-between py-1.5 text-ink-soft"
                  >
                    <dt>{b.range}</dt>
                    <dd className="font-medium text-ink">${b.rate}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-[13px] leading-[1.55] text-ink-mute">
                The rate drops as your headcount grows — every seat bills at the band you
                land in — and stays flat when you renew.
              </p>

              <Link
                href="/pricing"
                className="mt-7 block rounded-[2px] bg-teal-ink px-6 py-3.5 text-center text-[15px] font-medium text-marble transition-colors hover:bg-ink"
              >
                Accredit your firm
              </Link>
            </div>
          </div>

          {/* What's included */}
          <div>
            <p className="mb-9 text-[18px] leading-[1.7] text-ink-soft">
              Every staff member is trained and certified on a per-seat basis — but{" "}
              <strong className="font-semibold text-ink">
                the accreditation belongs to the firm
              </strong>
              . Once your team is enrolled, it&apos;s your firm that&apos;s Iurix
              Accredited, not just the individuals who completed training.
            </p>

            <h3 className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.22em] text-gold-deep">
              What&apos;s included
            </h3>
            <ul>
              {INCLUDED.map((item) => (
                <li
                  key={item}
                  className="flex gap-4 border-b border-silver py-4 text-[16px] leading-[1.6] text-ink-soft last:border-b-0"
                >
                  <span
                    className="mt-[0.62em] h-[4px] w-[4px] flex-none rotate-45 bg-gold"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* The one place the rule is named. It belongs in the fine print of the
                specification, not in a headline — the buyer is purchasing a standard,
                and this says which one it is keyed to. */}
            <p className="mt-7 text-[13px] leading-[1.6] text-ink-mute">
              The training and the policy template are aligned with ABA Model Rule 5.3 and
              Formal Opinion 512, and with state bar guidance on AI competence and
              confidentiality.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
