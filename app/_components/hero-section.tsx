import Link from "next/link";

// Hero. Katy's headline and opening lines, verbatim.
//
// The old hero led with an "ABA MODEL RULE 5.3 · FORMAL OPINION 512" eyebrow and
// a specimen plate stamped with the rule number. Both are gone (Rob, 2026-08-04):
// the rule is relevant background, not the pitch, and leading with a citation
// made the page read like a compliance notice instead of a standard.
//
// The mark carries the hero instead. It is the most persuasive asset available —
// it looks like a seal, which is precisely what is being sold.
//
// ── Dark ground, 2026-08-05 (Rob) ────────────────────────────────────────────
// The section was marble until now. The mark is brushed metal: teal edge-light,
// two rose-gold crescents, specular highlights — and it was rendered for a dark
// ground. The palette comment in globals.css records the cost of ignoring that,
// the sampled hues "read as washed out … a flat page has none of that to lift
// it", so the chroma was raised to compensate. That treated the symptom. The
// hero now gives the metal the ground it was drawn for.
//
// It is also the page's contrast: marble #f7f7f6 → marble-deep #edf3f1 is a ~3%
// value shift, so every section below reads as one continuous field and the
// closing panel used to be the only change of register on the whole page. The
// page now runs dark → light (the entire argument) → dark. Two events.
//
// ⚠️ The HEADER STAYS MARBLE above this. That is a constraint, not an oversight:
// the wordmark is dark teal and rose gold baked into pixels with no
// light-on-dark variant, and a CSS filter will not produce one
// (public/brand/README.md). A transparent header over this ground needs a second
// asset. Until then, solid marble — which reads as a document header above a
// plate anyway.
//
// Katy's own three-line summary, from directly beneath "Iurix Accreditation is
// the solution." It sits at the foot of the hero so the visitor sees what they
// get before reading a paragraph.
//
// This replaces a framed plate listing Format / Record / Held by / Term (Rob,
// 2026-08-04: didn't like it). That plate was spec-sheet furniture — do not
// reintroduce a specification block here in any form.
const DELIVERABLES = [
  "A written firm policy",
  "Online staff training",
  "Attestations of compliance",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-teal-ink text-marble">
      <div className="relative z-10 mx-auto max-w-[1140px] px-6 pt-[72px] text-center md:px-8 md:pt-24">
        {/* The seal. height-auto is load-bearing — see the img note below. */}
        <div className="hero-seal relative mx-auto w-[126px] md:w-[150px]">
          <span className="hero-seal-bloom" aria-hidden />
          {/* ⚠️ h-auto is REQUIRED. This img carries width={326} height={326},
              which map to CSS presentational hints. Setting only the width
              leaves the height hint in force and the mark renders distorted —
              a 68px-wide box came out 326px tall. Any mark <img> that sizes
              one axis in CSS must set the other to auto. */}
          <img
            src="/brand/iurix-mark.png"
            alt="The Iurix Accreditation mark"
            width={326}
            height={326}
            className="relative block h-auto w-full select-none"
            draggable={false}
          />
        </div>

        <h1 className="hero-rise font-gyrotrope mx-auto mt-[34px] max-w-[15ch] text-[clamp(38px,5.6vw,68px)] font-normal leading-[1.05] tracking-[-0.022em] text-marble [animation-delay:0.14s]">
          The Standard Other Firms Will Be{" "}
          <em className="font-serif-italic not-italic text-gold-soft">Held To</em>
        </h1>

        {/* Rose-gold hairline — the crescent motif from the mark, reduced to a rule */}
        <div
          className="hero-rise mx-auto mt-[30px] h-px w-[104px] bg-gradient-to-r from-transparent via-gold-soft to-transparent [animation-delay:0.26s]"
          aria-hidden
        />

        <p className="hero-rise mx-auto mt-7 max-w-[600px] text-[18px] leading-[1.62] text-mint [animation-delay:0.36s] md:text-[19px]">
          Our times demand that attorneys use artificial intelligence. Clients and
          state bars expect ethical practices.
        </p>
        <p className="hero-rise mx-auto mt-4 max-w-[600px] text-[18px] leading-[1.62] text-mint [animation-delay:0.46s] md:text-[19px]">
          Iurix Accreditation is how a firm shows it meets both: a written policy,
          trained staff, and a signed record to prove it.
        </p>

        <div className="hero-rise mt-[38px] flex flex-wrap items-center justify-center gap-3.5 [animation-delay:0.56s]">
          <Link
            href="/pricing"
            className="rounded-[2px] bg-marble px-7 py-3.5 text-[15px] font-medium text-teal-ink transition-colors hover:bg-gold-pale"
          >
            Accredit your firm
          </Link>
          <Link
            href="#exposure"
            className="rounded-[2px] border border-marble/35 px-7 py-3.5 text-[15px] font-medium text-marble transition-colors hover:border-marble hover:bg-marble hover:text-teal-ink"
          >
            Why it matters
          </Link>
        </div>

        <p className="hero-rise mt-6 text-[14px] text-silver [animation-delay:0.66s]">
          $35 per seat, per year. The accreditation belongs to your firm.
        </p>
      </div>

      {/* Katy's three deliverables, as the ruled base of the certificate. */}
      <div className="mt-16 border-t border-mint-line/25 bg-teal-deep">
        <div className="mx-auto grid max-w-[1140px] grid-cols-1 px-6 md:px-8 lg:grid-cols-3">
          {DELIVERABLES.map((d, i) => (
            <h2
              key={d}
              className={[
                "font-gyrotrope flex items-baseline gap-[13px] border-mint-line/20 text-[20px] font-normal leading-[1.3] text-marble",
                "border-b py-[26px] last:border-b-0",
                "lg:border-b-0 lg:border-l lg:px-8 lg:py-[30px]",
                i === 0 ? "lg:border-l-0 lg:pl-0" : "",
                i === DELIVERABLES.length - 1 ? "lg:pr-0" : "",
              ].join(" ")}
            >
              <span
                className="h-[5px] w-[5px] flex-none rotate-45 bg-gold-soft"
                aria-hidden
              />
              <span>{d}</span>
            </h2>
          ))}
        </div>
      </div>
    </section>
  );
}
