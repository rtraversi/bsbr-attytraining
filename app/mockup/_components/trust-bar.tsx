import { Reveal } from "@/app/mockup/_components/reveal"

const POINTS = [
  "Grounded in ABA Model Rules",
  "Plain-language, no jargon",
  "Completion records for the file",
  "Updated as guidance evolves",
]

export function TrustBar() {
  return (
    <section className="border-y border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Reveal className="flex flex-col items-center gap-4 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-10 sm:gap-y-3">
          {POINTS.map((point) => (
            <span
              key={point}
              className="text-sm font-medium text-muted-foreground"
            >
              {point}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
