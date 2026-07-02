import { SiteHeader } from "@/app/_components/site-header";
import { HeroSection } from "@/app/_components/hero-section";
import { CurrentStateSection } from "@/app/_components/current-state-section";
import { Footer } from "@/app/_components/footer";
import { CustomCursor } from "@/app/_components/custom-cursor";

export default function HomePage() {
  return (
    <div className="bg-black">
      <CustomCursor />
      <SiteHeader />
      <main>
        <HeroSection />
        <CurrentStateSection />
      </main>
      <Footer />
    </div>
  );
}
