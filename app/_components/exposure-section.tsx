import { SectionHead } from "./section-head";

// "Reduce Your Exposure" — Katy's copy. (Her draft reads "Exposureq"; the stray
// character is a typo, corrected.)
//
// The three cases used to live in a standalone "Why Rule 5.3 just changed"
// section that explained the rule at length. That section is gone (Rob,
// 2026-08-04) — too much Rule 5.3 for a page whose subject is the accreditation.
// The cases survive here because they substantiate one specific sentence of
// Katy's: that AI-related bar discipline "is no longer a rare headline; it's a
// pattern." An assertion like that should not sit on the page unevidenced in
// front of the exact audience that will check.
//
// These are claims of fact. If they are edited or added to, re-verify first.
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

const CLAIMS = [
  "A defensible, dated governance record",
  "A standard aligned with bar guidance on AI competence and confidentiality",
  "Ongoing review, so your policy doesn't age out as the rules evolve",
];

export function ExposureSection() {
  return (
    <section id="exposure" className="scroll-mt-20 border-b border-silver py-20 md:py-28">
      <div className="mx-auto max-w-[1140px] px-6 md:px-8">
        <SectionHead num="II" heading="Reduce your exposure" />

        <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <div className="space-y-5 text-[17px] leading-[1.7] text-ink-soft">
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

            <ul className="mt-10 border-t border-silver">
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

          {/* The pattern, as a short docket */}
          <div className="relative border border-silver bg-marble-deep px-7 pb-7 pt-3">
            <span className="absolute -top-2.5 left-6 border border-silver bg-marble-deep px-3 text-[10px] uppercase tracking-[0.22em] text-gold-deep">
              The pattern
            </span>
            {CASES.map((c, i) => (
              <div
                key={c.name}
                className={`py-5 ${
                  i < CASES.length - 1 ? "border-b border-dashed border-steel/60" : ""
                }`}
              >
                <p className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-ink-mute">
                  {c.court}
                </p>
                <h3 className="font-gyrotrope my-1.5 text-[19px] font-normal text-ink">
                  {c.name}
                </h3>
                <p className="text-[15px] leading-[1.6] text-ink-soft">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
