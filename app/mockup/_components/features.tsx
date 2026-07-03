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
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          What&apos;s covered
        </p>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Six areas every firm needs to get right
        </h2>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
          The training maps directly to the ethical duties that already govern your practice —
          applied to the AI tools your people are using today.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <Reveal
            key={feature.title}
            delay={(i % 3) * 90}
            className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <feature.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-foreground">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
