import { Lock, GraduationCap, Eye, ScanSearch, FileCheck2, Users } from "lucide-react"
import { Reveal } from "@/app/mockup/_components/reveal"

const FEATURES = [
  {
    icon: Lock,
    title: "Confidentiality & privilege",
    body: "Where client data can and cannot go, and how to keep privileged material out of public models.",
  },
  {
    icon: GraduationCap,
    title: "Duty of competence",
    body: "What Rule 1.1 expects now that AI is part of practice — and how to meet the bar in daily work.",
  },
  {
    icon: ScanSearch,
    title: "Accuracy & hallucinations",
    body: "Verifying AI output, spotting fabricated citations, and building review habits that hold up.",
  },
  {
    icon: Eye,
    title: "Supervision & oversight",
    body: "How partners and supervising attorneys stay accountable for AI-assisted work product.",
  },
  {
    icon: FileCheck2,
    title: "Disclosure & billing",
    body: "When to disclose AI use to clients and courts, and how it affects fees and billing entries.",
  },
  {
    icon: Users,
    title: "Firm-wide consistency",
    body: "One shared standard so associates, paralegals, and staff apply the same rules the same way.",
  },
]

export function Features() {
  return (
    <section id="curriculum" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <Reveal>
        <div className="flex items-center gap-4">
          <p className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-primary">
            § 01 · What&apos;s covered
          </p>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <h2 className="mk-display max-w-xl text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Six areas every firm needs to get right
          </h2>
          <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
            The training maps directly to the ethical duties that already govern your practice —
            applied to the AI tools your people are using today.
          </p>
        </div>
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <Reveal
            key={feature.title}
            delay={(i % 3) * 90}
            className="mk-corner group border border-border bg-card p-6 transition-colors duration-300 hover:border-primary/40"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center border border-border text-primary transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-primary/5">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-mono text-[11px] text-muted-foreground/70">
                0{i + 1}
              </span>
            </div>
            <h3 className="mk-display mt-5 text-lg font-semibold tracking-tight text-foreground">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
