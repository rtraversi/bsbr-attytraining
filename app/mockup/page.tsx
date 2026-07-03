import type { CSSProperties } from "react"
import { SiteHeader } from "@/app/mockup/_components/site-header"
import { Hero } from "@/app/mockup/_components/hero"
import { TrustBar } from "@/app/mockup/_components/trust-bar"
import { Features } from "@/app/mockup/_components/features"
import { WhySection } from "@/app/mockup/_components/why-section"
import { Pricing } from "@/app/mockup/_components/pricing"
import { SiteFooter } from "@/app/mockup/_components/site-footer"

export const metadata = {
  title: "Mockup — light concept",
}

const lightPaletteStyle = {
  "--background": "oklch(0.985 0.003 250)",
  "--foreground": "oklch(0.24 0.03 265)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.24 0.03 265)",
  "--primary": "oklch(0.55 0.2 258)",
  "--primary-foreground": "oklch(0.99 0.005 250)",
  "--secondary": "oklch(0.95 0.01 255)",
  "--secondary-foreground": "oklch(0.3 0.04 265)",
  "--muted": "oklch(0.955 0.008 255)",
  "--muted-foreground": "oklch(0.52 0.025 262)",
  "--accent": "oklch(0.93 0.03 255)",
  "--accent-foreground": "oklch(0.3 0.05 262)",
  "--border": "oklch(0.9 0.012 258)",
  "--input": "oklch(0.9 0.012 258)",
  "--ring": "oklch(0.55 0.2 258)",
  colorScheme: "light",
} as CSSProperties

export default function MockupPage() {
  return (
    <div
      className="bg-background text-foreground flex min-h-screen flex-col"
      style={lightPaletteStyle}
    >
      <style>{`
        .reveal { opacity: 0; transform: translateY(16px); transition: opacity .6s ease, transform .6s ease; }
        .reveal.is-visible { opacity: 1; transform: translateY(0); }
        @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } }
      `}</style>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <Features />
        <WhySection />
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  )
}
