import { Reveal } from "@/app/mockup/_components/reveal"
import { CountUp } from "@/app/mockup/_components/count-up"

const STATS = [
  { value: 30, unit: "minutes", label: "Total time per person — no all-day seminar" },
  { value: 1, unit: "standard", label: "A single, consistent policy across the whole firm" },
  { value: 0, unit: "jargon", label: "Plain guidance your staff will actually apply" },
]

const STEPS = [
  {
    step: "1",
    title: "Enroll your team",
    body: "Add seats for attorneys and staff. Everyone gets access to the same 30-minute course.",
  },
  {
    step: "2",
    title: "Complete the training",
    body: "Self-paced lessons cover confidentiality, accuracy, workflows, and everyday judgment.",
  },
  {
    step: "3",
    title: "Keep the record",
    body: "Completion is tracked so you have documentation for your compliance file.",
  },
]

export function WhySection() {
  return (
    <section
      id="why"
      className="text-[var(--mk-cream)]"
      style={{
        background:
          "radial-gradient(720px circle at 90% 0%, color-mix(in oklch, var(--mk-amber) 12%, transparent), transparent 65%), linear-gradient(var(--mk-pine), var(--mk-pine-deep))",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal className="max-w-2xl">
          <p
            className="text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--mk-amber)" }}
          >
            Why it matters
          </p>
          <h2 className="mk-display mt-3 text-balance text-4xl leading-tight sm:text-5xl">
            Your people are already using AI.{" "}
            <em style={{ color: "var(--mk-amber)" }}>The question is whether they&apos;re doing
            it right.</em>
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-lg leading-relaxed text-[color-mix(in_oklch,var(--mk-cream)_75%,transparent)]">
            Ad-hoc AI use creates real exposure — confidentiality breaches, unverified output, and
            unclear accountability. A short, shared training closes that gap fast.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <Reveal
              key={stat.label}
              delay={i * 90}
              className="rounded-2xl border border-[color-mix(in_oklch,var(--mk-cream)_14%,transparent)] bg-[color-mix(in_oklch,var(--mk-cream)_5%,transparent)] p-7"
            >
              <div className="flex items-baseline gap-2.5">
                <CountUp
                  to={stat.value}
                  duration={1200 + i * 200}
                  className="mk-display text-6xl tabular-nums"
                />
                <span
                  className="text-sm font-semibold uppercase tracking-wide"
                  style={{ color: "var(--mk-amber)" }}
                >
                  {stat.unit}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[color-mix(in_oklch,var(--mk-cream)_70%,transparent)]">
                {stat.label}
              </p>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((item, i) => (
            <Reveal key={item.step} delay={i * 90} className="flex gap-4">
              <span
                className="mk-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                style={{
                  backgroundColor: "color-mix(in oklch, var(--mk-amber) 20%, transparent)",
                  color: "var(--mk-amber)",
                }}
                aria-hidden="true"
              >
                {item.step}
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[color-mix(in_oklch,var(--mk-cream)_70%,transparent)]">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
