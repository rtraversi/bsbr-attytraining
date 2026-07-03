import { Reveal } from "@/app/mockup/_components/reveal"

const STATS = [
  { value: "30 min", label: "Total time per person — no all-day seminar" },
  { value: "1 standard", label: "A single, consistent policy across the whole firm" },
  { value: "0 jargon", label: "Plain guidance your staff will actually apply" },
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
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Why it matters
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Your people are already using AI. The question is whether they&apos;re doing it right.
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Ad-hoc AI use creates real exposure — confidentiality breaches, unverified output, and
            unclear accountability. A short, shared training closes that gap fast.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <Reveal
              key={stat.label}
              delay={i * 90}
              className="rounded-xl border border-border bg-card p-6 text-center shadow-sm"
            >
              <div className="font-mono text-3xl font-semibold text-primary">{stat.value}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stat.label}</p>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEPS.map((item, i) => (
            <Reveal key={item.step} delay={i * 90} className="relative">
              <span className="font-mono text-sm font-semibold text-primary/70">{item.step}</span>
              <h3 className="mt-2 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
