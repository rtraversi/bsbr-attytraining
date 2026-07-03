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
  "--primary": "oklch(0.51 0.19 259)",
  "--primary-foreground": "oklch(0.99 0.005 250)",
  "--secondary": "oklch(0.95 0.01 255)",
  "--secondary-foreground": "oklch(0.3 0.04 265)",
  "--muted": "oklch(0.955 0.008 255)",
  "--muted-foreground": "oklch(0.52 0.025 262)",
  "--accent": "oklch(0.93 0.03 255)",
  "--accent-foreground": "oklch(0.3 0.05 262)",
  "--border": "oklch(0.9 0.012 258)",
  "--input": "oklch(0.9 0.012 258)",
  "--ring": "oklch(0.51 0.19 259)",
  colorScheme: "light",
} as CSSProperties

export default function MockupPage() {
  return (
    <div
      className="mk-root bg-background text-foreground flex min-h-screen flex-col"
      style={lightPaletteStyle}
    >
      <style>{`
        /* ---- Statute & Signal: scoped design system for /mockup ---- */
        .mk-root ::selection { background: color-mix(in oklch, var(--primary) 18%, transparent); }

        .mk-display { font-family: var(--font-host-grotesk), var(--font-sans), sans-serif; }
        .mk-serif-it { font-family: var(--font-instrument-serif), Georgia, serif; font-style: italic; font-weight: 400; }

        /* Scroll reveal */
        .reveal { opacity: 0; transform: translateY(16px); transition: opacity .6s ease, transform .6s ease; }
        .reveal.is-visible { opacity: 1; transform: translateY(0); }

        /* Hero ledger orchestration */
        @keyframes fadeRise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mkStamp {
          0% { opacity: 0; transform: scale(1.6); }
          60% { opacity: 1; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes mkFill { from { width: 0%; } to { width: 100%; } }
        .mk-fill { width: 0%; animation: mkFill 1.7s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards; }

        /* Corner ticks — appear on hover (cards) or always (frames) */
        .mk-corner { position: relative; }
        .mk-corner::before, .mk-corner::after {
          content: ""; position: absolute; width: 14px; height: 14px;
          border-color: color-mix(in oklch, var(--primary) 60%, transparent);
          opacity: 0; transition: opacity .25s ease;
        }
        .mk-corner::before { top: -1px; left: -1px; border-top: 1.5px solid; border-left: 1.5px solid; }
        .mk-corner::after { bottom: -1px; right: -1px; border-bottom: 1.5px solid; border-right: 1.5px solid; }
        .mk-corner:hover::before, .mk-corner:hover::after { opacity: 1; }

        .mk-frame::before, .mk-frame::after {
          content: ""; position: absolute; width: 26px; height: 26px;
          border-color: color-mix(in oklch, var(--primary) 45%, transparent);
        }
        .mk-frame::before { top: -10px; left: -10px; border-top: 1.5px solid; border-left: 1.5px solid; }
        .mk-frame::after { bottom: -10px; right: -10px; border-bottom: 1.5px solid; border-right: 1.5px solid; }

        @media (prefers-reduced-motion: reduce) {
          .reveal { opacity: 1; transform: none; transition: none; }
          [style*="fadeRise"] { animation: none !important; opacity: 1 !important; }
          [style*="mkStamp"] { animation: none !important; opacity: 1 !important; }
          .mk-fill { animation: none; width: 100%; }
        }
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
