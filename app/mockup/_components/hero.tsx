"use client"

import { Clock, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const CHECKS = [
  "Confidentiality & privilege",
  "Competence with AI tools",
  "Supervision & disclosure",
  "Bias, accuracy & hallucinations",
]

export function Hero() {
  return (
    <section id="overview" className="relative overflow-hidden">
      {/* subtle grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklch, var(--foreground) 6%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 6%, transparent) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-8 lg:pb-28 lg:pt-24">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Aligned with professional conduct rules
          </div>

          <h1 className="mt-6 text-pretty text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Responsible AI training, built for the way law firms actually work.
          </h1>

          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            A focused 30-minute session that gives every attorney and staff member a clear,
            defensible framework for using AI ethically — without slowing the practice down.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="h-11 rounded-full px-6 text-sm" asChild>
              <a href="#pricing">
                Train your team
                <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="h-11 rounded-full px-6 text-sm" asChild>
              <a href="#curriculum">See what&apos;s covered</a>
            </Button>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
              <dt className="sr-only">Duration</dt>
              <dd className="text-sm font-medium text-foreground">30-minute session</dd>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              <dt className="sr-only">Focus</dt>
              <dd className="text-sm font-medium text-foreground">Compliance-first</dd>
            </div>
          </dl>
        </div>

        {/* Animated compliance panel */}
        <div className="relative">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  AI Use Readiness
                </span>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                Reviewed
              </span>
            </div>

            <ul className="mt-4 space-y-3">
              {CHECKS.map((check, i) => (
                <li
                  key={check}
                  className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/60 px-3 py-2.5 opacity-0"
                  style={{
                    animation: `fadeRise 0.5s ease forwards`,
                    animationDelay: `${0.25 + i * 0.18}s`,
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-sm text-foreground">{check}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">OK</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-between rounded-lg bg-primary/10 px-4 py-3 text-primary">
              <span className="text-sm font-medium">Firm-wide compliance</span>
              <span className="font-mono text-sm font-semibold">100%</span>
            </div>
          </div>

          {/* decorative offset accent */}
          <div
            aria-hidden="true"
            className="absolute -bottom-4 -right-4 -z-10 h-24 w-24 rounded-2xl bg-primary/10"
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeRise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="fadeRise"] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </section>
  )
}
