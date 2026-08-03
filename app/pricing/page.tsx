import type { Metadata } from "next";
import { SiteHeader } from "@/app/_components/site-header";
import { Footer } from "@/app/_components/footer";
import { PricingSlider } from "./_components/pricing-slider";

export const metadata: Metadata = {
  title: "Pricing — Iurix Accreditation",
  description:
    "One annual fee per staff member. Volume pricing from $28/user. Flat on renewal.",
};

// The header is sticky rather than fixed now, so this page no longer needs the
// large top padding that used to clear the old overlaid nav.
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-marble text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-[1140px] px-6 pb-24 pt-16 md:px-8 md:pt-20">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep">
            Pricing
          </p>
          <h1 className="font-gyrotrope text-[clamp(2.5rem,6vw,4.5rem)] font-normal leading-[1.02] tracking-[-0.02em]">
            One fee.{" "}
            <em className="font-serif-italic not-italic text-teal-mid">Every</em> staff
            member certified.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[18px] text-ink-soft">
            Pay once a year per staff member. The more of your team you certify, the
            lower the per-seat rate — and it stays flat when you renew.
          </p>
        </div>

        <PricingSlider />
      </main>
      <Footer />
    </div>
  );
}
