import { SectionHead } from "./section-head";

// Section 04 — the evidence. This content is from the previously reviewed copy
// (.planning/design-handoff/03-copy.md), not Katy's new draft: the citations and
// the pull quote were checked for professional-responsibility framing, and they
// are the most load-bearing credibility on the page for a sceptical reader.
//
// The figures below are claims of fact. If they are restated or refreshed, they
// need re-checking before they ship — they are exactly what a lawyer will test.

const CASES = [
  {
    court: "S.D.N.Y. · 2023",
    name: "Mata v. Avianca",
    body: "Six fabricated AI citations submitted to the court. $5,000 sanction and mandatory AI education.",
  },
  {
    court: "Colorado · 2023",
    name: "In re Crabill",
    body: "First U.S. attorney suspended over AI misconduct — after blaming a legal intern. 90-day suspension.",
  },
  {
    court: "D. Wyoming · 2025",
    name: "Wadsworth v. Walmart",
    body: "Supervising partners fined for an associate's AI-fabricated citations — in a brief they never read.",
  },
];

const STATS = [
  { figure: "480+", caption: "documented AI hallucination cases in U.S. courts" },
  { figure: "2–3/day", caption: "new filings with fabricated AI citations by 2025" },
  { figure: "$31,100", caption: "largest joint sanction to date for unverified AI work" },
  { figure: "~49", caption: "states have adopted Rule 5.3 or an equivalent" },
];

export function RuleSection() {
  return (
    <section
      id="rule"
      className="scroll-mt-20 border-b border-mint-line py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1140px] px-6 md:px-8">
        <SectionHead num="04" heading="Why Rule 5.3 just changed" />

        <div className="grid gap-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="space-y-5 text-[17px] leading-[1.65] text-ink-soft">
              <p>
                <strong className="font-semibold text-ink">ABA Model Rule 5.3</strong>{" "}
                makes supervising attorneys responsible for the conduct of their
                nonlawyer staff. It was written for paralegals and office assistants —
                and in July 2024,{" "}
                <strong className="font-semibold text-ink">
                  ABA Formal Opinion 512
                </strong>{" "}
                extended it explicitly to AI tools.
              </p>
              <p>
                The practical consequence: if your paralegal uses an AI tool to draft a
                brief and it hallucinates citations,{" "}
                <strong className="font-semibold text-ink">you</strong> are
                professionally responsible. You cannot blame the tool — and you cannot
                claim you didn&apos;t know.
              </p>
            </div>

            <blockquote className="font-gyrotrope my-8 border-l-2 border-gold py-1.5 pl-[26px] text-[21px] leading-[1.45] text-ink">
              &ldquo;These duties apply to nonlawyers both within and outside of the law
              firm… a third-party-operated generative AI does not negate the
              lawyer&apos;s requirement to ensure that its actions are consistent with a
              lawyer&apos;s professional obligations.&rdquo;
              <cite className="mt-3.5 block font-sans text-[12px] font-normal uppercase not-italic tracking-[0.12em] text-ink-mute">
                Florida Bar Advisory Opinion 24-1 (2024)
              </cite>
            </blockquote>

            <p className="text-[17px] leading-[1.65] text-ink-soft">
              State bars in{" "}
              <strong className="font-semibold text-ink">
                Florida, California, New York, Texas, and North Carolina
              </strong>{" "}
              have issued opinions explicitly tying Rule 5.3 to AI use. A completed
              training certificate is the &ldquo;reasonable efforts to supervise&rdquo;
              evidence the rule demands.
            </p>
          </div>

          {/* Exhibit plate */}
          <div className="relative border border-mint-line bg-marble-deep px-7 pb-6 pt-2">
            <span className="absolute -top-2.5 left-[22px] border border-mint-line bg-marble-deep px-2.5 text-[10.5px] uppercase tracking-[0.2em] text-gold-deep">
              Exhibit A
            </span>
            {CASES.map((c, i) => (
              <div
                key={c.name}
                className={`py-5 ${
                  i < CASES.length - 1 ? "border-b border-dashed border-mint-line" : ""
                }`}
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-mute">
                  {c.court}
                </p>
                <h3 className="font-gyrotrope my-1.5 text-[20px] font-normal text-ink">
                  {c.name}
                </h3>
                <p className="text-[15.5px] text-ink-soft">{c.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-14 grid grid-cols-2 border border-mint-line bg-white md:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.figure}
              className={`px-6 py-7 text-center ${
                i < STATS.length - 1 ? "md:border-r md:border-mint-line" : ""
              } ${i % 2 === 0 ? "border-r border-mint-line" : ""} ${
                i < 2 ? "border-b border-mint-line md:border-b-0" : ""
              }`}
            >
              <b className="font-gyrotrope mb-2 block text-[40px] font-normal leading-[1.1] text-teal-mid">
                {s.figure}
              </b>
              <span className="block text-[14px] leading-[1.45] text-ink-soft">
                {s.caption}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
