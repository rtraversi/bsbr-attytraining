import Link from "next/link";

// Closing panel. Katy's sign-off line is the whole section — it is the strongest
// sentence in the copy and earns the space.
//
// This REPLACES the retired "coming soon" block and the "Be first in line" email
// waitlist. The product is live and purchasable: do not reintroduce a waitlist,
// a countdown, or a "notify me" form.
//
// The secondary action from the approved copy ("Talk to us first") now has a real
// destination — info@iurixaccreditation.com, decided 2026-08-03.
export function ClosingCta() {
  return (
    <section className="relative overflow-hidden bg-teal-ink py-24 md:py-32">
      {/* The crescent glow from the mark, as the one warm note on the dark ground */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_65%_at_50%_0%,rgba(146,108,93,0.28),transparent_65%)]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-[1140px] px-6 text-center md:px-8">
        <img
          src="/brand/iurix-mark.png"
          alt=""
          width={326}
          height={326}
          className="mx-auto mb-10 w-[64px] select-none opacity-95"
          draggable={false}
        />

        <p className="font-gyrotrope mx-auto max-w-[860px] text-[clamp(24px,3.2vw,38px)] font-normal leading-[1.35] tracking-[-0.01em] text-marble">
          Built by an attorney. Reviewed by an attorney.{" "}
          <em className="font-serif-italic not-italic text-gold-soft">
            Held to the standard attorneys should meet.
          </em>
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/pricing"
            className="rounded-[2px] bg-marble px-7 py-3.5 text-[15px] font-medium text-teal-ink transition-colors hover:bg-gold-pale"
          >
            Accredit your firm
          </Link>
          <a
            href="mailto:info@iurixaccreditation.com"
            className="rounded-[2px] border border-marble/30 px-7 py-3.5 text-[15px] font-medium text-marble transition-colors hover:border-marble hover:bg-marble hover:text-teal-ink"
          >
            Talk to us first
          </a>
        </div>

        <p className="mt-8 text-[14px] text-silver">
          $35 per seat, per year · Self-serve, start to finish
        </p>
      </div>
    </section>
  );
}
