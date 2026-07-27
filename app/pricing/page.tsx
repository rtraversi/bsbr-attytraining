import type { Metadata } from "next";
import { SiteHeader } from "@/app/_components/site-header";
import { Footer } from "@/app/_components/footer";
import { CustomCursor } from "@/app/_components/custom-cursor";
import { PricingSlider } from "./_components/pricing-slider";

export const metadata: Metadata = {
  title: "Pricing — IURIX",
  description:
    "One annual fee per staff member. Volume pricing from $28/user. Flat on renewal.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <CustomCursor />
      <SiteHeader />
      <main className="mx-auto max-w-[1200px] px-6 pb-28 pt-40 md:px-10">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="font-headline mb-5 text-sm uppercase tracking-[0.28em] text-white/50">
            Pricing
          </p>
          <h1 className="font-headline text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[0.98] tracking-tight">
            One fee.{" "}
            <span className="font-serif-italic font-normal">Every</span> staff member
            certified.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-white/60">
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
