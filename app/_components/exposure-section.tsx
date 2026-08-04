import { SectionHead } from "./section-head";

// "Reduce Your Exposure" — Katy's copy. (Her draft reads "Exposureq"; the stray
// character is a typo, corrected.)
//
// The exhibit was Mata / Crabill / Wadsworth — the 2023–25 fabricated-citation
// sanctions. Replaced 2026-08-04 (Rob) with the three 2026 privilege decisions
// from builtsmartbyrob.com/ai-confidentiality.
//
// These are a DIFFERENT KIND of case and they make a different argument, which
// is why the framing below changed with them. The old three said "AI use gets
// attorneys sanctioned" — a fear argument, and one that cuts against the product,
// since Iurix's whole premise is that firms SHOULD use AI. These three say
// something far more useful: whether your privilege and work product survive
// turns on the contractual protections and written policy you had in place
// beforehand. That is precisely what Iurix sells.
//
// Do NOT label these as bar discipline. They are civil privilege and work-product
// rulings, and two of the three came out in the firm's favour. Calling them
// sanctions would misrepresent them to the one audience certain to look them up.
//
// ⚠️ UNVERIFIED CITATIONS. These are Feb–Mar 2026 district court decisions taken
// from Rob's own write-up; they have not been checked against the dockets here.
// The source lists Heppner's docket as "No. 25-cr-XXX", a placeholder, so no
// docket number is printed for it — do not invent one. Verify all three against
// the real records before this page goes to production.
const CASES = [
  {
    court: "D. Colo. · Mar 2026",
    name: "Morgan v. V2X, Inc.",
    body: "Using an AI tool does not by itself waive work product protection. The court set the standard: no training on inputs, restricted third-party disclosure, and deletion on demand.",
  },
  {
    court: "E.D. Mich. · Feb 2026",
    name: "Warner v. Gilbarco, Inc.",
    body: "Attorney-directed AI analysis and drafting stayed protected — even on a general-purpose platform — absent disclosure to an adversary.",
  },
  {
    court: "S.D.N.Y. · Feb 2026",
    name: "United States v. Heppner",
    body: "Privilege and work product lost. A consumer-grade account permitted training and third-party disclosure; the ruling turned on the missing contractual protections, not on the AI.",
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

          {/* The 2026 decisions, as a short docket */}
          <div className="relative border border-silver bg-marble-deep px-7 pb-7 pt-3">
            <span className="absolute -top-2.5 left-6 border border-silver bg-marble-deep px-3 text-[10px] uppercase tracking-[0.22em] text-gold-deep">
              The 2026 decisions
            </span>
            <p className="border-b border-dashed border-steel/60 pb-5 pt-6 text-[15px] leading-[1.6] text-ink">
              Three rulings this year draw the same line: AI use is defensible when
              the protections are contractual and documented —{" "}
              <strong className="font-semibold">and not when they aren&apos;t.</strong>
            </p>
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
