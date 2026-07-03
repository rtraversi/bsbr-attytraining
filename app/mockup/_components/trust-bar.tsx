import { Fragment } from "react"
import { Reveal } from "@/app/mockup/_components/reveal"

const POINTS = [
  "Grounded in ABA Model Rules",
  "Plain-language, no jargon",
  "Completion records for the file",
  "Updated as guidance evolves",
]

export function TrustBar() {
  return (
    <section className="border-y border-border bg-secondary/60">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <Reveal className="flex flex-col items-center gap-3 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-7 sm:gap-y-2">
          {POINTS.map((point, i) => (
            <Fragment key={point}>
              {i > 0 && (
                <span
                  className="mk-display hidden text-sm sm:inline"
                  style={{ color: "var(--mk-amber-deep)" }}
                  aria-hidden="true"
                >
                  §
                </span>
              )}
              <span className="text-sm font-medium text-muted-foreground">{point}</span>
            </Fragment>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
