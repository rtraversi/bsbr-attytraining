import { ArrowRight, Scale, Lock, ScanSearch, Workflow, Compass } from "lucide-react"
import { Button } from "@/components/ui/button"

// The five real lessons leaf by in the hero deck.
const LESSONS = [
  {
    icon: Scale,
    n: "01",
    hue: "var(--primary)",
    title: "Introduction to AI in Legal Practice",
    line: "The two pillars — confidentiality and accuracy — and what Rule 5.3 expects of every role.",
  },
  {
    icon: Lock,
    n: "02",
    hue: "var(--mk-coral)",
    title: "Protecting Client Confidentiality",
    line: "Why removing a name isn't enough, and the golden rules for handling client data.",
  },
  {
    icon: ScanSearch,
    n: "03",
    hue: "var(--mk-blue)",
    title: "Accuracy, Verification & Supervision",
    line: "Hallucinated citations, checking every authority, and who's responsible before filing.",
  },
  {
    icon: Workflow,
    n: "04",
    hue: "var(--mk-amber-deep)",
    title: "Automations vs. Chatbox Use",
    line: "The route the data takes decides compliance — safe automations vs. risky pasting.",
  },
  {
    icon: Compass,
    n: "05",
    hue: "var(--mk-plum)",
    title: "Applying the Rules Every Day",
    line: "Gray areas in practice: act, ask, or escalate — and how to size up new AI tools.",
  },
]

export function Hero() {
  return (
    <section id="overview" className="relative overflow-hidden">
      {/* warm atmosphere: two soft color washes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(640px circle at 88% 12%, color-mix(in oklch, var(--mk-amber) 14%, transparent), transparent 70%), radial-gradient(560px circle at 4% 92%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:pb-28 lg:pt-24">
        <div className="max-w-2xl">
          <div
            className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground opacity-0"
            style={{ animation: "fadeRise 0.5s ease 0.05s forwards" }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ backgroundColor: "var(--mk-amber-deep)" }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--mk-amber-deep)" }}
              />
            </span>
            Aligned with ABA Model Rule 5.3
          </div>

          <h1
            className="mk-display mt-7 text-pretty text-5xl leading-[1.05] text-foreground opacity-0 sm:text-[4.25rem]"
            style={{ animation: "fadeRise 0.6s ease 0.15s forwards" }}
          >
            Responsible AI training, built for the way law firms{" "}
            <em style={{ color: "var(--mk-coral)" }}>actually</em> work.
          </h1>

          <p
            className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground opacity-0"
            style={{ animation: "fadeRise 0.6s ease 0.3s forwards" }}
          >
            A focused 30-minute course that gives every attorney and staff member a clear,
            defensible framework for using AI ethically — without slowing the practice down.
          </p>

          <div
            className="mt-9 flex flex-col gap-3 opacity-0 sm:flex-row"
            style={{ animation: "fadeRise 0.6s ease 0.45s forwards" }}
          >
            <Button size="lg" className="group/cta h-12 rounded-xl px-7 text-[0.95rem]" asChild>
              <a href="#pricing">
                Train your team
                <ArrowRight
                  className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-xl px-7 text-[0.95rem] hover:border-primary/40"
              asChild
            >
              <a href="#curriculum">See the curriculum</a>
            </Button>
          </div>

          <p
            className="mt-10 text-sm text-muted-foreground opacity-0"
            style={{ animation: "fadeRise 0.6s ease 0.6s forwards" }}
          >
            <span className="font-semibold text-foreground">30 minutes</span> per person
            <span className="mx-2.5" style={{ color: "var(--mk-amber-deep)" }}>§</span>
            <span className="font-semibold text-foreground">5 lessons</span>, fully interactive
            <span className="mx-2.5" style={{ color: "var(--mk-amber-deep)" }}>§</span>
            certificate for the file
          </p>
        </div>

        {/* Lesson deck — leafs through the five real lessons */}
        <div
          className="relative mx-auto w-full max-w-md opacity-0 lg:mx-0"
          style={{ animation: "fadeRise 0.7s ease 0.5s forwards" }}
        >
          {/* deck shadow cards */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -rotate-3 rounded-2xl border border-border bg-card/70"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 rotate-2 rounded-2xl border border-border bg-card/80"
          />

          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-30px_rgba(30,60,60,0.35)]">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <span className="text-sm font-semibold text-foreground">Inside the course</span>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  backgroundColor: "color-mix(in oklch, var(--mk-amber) 22%, transparent)",
                  color: "var(--mk-amber-deep)",
                }}
              >
                5 lessons · 30 min
              </span>
            </div>

            <div className="relative h-56">
              {LESSONS.map((lesson, i) => (
                <div
                  key={lesson.n}
                  className="mk-cycle-item absolute inset-0 flex flex-col justify-between p-6"
                  style={{ animationDelay: `${i * 4}s` }}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `color-mix(in oklch, ${lesson.hue} 14%, transparent)`,
                          color: lesson.hue,
                        }}
                      >
                        <lesson.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Lesson {lesson.n} of 05
                      </span>
                    </div>
                    <h3 className="mk-display mt-4 text-2xl leading-snug text-foreground">
                      {lesson.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {lesson.line}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <div className="flex items-center gap-2" aria-hidden="true">
                {LESSONS.map((lesson, i) => (
                  <span
                    key={lesson.n}
                    className="mk-cycle-dot h-1.5 w-1.5 rounded-full"
                    style={{ animationDelay: `${i * 4}s` }}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                Scenarios, flashcards &amp; knowledge checks
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
