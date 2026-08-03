import Link from "next/link";
import { SectionHead } from "./section-head";

// Section 05 — Katy's "The Details".
//
// PRICING IS LOAD-BEARING. These three bands mirror the live Stripe Price
// (price_1ThbLNCzT2268ei9nkadS8kD, tiers_mode=volume) and the rate maths in
// app/pricing/_components/pricing-slider.tsx. Katy's draft says a flat $39 and
// then a flat $35; both contradict what the checkout actually charges, so the
// live bands win (Rob, 2026-08-03). If the price changes, it changes in Stripe
// FIRST, then here and in the slider — never here alone.
//
// This is VOLUME pricing: all seats bill at the band the headcount lands in.
// 12 seats = 12 × $32, never 9 × $35 + 3 × $32.
const BANDS = [
  { label: "Solo & boutique", range: "1–9 staff", rate: 35, featured: true },
  { label: "Small firm", range: "10–24 staff", rate: 32, featured: false },
  { label: "Growing firm", range: "25+ staff", rate: 28, featured: false },
];

// Identical for every band — 03-copy.md is explicit that there is no feature
// differentiation between tiers, so the list is rendered ONCE rather than
// repeated inside each card, where it would read as a packaging difference.
//
// The tailored policy, the website token, the monitoring feed and the
// members-only decisions page are advertised ahead of being built, on Rob's
// 2026-08-03 decision. They are a committed backlog, not shipped features.
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
    <section
      id="included"
      className="scroll-mt-20 border-b border-mint-line py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1140px] px-6 md:px-8">
        <SectionHead
          num="05"
          heading="The details"
          intro="Iurix is built for small firms that don't have the resources to build formal AI governance in-house — no compliance officer, no risk committee, just attorneys and staff trying to use AI responsibly without a roadmap."
        />

        <p className="mb-12 max-w-[760px] text-[18px] leading-[1.6] text-ink-soft">
          Every staff member is trained and certified on a per-seat basis — but{" "}
          <strong className="font-semibold text-ink">
            the accreditation belongs to the firm
          </strong>
          . Once your team is enrolled, it&apos;s your firm that&apos;s Iurix Accredited,
          not just the individuals who completed training.
        </p>

        <div className="grid gap-5 md:grid-cols-3">
          {BANDS.map((b) => (
            <div
              key={b.range}
              className={`relative flex flex-col border px-8 py-9 transition-colors ${
                b.featured
                  ? "border-gold bg-gradient-to-b from-white to-marble-deep"
                  : "border-mint-line bg-white hover:border-teal-mid"
              }`}
            >
              {b.featured && (
                <span className="absolute -top-2.5 left-7 bg-gold-deep px-3 py-0.5 text-[10px] uppercase tracking-[0.2em] text-marble">
                  Most firms
                </span>
              )}
              <p className="mb-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-mute">
                {b.label}
              </p>
              <p className="font-gyrotrope text-[52px] font-normal leading-none tracking-[-0.02em] text-ink">
                ${b.rate}
                <small className="ml-1 font-sans text-[15px] font-normal tracking-normal text-ink-mute">
                  / staff / year
                </small>
              </p>
              <p className="mt-4 text-[15px] text-ink-soft">{b.range}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-[760px] text-[15px] text-ink-mute">
          Volume pricing, not tiers — every seat bills at the band your headcount lands
          in. A 12-seat firm pays 12 × $32. The rate stays flat when you renew.
        </p>

        {/* One list, all bands */}
        <div className="mt-14 border border-mint-line bg-white px-8 py-9 md:px-10">
          <h3 className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-ink-mute">
            What&apos;s included — in every band
          </h3>
          <ul className="grid gap-x-12 md:grid-cols-2">
            {INCLUDED.map((item) => (
              <li
                key={item}
                className="flex gap-3.5 border-b border-dashed border-mint-line py-4 text-[16px] text-ink-soft last:border-b-0 md:[&:nth-last-child(2)]:border-b-0"
              >
                <span
                  className="mt-[0.55em] h-[5px] w-[5px] flex-none rotate-45 bg-gold"
                  aria-hidden
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/pricing"
              className="rounded-[1px] bg-teal-deep px-6 py-3 text-[15px] font-medium text-marble transition-colors hover:bg-ink"
            >
              Get started
            </Link>
            <p className="text-[14px] text-ink-mute">
              Billed annually per enrolled staff member. Certificates are valid for 12
              months.
            </p>
          </div>
        </div>

        <p className="font-gyrotrope mt-14 text-[clamp(20px,2.4vw,26px)] leading-[1.4] text-ink">
          Built by an attorney. Reviewed by an attorney.{" "}
          <em className="font-serif-italic not-italic text-teal-mid">
            Held to the standard attorneys should meet.
          </em>
        </p>
      </div>
    </section>
  );
}
