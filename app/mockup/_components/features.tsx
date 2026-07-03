import {
  Scale,
  Lock,
  ScanSearch,
  Workflow,
  Compass,
  MousePointerClick,
} from "lucide-react"
import { Reveal } from "@/app/mockup/_components/reveal"

// The real course, laid out as a bento grid. Each lesson owns a hue.
const LESSONS = [
  {
    icon: Scale,
    index: "Lesson 01",
    hue: "var(--primary)",
    title: "Introduction to AI in Legal Practice",
    body: "The two pillars — confidentiality and accuracy — where AI shows up in a firm, and what ABA Model Rule 5.3 expects of attorneys and staff alike.",
    wide: true,
  },
  {
    icon: Lock,
    index: "Lesson 02",
    hue: "var(--mk-coral)",
    title: "Protecting Client Confidentiality",
    body: "Why removing a name isn't enough, how chatboxes leak client data, and the golden rules for handling confidential information.",
    wide: false,
  },
  {
    icon: ScanSearch,
    index: "Lesson 03",
    hue: "var(--mk-blue)",
    title: "Accuracy, Verification & Supervision",
    body: "Hallucinated citations, why every authority gets checked, and who is responsible before anything is filed.",
    wide: false,
  },
  {
    icon: Workflow,
    index: "Lesson 04",
    hue: "var(--mk-amber-deep)",
    title: "Automations vs. Chatbox Use",
    body: "The route the data takes decides compliance — why API-driven automations are safe where pasting into a chatbox is not.",
    wide: false,
  },
  {
    icon: Compass,
    index: "Lesson 05",
    hue: "var(--mk-plum)",
    title: "Applying the Rules Every Day",
    body: "Gray areas in practice: when staff can act independently, when to escalate, and how to size up new AI tools and vendors.",
    wide: false,
  },
]

export function Features() {
  return (
    <section id="curriculum" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <Reveal className="max-w-2xl">
        <p
          className="text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--mk-amber-deep)" }}
        >
          The curriculum
        </p>
        <h2 className="mk-display mt-3 text-balance text-4xl leading-tight text-foreground sm:text-5xl">
          Five lessons. Thirty minutes. <em style={{ color: "var(--primary)" }}>One standard.</em>
        </h2>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
          The exact course your staff completes — co-authored with a practicing attorney and
          mapped to the ethical duties that already govern your firm.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.map((lesson, i) => (
          <Reveal
            key={lesson.title}
            delay={(i % 3) * 90}
            className={
              "group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgba(30,60,60,0.35)]" +
              (lesson.wide ? " sm:col-span-2 lg:col-span-2" : "")
            }
          >
            <div className="flex items-start justify-between">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
                style={{
                  backgroundColor: `color-mix(in oklch, ${lesson.hue} 13%, transparent)`,
                  color: lesson.hue,
                }}
              >
                <lesson.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                {lesson.index}
              </span>
            </div>
            <h3 className="mk-display mt-5 text-2xl leading-snug text-foreground">
              {lesson.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lesson.body}</p>
          </Reveal>
        ))}

        {/* format strip — full-width amber, finishes the bento */}
        <Reveal
          delay={180}
          className="rounded-2xl bg-[color-mix(in_oklch,var(--mk-amber)_30%,var(--card))] p-6 transition-all duration-300 hover:-translate-y-0.5 sm:col-span-2 lg:col-span-3"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: "color-mix(in oklch, var(--mk-amber-deep) 18%, transparent)",
                color: "var(--mk-amber-deep)",
              }}
            >
              <MousePointerClick className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="mk-display text-2xl leading-snug text-foreground">
                Interactive, <em>not</em> a lecture
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-foreground/75">
                Real scenarios — the Perfect Brief, the Uninvited AI Guest — plus flashcards,
                sorting exercises, and knowledge checks in every lesson.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
