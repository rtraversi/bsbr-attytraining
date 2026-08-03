import Link from "next/link";

// Closing call to action — the deep-teal anchor at the foot of the page.
//
// This section REPLACES the retired "coming soon" block and the "Be first in
// line" email waitlist. The product is live and purchasable: do not reintroduce
// a waitlist, a launch countdown, or a "notify me" form here (03-copy.md).
//
// The approved copy pairs this with a secondary "Talk to us first" action. It is
// omitted until there is a contact address to send it to — the email is still
// [TBD] and the brief is explicit that placeholders must not be invented.
export function ClosingCta() {
  return (
    <section className="relative overflow-hidden bg-teal-deep py-20 md:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_78%_25%,rgba(179,144,130,0.22),transparent_62%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-[1140px] px-6 md:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold-pale">
              Enrol now
            </p>
            <h2 className="font-gyrotrope mt-4 text-[clamp(30px,4vw,46px)] font-normal leading-[1.1] tracking-[-0.015em] text-marble">
              Certify your team this week.
            </h2>
            <p className="mt-5 max-w-[520px] text-[19px] leading-[1.55] text-mint">
              Choose your seat count, invite your staff, and watch certifications
              complete from your dashboard. Self-serve, start to finish.
            </p>
            <div className="mt-9 flex flex-wrap gap-3.5">
              <Link
                href="/pricing"
                className="rounded-[1px] bg-gold-pale px-6 py-3 text-[15px] font-medium text-teal-deep transition-colors hover:bg-marble"
              >
                Buy seats
              </Link>
              <Link
                href="/login"
                className="rounded-[1px] border border-marble-deep/35 px-6 py-3 text-[15px] font-medium text-marble-deep transition-colors hover:border-marble-deep hover:bg-marble-deep hover:text-teal-deep"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Worked example — tests well with a price-sensitive buyer, and it
              doubles as a plain statement of how volume pricing resolves. */}
          <div className="border border-marble-deep/20 bg-marble-deep/5 px-7 py-8">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-gold-pale">
              A worked example
            </p>
            <dl className="text-[15px]">
              {[
                ["Seats", "6"],
                ["Rate (1–9 band)", "$35 / staff / yr"],
                ["Certificates", "Included"],
                ["Renewal rate", "Unchanged"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between border-b border-marble-deep/12 py-2.5 text-mint"
                >
                  <dt>{k}</dt>
                  <dd className="font-medium text-marble">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between pt-4 text-marble">
                <dt className="font-medium">Billed annually</dt>
                <dd className="font-gyrotrope text-[24px] leading-none">$210</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
