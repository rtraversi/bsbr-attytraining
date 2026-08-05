import { SectionHead } from "./section-head";

// "Iurix Accreditation is the solution" — Katy's copy, verbatim.
//
// The four pillars are her list from the second draft, which adds nationwide
// monitoring to the original three. Two of the four (the tailored policy and the
// monitoring feed) are not built yet; they are advertised ahead of shipping on
// Rob's 2026-08-03 decision. See .planning/BACKLOG.md.

const PILLARS = [
  {
    n: "I",
    title: "A written firm policy",
    body: "A governance document tailored to your firm — what your staff may use AI for, what they may not, and how client confidences are handled.",
  },
  {
    n: "II",
    title: "Online staff training",
    body: "Interactive training for every non-attorney team member, covering confidentiality, fabricated citations, client data, and where AI-assisted work stops.",
  },
  {
    n: "III",
    title: "Attestations of compliance",
    body: "Each team member passes a scored assessment and signs an individual attestation. The firm holds the signed record, not just a completion tick.",
  },
  {
    n: "IV",
    title: "Ongoing monitoring",
    body: "We track AI-related discipline decisions and sanctions nationwide, and update the training as the rules move — so your policy does not age out beneath you.",
  },
];

export function StandardSection() {
  return (
    <section id="standard" className="scroll-mt-20 border-b border-silver py-20 md:py-28">
      <div className="mx-auto max-w-[1140px] px-6 md:px-8">
        <SectionHead
          num="I"
          label="The standard"
          heading="Iurix Accreditation is the solution"
        />

        <p className="mb-16 max-w-[820px] text-[18px] leading-[1.7] text-ink-soft">
          Built by a practicing attorney, from the ground up —{" "}
          <strong className="font-semibold text-ink">
            not a vendor, software engineer, or AI
          </strong>
          . Iurix lets you market your firm&apos;s ethical use of AI, and assures
          prospective clients that their confidential data stays safe, and that AI is
          used only as a tool, never in place of real legal research and advocacy.
        </p>

        <div className="grid gap-x-14 gap-y-12 md:grid-cols-2">
          {PILLARS.map((p) => (
            <div key={p.n} className="border-t border-silver pt-7">
              <div className="mb-4 flex items-baseline gap-4">
                <span className="font-gyrotrope text-[15px] tracking-[0.12em] text-gold-deep">
                  {p.n}
                </span>
                <h3 className="font-gyrotrope text-[24px] font-normal leading-[1.25] text-ink">
                  {p.title}
                </h3>
              </div>
              <p className="text-[16px] leading-[1.65] text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
