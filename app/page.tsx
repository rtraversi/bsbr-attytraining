import { SiteHeader } from "@/app/_components/site-header";
import { HeroSection } from "@/app/_components/hero-section";
import { OvertureSection } from "@/app/_components/overture-section";
import { StandardSection } from "@/app/_components/standard-section";
import { ExposureSection } from "@/app/_components/exposure-section";
import { RecordSection } from "@/app/_components/record-section";
import { IncludedSection } from "@/app/_components/included-section";
import { ClosingCta } from "@/app/_components/closing-cta";
import { Footer } from "@/app/_components/footer";
import { HitBeacon } from "@/app/_components/hit-beacon";

// No metadata export here on purpose. This page used to set its own title and
// description, which silently beat the root layout for the two plain tags while
// og:/twitter: still came from the layout — so one URL shipped three different
// strings: a "the standard other firms will be held to" browser tab, a "$35 per
// seat" search snippet, and a third headline on the share card. The root layout
// in app/layout.tsx is now the single source for both, and adding a title or
// description back here re-splits them.

// Four sections, following Katy's copy in her order: the solution, exposure,
// the record, the details. The standalone "Why Rule 5.3 just changed" section
// was removed on 2026-08-04 — the rule is background, not the pitch, and it now
// appears once, in the specification fine print of the details section.
export default function HomePage() {
  return (
    <div className="bg-marble">
      {/* Renders nothing; counts ?v=1 vs ?v=2 opens for Katy. */}
      <HitBeacon />
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
