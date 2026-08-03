import { SectionHead } from "./section-head";

// Section 01 — Katy's opening argument, near-verbatim. The four pillars are the
// product's shape: policy, training, attestation, monitoring.
//
// Two of these four (the tailored policy and the nationwide monitoring feed) are
// not built yet. They are advertised here on Rob's 2026-08-03 decision to publish
// the full programme and build to match — see the backlog note in
// .planning/design-handoff/. Do not quietly soften the copy; either the feature
// ships or the copy changes as a decision.

const PILLARS = [
  {
    n: "01",
    title: "A written firm policy",
    body: "A governance document tailored to your firm — what your staff may use AI for, what they may not, and how client confidences are handled. Dated, adopted, and yours to produce on request.",
  },
  {
    n: "02",
    title: "Online staff training",
    body: "Paralegals, assistants, and office staff work through an interactive course on confidentiality, hallucinated citations, client data, and the boundaries of AI-assisted work in a legal practice.",
  },
  {
    n: "03",
    title: "Attestations of compliance",
    body: "Each staff member passes a scored assessment and signs an individual attestation. The firm holds the signed record, not just a completion tick.",
  },
  {
    n: "04",
    title: "Ongoing monitoring",
    body: "We track AI-related discipline decisions and sanctions nationwide, and update the training as the rules move — so your policy does not age out beneath you.",
  },
];

export function StandardSection() {
  return (
    <section
      id="standard"
      className="scroll-mt-20 border-b border-mint-line py-20 md:py-24"
    >
      <div className="mx-auto max-w-[1140px] px-6 md:px-8">
        <SectionHead
          num="01"
          heading="Iurix Accreditation is the solution"
          intro="Clients know that a firm that doesn't use AI may be missing things, and wasting billable hours. They want their lawyers using it. But they also want to know their data is safe, and that their attorney is a competent, zealous advocate — not a figurehead."
        />

        <p className="mb-13 max-w-[760px] text-[18px] leading-[1.6] text-ink-soft">
          Built by a practicing attorney, from the ground up —{" "}
          <strong className="font-semibold text-ink">
            not a vendor, software engineer, or AI
          </strong>
          . Iurix lets you market your firm&apos;s ethical use of AI, and assures
          prospective clients that their confidential data stays safe, and that AI is
          used only as a tool, never in place of real legal research and advocacy.
        </p>

        <div className="grid border border-mint-line md:grid-cols-2">
          {PILLARS.map((p, i) => (
            <div
              key={p.n}
              className={`bg-white px-8 py-9 ${
                i % 2 === 0 ? "md:border-r md:border-mint-line" : ""
              } ${i < PILLARS.length - 2 ? "border-b border-mint-line" : ""} ${
                i === PILLARS.length - 2 ? "border-b border-mint-line md:border-b-0" : ""
              }`}
            >
              <span className="font-gyrotrope mb-4 block text-[40px] leading-none text-mint">
                {p.n}
              </span>
              <h3 className="font-gyrotrope mb-3 text-[23px] font-normal leading-[1.25] text-ink">
                {p.title}
              </h3>
              <p className="text-[16px] text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
