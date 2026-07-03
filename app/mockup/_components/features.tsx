import {
  Scale,
  Lock,
  ScanSearch,
  Workflow,
  Compass,
  MousePointerClick,
} from "lucide-react"
import { Reveal } from "@/app/mockup/_components/reveal"

// The real course: "AI Staff Compliance Certificate" — five Rise 360 lessons
// plus a card describing the interactive format.
const LESSONS = [
  {
    icon: Scale,
    index: "L.01",
    title: "Introduction to AI in Legal Practice",
    body: "The two pillars — confidentiality and accuracy — where AI shows up in a firm, and what Rule 5.3 expects of attorneys and staff alike.",
  },
  {
    icon: Lock,
    index: "L.02",
    title: "Protecting Client Confidentiality",
    body: "Why removing a name isn't enough, how chatboxes leak client data, and the golden rules for handling confidential information.",
  },
  {
    icon: ScanSearch,
    index: "L.03",
    title: "Accuracy, Verification & Supervision",
    body: "Hallucinated citations, why every authority gets checked against a trusted source, and who is responsible before anything is filed.",
  },
  {
    icon: Workflow,
    index: "L.04",
    title: "Automations vs. Chatbox Use",
    body: "The route the data takes decides compliance — why API-driven automations are safe where pasting into a chatbox is not.",
  },
  {
    icon: Compass,
    index: "L.05",
    title: "Applying the Rules Every Day",
    body: "Gray areas in practice: when staff can act independently, when to escalate, and how to size up new AI tools and vendors.",
  },
  {
    icon: MousePointerClick,
    index: "§",
    title: "Interactive, not a lecture",
    body: "Real scenarios — the Perfect Brief, the Uninvited AI Guest — plus flashcards, sorting exercises, and knowledge checks in every lesson.",
  },
]

export function Features() {
  return (
    <section id="curriculum" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <Reveal>
        <div className="flex items-center gap-4">
          <p className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-primary">
            § 01 · The curriculum
          </p>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <h2 className="mk-display max-w-xl text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Five lessons. Thirty minutes. One standard.
          </h2>
          <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
            The exact course your staff completes — co-authored with a practicing attorney and
            mapped to the ethical duties that already govern your firm.
          </p>
        </div>
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.map((lesson, i) => (
          <Reveal
            key={lesson.title}
            delay={(i % 3) * 90}
            className="mk-corner group border border-border bg-card p-6 transition-colors duration-300 hover:border-primary/40"
          >
            <div className="flex items-start justify-between">
              <span className="flex h-11 w-11 items-center justify-center border border-border text-primary transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-primary/5">
                <lesson.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-mono text-[11px] text-muted-foreground/70">
                {lesson.index}
              </span>
            </div>
            <h3 className="mk-display mt-5 text-lg font-semibold tracking-tight text-foreground">
              {lesson.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lesson.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
