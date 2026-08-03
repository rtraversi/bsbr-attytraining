import type { Metadata } from "next";
import { SiteHeader } from "@/app/_components/site-header";
import { HeroSection } from "@/app/_components/hero-section";
import { StandardSection } from "@/app/_components/standard-section";
import { ExposureSection } from "@/app/_components/exposure-section";
import { RecordSection } from "@/app/_components/record-section";
import { RuleSection } from "@/app/_components/rule-section";
import { IncludedSection } from "@/app/_components/included-section";
import { ClosingCta } from "@/app/_components/closing-cta";
import { Footer } from "@/app/_components/footer";

export const metadata: Metadata = {
  title: "Iurix Accreditation — the standard other firms will be held to",
  description:
    "A written AI policy, staff training, and signed attestations for small law firms. Documented Rule 5.3 supervision, from $28 per staff member per year.",
};

// The custom cursor from the retired dark design is deliberately not rendered
// here (04-tech-constraints.md treats it as removed).
export default function HomePage() {
  return (
    <div className="bg-marble">
      <SiteHeader />
      <main>
        <HeroSection />
        <StandardSection />
        <ExposureSection />
        <RecordSection />
        <RuleSection />
        <IncludedSection />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
