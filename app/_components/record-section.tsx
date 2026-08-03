import { SectionHead } from "./section-head";

// Section 03 — "Document Your Best Efforts", Katy's copy. Set on the tinted
// ground so the page has a change of register between two prose-heavy sections.

const CLAIMS = [
  "Signed staff attestations, not just a completed course",
  "A paper trail that shows diligence, not damage control",
  "Evidence you can produce, not a policy you have to reconstruct from memory",
];

export function RecordSection() {
  return (
    <section
      id="record"
      className="scroll-mt-20 border-b border-mint-line bg-marble-deep py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1140px] px-6 md:px-8">
        <SectionHead num="03" heading="Document your best efforts" />

        <div className="grid gap-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 text-[17px] leading-[1.65] text-ink-soft">
            <p>
              If a bar complaint or malpractice claim ever raises your firm&apos;s use of
              AI, the worst position to be in is{" "}
              <strong className="font-semibold text-ink">having nothing to show</strong>.
            </p>
            <p>
              Iurix gives you the opposite: a written policy, a staff training record, and
              individually signed attestations — dated proof that your firm took AI
              governance seriously{" "}
              <strong className="font-semibold text-ink">
                before anything went wrong
              </strong>
              , not after the fact.
            </p>
          </div>

          <ul className="border-t border-mint-line">
            {CLAIMS.map((c) => (
              <li
                key={c}
                className="flex gap-3.5 border-b border-mint-line py-5 text-[16px] text-ink"
              >
                <span
                  className="mt-[0.6em] h-[5px] w-[5px] flex-none rotate-45 bg-gold"
                  aria-hidden
                />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
