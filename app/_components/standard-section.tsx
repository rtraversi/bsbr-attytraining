import { SectionHead } from "./section-head";
import { FlipCard, FlipHint } from "./motion/flip-card";
import { MarginNote } from "./motion/margin-note";
import { PillarClip } from "./motion/pillar-clip";
import {
  AttestationIcon,
  MonitoringIcon,
  PolicyIcon,
  TrainingIcon,
} from "./homepage-icons";

// "Iurix Accreditation is the solution" — Katy's copy, verbatim.
//
// The four pillars are her list from the second draft, which adds nationwide
// monitoring to the original three. Two of the four (the tailored policy and the
// monitoring feed) are not built yet; they are advertised ahead of shipping on
// Rob's 2026-08-03 decision. See .planning/BACKLOG.md.
//
// Flip cards since 2026-10-29 (Rob): the title and an icon on the front, over a
// light mint wash; Katy's description on the dark back. Same words as before,
// only the reveal changed. On 2026-10-31 (Rob) the roman numerals came off both
// faces (n stays as the React key) and each front gained a short clip in its
// open space, played on hover (motion/pillar-clip.tsx).

const PILLARS = [
  {
    n: "I",
    clip: "policy",
    Icon: PolicyIcon,
    title: "A written firm policy",
    body: "A governance document tailored to your firm: what your staff may use AI for, what they may not, and how client confidences are handled.",
  },
  {
    n: "II",
    clip: "training",
    Icon: TrainingIcon,
    title: "Online staff training",
    body: "Interactive training for every non-attorney team member, covering confidentiality, fabricated citations, client data, and where AI-assisted work stops.",
  },
  {
    n: "III",
    clip: "attestation",
    Icon: AttestationIcon,
    title: "Attestations of compliance",
    body: "Each team member passes a scored assessment and signs an individual attestation. The firm holds the signed record, not just a completion tick.",
  },
  {
    n: "IV",
    clip: "monitoring",
    Icon: MonitoringIcon,
    title: "Ongoing monitoring",
    body: "We track AI-related discipline decisions and sanctions nationwide, and update the training as the rules move, so your policy does not age out beneath you.",
  },
];

export function StandardSection() {
  return (
    <section id="standard" className="relative scroll-mt-20 border-b border-silver py-20 md:py-28">
      <i data-ribbon="0.97" style={{ top: "20%" }} aria-hidden />
      <i data-ribbon="0.5" style={{ top: "62%" }} aria-hidden />
      <i data-ribbon="0.06" style={{ top: "97%" }} aria-hidden />
      <div className="relative z-[2] mx-auto max-w-[1140px] px-6 md:px-8">
        <SectionHead
          num="I"
          label="The standard"
          heading="Iurix Accreditation is the solution"
        />

        <p className="mb-16 max-w-[820px] text-[18px] leading-[1.7] text-ink-soft">
          Built by a practicing attorney, from the ground up:{" "}
          <strong className="font-semibold text-ink">
            not a vendor, software engineer, or AI
          </strong>
          . Iurix lets you market your firm&apos;s ethical use of AI, and assures
          prospective clients that their confidential data stays safe, and that AI is
          used only as a tool, never in place of real legal research and advocacy.
        </p>

        <div className="relative grid gap-[26px] md:grid-cols-2 md:gap-x-[34px] md:gap-y-[30px]">
          <MarginNote text="turn one over" point="down-right" className="note-turn" />
          {PILLARS.map(({ n, clip, Icon, title, body }) => (
            <FlipCard
              key={n}
              className="pillar-card"
              front={
                <>
                  <PillarClip name={clip} />
                  <Icon className="h-[50px] w-[50px]" />
                  <span className="font-display mt-auto pt-8 text-[26px] leading-[1.15] tracking-[-0.015em] text-ink">
                    {title}
                  </span>
                  <FlipHint>Turn over</FlipHint>
                </>
              }
              back={
                <>
                  <span className="text-[15px] tracking-[0.02em] text-mint">{title}</span>
                  <span className="mt-4 text-[17px] leading-[1.6] text-marble">{body}</span>
                  <FlipHint>Turn back</FlipHint>
                </>
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
