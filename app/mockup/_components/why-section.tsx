import { Reveal } from "@/app/mockup/_components/reveal"
import { CountUp } from "@/app/mockup/_components/count-up"

const STATS = [
  { value: 30, unit: "min", label: "Total time per person — no all-day seminar" },
  { value: 1, unit: "standard", label: "A single, consistent policy across the whole firm" },
  { value: 0, unit: "jargon", label: "Plain guidance your staff will actually apply" },
]

const STEPS = [
  {
    step: "01",
    title: "Enroll your team",
    body: "Add seats for attorneys and staff. Everyone gets access to the same 30-minute session.",
  },
  {
    step: "02",
    title: "Complete the training",
    body: "Self-paced modules cover confidentiality, competence, oversight, and disclosure.",
  },
  {
    step: "03",
    title: "Keep the record",
    body: "Completion is tracked so you have documentation for your compliance file.",
  },
]

export function WhySection() {
  return (
    <section id="why" className="border-y border-border bg-secondary/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal>
          <div className="flex items-center gap-4">
            <p className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-primary">
              § 02 · Why it matters
            </p>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <h2 className="mk-display max-w-xl text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Your people are already using AI. The question is whether they&apos;re doing it
              right.
            </h2>
            <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
              Ad-hoc AI use creates real exposure — confidentiality breaches, unverified output,
              and unclear accountability. A short, shared training closes that gap fast.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 90} className="bg-card p-7">
              <div className="flex items-baseline gap-2">
                <CountUp
                  to={stat.value}
                  duration={1200 + i * 200}
                  className="font-mono text-5xl font-semibold tracking-tight text-primary tabular-nums"
                />
                <span className="font-mono text-sm uppercase tracking-[0.12em] text-muted-foreground">
                  {stat.unit}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{stat.label}</p>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((item, i) => (
            <Reveal key={item.step} delay={i * 90} className="border-t border-border pt-5">
              <span className="font-mono text-xs font-semibold tracking-[0.12em] text-primary">
                {item.step} <span className="text-primary/40">/</span>
              </span>
              <h3 className="mk-display mt-3 text-lg font-semibold tracking-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
