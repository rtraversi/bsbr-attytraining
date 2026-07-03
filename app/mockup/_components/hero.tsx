import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CountUp } from "@/app/mockup/_components/count-up"

// Each readiness check cites the ABA Model Rule it maps to — the audit
// ledger reads like something a lawyer would actually file.
const CHECKS = [
  { rule: "1.6", label: "Confidentiality & privilege" },
  { rule: "1.1", label: "Competence with AI tools" },
  { rule: "5.1–5.3", label: "Supervision & disclosure" },
  { rule: "3.3", label: "Accuracy & hallucinations" },
]

export function Hero() {
  return (
    <section id="overview" className="relative overflow-hidden">
      {/* blueprint backdrop: hairline grid + intersection dots */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklch, var(--foreground) 5%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 5%, transparent) 1px, transparent 1px), radial-gradient(circle, color-mix(in oklch, var(--primary) 28%, transparent) 1.5px, transparent 1.5px)",
          backgroundSize: "44px 44px, 44px 44px, 176px 176px",
          backgroundPosition: "0 0, 0 0, 22px 22px",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-10 lg:pb-28 lg:pt-24">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2.5 border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="text-primary">§</span> Aligned with professional conduct rules
          </div>

          <h1 className="mk-display mt-7 text-pretty text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-foreground sm:text-6xl">
            Responsible AI training, built for the way law firms{" "}
            <em className="mk-serif-it font-normal text-primary">actually</em> work.
          </h1>

          <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground">
            A focused 30-minute session that gives every attorney and staff member a clear,
            defensible framework for using AI ethically — without slowing the practice down.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="group/cta h-11 rounded-md px-6 text-sm" asChild>
              <a href="#pricing">
                Train your team
                <ArrowRight
                  className="ml-1 h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 rounded-md px-6 text-sm hover:border-primary/40"
              asChild
            >
              <a href="#curriculum">See what&apos;s covered</a>
            </Button>
          </div>

          <dl className="mt-11 flex flex-wrap gap-x-8 gap-y-3 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Duration</dt>
              <span className="h-px w-5 bg-primary/60" aria-hidden="true" />
              <dd>30 min / session</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Focus</dt>
              <span className="h-px w-5 bg-primary/60" aria-hidden="true" />
              <dd>Rule 5.3 aligned</dd>
            </div>
          </dl>
        </div>

        {/* Audit ledger — stamps each rule on load, then holds */}
        <div className="mk-frame relative">
          <div className="border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-7 w-7 items-center justify-center border border-primary/30 bg-primary/5 font-mono text-sm font-semibold text-primary"
                  aria-hidden="true"
                >
                  §
                </span>
                <span className="mk-display text-sm font-semibold tracking-tight text-foreground">
                  AI Use Readiness
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Audit · <span className="text-primary">live</span>
              </span>
            </div>

            <ul className="divide-y divide-border/70">
              {CHECKS.map((check, i) => (
                <li
                  key={check.label}
                  className="flex items-center gap-3 px-5 py-3 opacity-0"
                  style={{
                    animation: "fadeRise 0.45s ease forwards",
                    animationDelay: `${0.3 + i * 0.28}s`,
                  }}
                >
                  <span className="w-16 shrink-0 font-mono text-[11px] text-muted-foreground">
                    R. {check.rule}
                  </span>
                  <span className="text-sm text-foreground">{check.label}</span>
                  <span
                    className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-primary opacity-0"
                    style={{
                      animation: "mkStamp 0.35s ease-out forwards",
                      animationDelay: `${0.55 + i * 0.28}s`,
                    }}
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    ok
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em]">
                <span className="text-muted-foreground">Firm-wide compliance</span>
                <span className="font-semibold text-primary">
                  <CountUp to={100} duration={1700} suffix="%" />
                </span>
              </div>
              <div className="mt-2.5 h-1 w-full bg-secondary">
                <div className="mk-fill h-full bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
