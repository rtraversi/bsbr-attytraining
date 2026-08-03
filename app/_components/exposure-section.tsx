import { SectionHead } from "./section-head";

// Section 02 — "Reduce Your Exposure", Katy's copy. (Her draft reads
// "Exposureq"; the stray character is a typo, corrected here.)
//
// The three claims are set as a ruled list rather than a card grid — this is the
// section a sceptical reader slows down on, and a list reads as assertions on a
// record rather than as feature marketing.

const CLAIMS = [
  "A defensible, dated governance record",
  "A standard aligned with bar guidance on AI competence and confidentiality",
  "Ongoing review, so your policy doesn't age out as the rules evolve",
];

export function ExposureSection() {
  return (
    <section
      id="exposure"
      className="scroll-mt-20 border-b border-mint-line py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1140px] px-6 md:px-8">
        <SectionHead num="02" heading="Reduce your exposure" />

        <div className="grid gap-16 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 text-[17px] leading-[1.65] text-ink-soft">
            <p>
              Malpractice carriers are starting to ask about AI practices at renewal —
              and{" "}
              <strong className="font-semibold text-ink">
                &ldquo;we don&apos;t have a policy&rdquo;
              </strong>{" "}
              is becoming a harder answer to give.
            </p>
            <p>
              Bar discipline for AI-related errors — fabricated citations, mishandled
              confidential data — is no longer a rare headline; it&apos;s a pattern
              carriers and bar associations are watching closely.
            </p>
            <p>
              Iurix accreditation gives your firm a documented governance program to
              point to — the kind of proactive posture that&apos;s increasingly
              expected, and the kind{" "}
              <strong className="font-semibold text-ink">
                most firms still don&apos;t have
              </strong>
              .
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
