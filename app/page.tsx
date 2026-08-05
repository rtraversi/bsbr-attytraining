import type { Metadata } from "next";
import { SiteHeader } from "@/app/_components/site-header";
import { HeroSection } from "@/app/_components/hero-section";
import { OvertureSection } from "@/app/_components/overture-section";
import { StandardSection } from "@/app/_components/standard-section";
import { ExposureSection } from "@/app/_components/exposure-section";
import { RecordSection } from "@/app/_components/record-section";
import { IncludedSection } from "@/app/_components/included-section";
import { ClosingCta } from "@/app/_components/closing-cta";
import { Footer } from "@/app/_components/footer";

export const metadata: Metadata = {
  title: "Iurix Accreditation — the standard other firms will be held to",
  description:
    "AI governance for small law firms: a written policy, staff training, and signed attestations. $35 per seat, per year — and the accreditation belongs to your firm.",
};

// Four sections, following Katy's copy in her order: the solution, exposure,
// the record, the details. The standalone "Why Rule 5.3 just changed" section
// was removed on 2026-08-04 — the rule is background, not the pitch, and it now
// appears once, in the specification fine print of the details section.
export default function HomePage() {
  return (
    <div className="bg-marble">
      <SiteHeader />
      <main>
        <HeroSection />
        <OvertureSection />
        <StandardSection />
        <ExposureSection />
        <RecordSection />
        <IncludedSection />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
