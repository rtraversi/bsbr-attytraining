import Link from "next/link";
import { AtcMark } from "./atc-logo";

// Hero. Headline is Katy's, verbatim. The emphasis on "Held To" carries the
// argument, so it is set in the teal italic rather than left flat.
//
// The right column is the "specimen" — the certificate treated as a printed
// instrument. It exists to answer the brief's second job (prove this is a
// finished, operating product) before the visitor reads a word of body copy.

const DOCKET = [
  { label: "Format", value: "Interactive course" },
  { label: "Assessment", value: "Scored, pass-gated" },
  { label: "Deliverable", value: "Dated PDF certificate" },
  { label: "Validity", value: "12 months" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-mint-line">
      <div className="mx-auto max-w-[1140px] px-6 pt-20 md:px-8 md:pt-24">
        <div className="grid items-start gap-16 lg:grid-cols-[1.25fr_0.75fr] lg:gap-[72px]">
          <div>
            <div className="mb-7 flex items-center gap-3">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep">
                ABA Model Rule 5.3 · Formal Opinion 512
              </span>
              <span
                className="h-px flex-1 bg-gradient-to-r from-gold-pale to-transparent"
                aria-hidden
              />
            </div>

            <h1 className="font-gyrotrope text-[clamp(42px,5.6vw,74px)] font-normal leading-[1.03] tracking-[-0.02em] text-ink">
              The Standard Other Firms
              <br className="hidden sm:block" /> Will Be{" "}
              <em className="font-serif-italic not-italic text-teal-mid">Held To</em>
            </h1>

            <p className="mt-7 max-w-[560px] text-[20px] leading-[1.55] text-ink-soft">
              Our times demand that attorneys use artificial intelligence. Clients and
              state bars expect ethical practices. Iurix Accreditation is how a firm
              shows it meets both.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3.5">
              <Link
                href="/pricing"
                className="rounded-[1px] bg-teal-deep px-6 py-3 text-[15px] font-medium text-marble transition-colors hover:bg-ink"
              >
                Certify your staff
              </Link>
              <Link
                href="#exposure"
                className="rounded-[1px] border border-ink px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-ink hover:text-marble"
              >
                Why this matters
              </Link>
            </div>

            <p className="mt-5 text-[14px] text-ink-mute">
              From $28 per staff member, per year. Certificates issue the moment they
              pass.
            </p>
          </div>

          {/* Specimen — the mark held in a ruled frame, like a plate in a document */}
          <div className="relative border border-mint-line bg-gradient-to-br from-white to-marble-deep px-[30px] py-[34px]">
            <div
              className="pointer-events-none absolute inset-[7px] border border-mint"
              aria-hidden
            />
            <AtcMark className="mx-auto mb-6 block h-auto w-full max-w-[150px] text-teal-deep" />
            <div className="border-t border-mint-line pt-[18px]">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-[9px] text-[13.5px]">
                <dt className="tracking-[0.04em] text-ink-mute">Issued to</dt>
                <dd className="text-right font-medium text-ink">Each staff member</dd>
                <dt className="tracking-[0.04em] text-ink-mute">Accreditation</dt>
                <dd className="text-right font-medium text-ink">Held by the firm</dd>
                <dt className="tracking-[0.04em] text-ink-mute">Standard</dt>
                <dd className="text-right font-medium text-ink">ABA Rule 5.3</dd>
                <dt className="tracking-[0.04em] text-ink-mute">Term</dt>
                <dd className="text-right font-medium text-ink">12 months</dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Docket strip */}
        <div className="mt-[72px] grid grid-cols-2 border-t border-mint-line md:grid-cols-4">
          {DOCKET.map((d, i) => (
            <div
              key={d.label}
              className={`px-[26px] pb-[30px] pt-6 ${
                i < DOCKET.length - 1 ? "md:border-r md:border-mint-line" : ""
              } ${i % 2 === 0 ? "border-r border-mint-line md:border-r" : ""}`}
            >
              <p className="mb-[7px] text-[11px] font-medium uppercase tracking-[0.2em] text-ink-mute">
                {d.label}
              </p>
              <strong className="font-gyrotrope block text-[20px] font-normal leading-[1.3] text-ink">
                {d.value}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
