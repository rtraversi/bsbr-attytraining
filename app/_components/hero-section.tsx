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

const FACTS = [
  { label: "Format", value: "Interactive training" },
  { label: "Record", value: "Signed attestations" },
  { label: "Held by", value: "The firm" },
  { label: "Term", value: "12 months" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-silver">
      <div className="mx-auto max-w-[1140px] px-6 pt-16 md:px-8 md:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <h1 className="font-gyrotrope text-[clamp(40px,5.2vw,68px)] font-normal leading-[1.06] tracking-[-0.02em] text-ink">
              The Standard Other Firms
              <br className="hidden sm:block" /> Will Be{" "}
              <em className="font-serif-italic not-italic text-teal-mid">Held To</em>
            </h1>

            {/* Rose-gold hairline — the crescent motif from the mark, reduced to a rule */}
            <div className="mt-9 h-px w-24 bg-gradient-to-r from-gold to-transparent" aria-hidden />

            <p className="mt-8 max-w-[540px] text-[19px] leading-[1.6] text-ink-soft">
              Our times demand that attorneys use artificial intelligence. Clients and
              state bars expect ethical practices.
            </p>
            <p className="mt-4 max-w-[540px] text-[19px] leading-[1.6] text-ink-soft">
              Iurix Accreditation is how a firm shows it meets both — a written policy,
              trained staff, and a signed record to prove it.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3.5">
              <Link
                href="/pricing"
                className="rounded-[2px] bg-teal-ink px-7 py-3.5 text-[15px] font-medium text-marble transition-colors hover:bg-ink"
              >
                Accredit your firm
              </Link>
              <Link
                href="#exposure"
                className="rounded-[2px] border border-steel px-7 py-3.5 text-[15px] font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-marble"
              >
                Why it matters
              </Link>
            </div>

            <p className="mt-6 text-[14px] text-ink-mute">
              $35 per seat, per year. The accreditation belongs to your firm.
            </p>
          </div>

          {/* The mark, held in a ruled plate */}
          <div className="relative mx-auto w-full max-w-[420px] lg:mx-0">
            <div className="relative border border-silver bg-gradient-to-br from-white to-marble-deep px-10 py-12">
              <div
                className="pointer-events-none absolute inset-[6px] border border-mint-line/60"
                aria-hidden
              />
              <img
                src="/brand/iurix-mark.png"
                alt="The Iurix Accreditation mark"
                width={500}
                height={500}
                className="relative mx-auto block w-full max-w-[230px] select-none"
                draggable={false}
              />
              <div className="relative mt-8 border-t border-silver pt-6">
                <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-[13px]">
                  {FACTS.map((f) => (
                    <div key={f.label} className="contents">
                      <dt className="tracking-[0.04em] text-ink-mute">{f.label}</dt>
                      <dd className="text-right font-medium text-ink">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Katy's three-line argument, set as the transition into the page */}
        <div className="mt-20 border-t border-silver pt-10 md:mt-24">
          <p className="max-w-[820px] text-[18px] leading-[1.7] text-ink-soft">
            Clients know that a firm that doesn&apos;t use AI may be missing things, and
            wasting billable hours. They want their lawyers using it. But they also want
            to know their data is safe, and that their attorney is{" "}
            <em className="font-serif-italic not-italic text-ink">
              a competent, zealous advocate — not a figurehead.
            </em>
          </p>
        </div>
      </div>
    </section>
  );
}
