import { SectionHead } from "./section-head";

// "Document Your Best Efforts" — Katy's copy, verbatim.
//
// This used to carry the tinted ground. It moved to the exposure section on
// 2026-08-05: the page's contrast is now the dark hero and the dark close, and
// only one body section carries a tint. marble → marble-deep is a ~3% value
// shift, so alternating it does not register as a change of register — it just
// makes the hairlines sit on two nearly identical greys.

const CLAIMS = [
  "Signed staff attestations, not just a completed course",
  "A paper trail that shows diligence, not damage control",
  "Evidence you can produce, not a policy you have to reconstruct from memory",
];

export function RecordSection() {
  return (
    <section
      id="record"
      className="scroll-mt-20 border-b border-silver py-20 md:py-28"
    >
      <div className="mx-auto max-w-[1140px] px-6 md:px-8">
        <SectionHead
          num="III"
          label="The record"
          heading="Document your best efforts"
        />

        <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div className="space-y-5 text-[17px] leading-[1.7] text-ink-soft">
            <p>
              If a bar complaint or malpractice claim ever raises your firm&apos;s use of
              AI, the worst position to be in is{" "}
              <strong className="font-semibold text-ink">having nothing to show</strong>.
            </p>
            <p>
              Iurix gives you the opposite: a written policy, a staff training record, and
              individually signed attestations: dated proof that your firm took AI
              governance seriously{" "}
              <em className="font-serif-italic not-italic text-ink">
                before anything went wrong
              </em>
              , not after the fact.
            </p>
          </div>

          <ul className="border-t border-silver">
            {CLAIMS.map((c) => (
              <li
                key={c}
                className="flex gap-4 border-b border-silver py-4 text-[16px] text-ink"
              >
                <span
                  className="mt-[0.62em] h-[4px] w-[4px] flex-none rotate-45 bg-gold"
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
