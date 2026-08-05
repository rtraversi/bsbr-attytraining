import type { CSSProperties } from "react"
import { notFound } from "next/navigation"
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

// "Warm Counsel" palette — warm paper ground, deep pine-teal primary,
// marigold / terracotta / plum as genuine second and third hues.
const warmPaletteStyle = {
  "--background": "oklch(0.978 0.008 85)",
  "--foreground": "oklch(0.28 0.035 215)",
  "--card": "oklch(0.995 0.004 85)",
  "--card-foreground": "oklch(0.28 0.035 215)",
  "--primary": "oklch(0.42 0.075 200)",
  "--primary-foreground": "oklch(0.98 0.008 85)",
  "--secondary": "oklch(0.945 0.018 85)",
  "--secondary-foreground": "oklch(0.32 0.04 210)",
  "--muted": "oklch(0.945 0.015 85)",
  "--muted-foreground": "oklch(0.49 0.03 215)",
  "--accent": "oklch(0.93 0.03 80)",
  "--accent-foreground": "oklch(0.32 0.04 210)",
  "--border": "oklch(0.895 0.018 85)",
  "--input": "oklch(0.895 0.018 85)",
  "--ring": "oklch(0.42 0.075 200)",
  // extended spectrum
  "--mk-amber": "oklch(0.78 0.14 75)",
  "--mk-amber-deep": "oklch(0.68 0.15 65)",
  "--mk-coral": "oklch(0.64 0.15 40)",
  "--mk-plum": "oklch(0.5 0.1 330)",
  "--mk-blue": "oklch(0.55 0.09 250)",
  "--mk-pine": "oklch(0.3 0.05 200)",
  "--mk-pine-deep": "oklch(0.26 0.045 205)",
  "--mk-cream": "oklch(0.96 0.015 85)",
  colorScheme: "light",
} as CSSProperties

export default function MockupPage() {
  // Superseded design concept, kept for reference but never a customer surface.
  // It is unlinked, which is not the same as unreachable: Next serves it to
  // anyone who types the URL, and it carries its own pricing section in a
  // palette the product no longer uses. 404 in production, still viewable in
  // `next dev` for anyone comparing the two directions.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div
      className="mk-root bg-background text-foreground flex min-h-screen flex-col"
      style={warmPaletteStyle}
    >
      <style>{`
        /* ---- Warm Counsel: scoped design system for /mockup ---- */
        .mk-root { font-family: var(--font-host-grotesk), var(--font-sans), sans-serif; }
        .mk-root ::selection { background: color-mix(in oklch, var(--mk-amber) 30%, transparent); }

        .mk-display { font-family: var(--font-instrument-serif), Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
        .mk-display em { font-style: italic; }

        /* Scroll reveal */
        .reveal { opacity: 0; transform: translateY(16px); transition: opacity .6s ease, transform .6s ease; }
        .reveal.is-visible { opacity: 1; transform: translateY(0); }

        @keyframes fadeRise {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Hero lesson deck — five cards crossfade on a 20s loop */
        @keyframes mkCycle {
          0% { opacity: 0; transform: translateY(14px) scale(0.985); }
          3.5%, 20% { opacity: 1; transform: translateY(0) scale(1); }
          24%, 100% { opacity: 0; transform: translateY(-10px) scale(0.99); }
        }
        .mk-cycle-item {
          opacity: 0;
          animation: mkCycle 20s ease-in-out infinite;
          animation-fill-mode: backwards;
        }
        @keyframes mkDot {
          0% { background-color: var(--border); transform: scale(1); }
          2%, 20% { background-color: var(--mk-amber-deep); transform: scale(1.25); }
          24%, 100% { background-color: var(--border); transform: scale(1); }
        }
        .mk-cycle-dot {
          background-color: var(--border);
          animation: mkDot 20s ease-in-out infinite;
          animation-fill-mode: backwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal { opacity: 1; transform: none; transition: none; }
          [style*="fadeRise"] { animation: none !important; opacity: 1 !important; }
          .mk-cycle-item { animation: none; }
          .mk-cycle-item:first-of-type { opacity: 1; }
          .mk-cycle-dot { animation: none; }
          .mk-cycle-dot:first-of-type { background-color: var(--mk-amber-deep); }
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
