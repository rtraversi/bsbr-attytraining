"use client";

import { useMemo, useState } from "react";

// Cofounder.co mechanism (brief §3.4): drag the seat slider → live cost breakdown
// → big monospace total. Volume pricing — ALL seats bill at the band rate the
// headcount lands in (CLAUDE.md), flat on renewal.

const BANDS = [
  { min: 1, max: 9, rate: 35, label: "1–9 staff" },
  { min: 10, max: 24, rate: 32, label: "10–24 staff" },
  { min: 25, max: Infinity, rate: 28, label: "25+ staff" },
];

const SLIDER_MAX = 100;

function rateFor(seats: number) {
  return seats >= 25 ? 28 : seats >= 10 ? 32 : 35;
}

export function PricingSlider() {
  const [seats, setSeats] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rate = useMemo(() => rateFor(seats), [seats]);
  const total = seats * rate;
  const activeBand = BANDS.findIndex((b) => seats >= b.min && seats <= b.max);

  // Fill the range track up to the thumb (monochrome).
  const fillPct = ((seats - 1) / (SLIDER_MAX - 1)) * 100;

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seats }),
      });
      if (!res.ok) throw new Error("Could not start checkout. Please try again.");
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm md:p-12">
        <label
          htmlFor="seats"
          className="font-headline block text-sm uppercase tracking-[0.2em] text-white/50"
        >
          How many staff members?
        </label>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="font-headline text-6xl font-medium tabular-nums text-white md:text-7xl">
            {seats}
          </span>
          <span className="text-white/50">
            {seats === 1 ? "seat" : "seats"}
          </span>
        </div>

        {/* Slider */}
        <input
          id="seats"
          type="range"
          min={1}
          max={SLIDER_MAX}
          value={seats}
          onChange={(e) => setSeats(parseInt(e.target.value))}
          className="mt-8 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none
            [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg
            [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white"
          style={{
            background: `linear-gradient(to right, #ffffff ${fillPct}%, rgba(255,255,255,0.12) ${fillPct}%)`,
          }}
        />
        <div className="mt-2 flex justify-between text-xs text-white/30">
          <span>1</span>
          <span>{SLIDER_MAX}+</span>
        </div>

        {/* Volume bands */}
        <div className="mt-10 grid gap-2 sm:grid-cols-3">
          {BANDS.map((band, i) => (
            <div
              key={band.label}
              className={`rounded-lg border p-4 transition-colors ${
                i === activeBand
                  ? "border-white/30 bg-white/[0.06]"
                  : "border-white/10 bg-transparent"
              }`}
            >
              <p
                className={`font-headline text-sm ${
                  i === activeBand ? "text-white" : "text-white/40"
                }`}
              >
                {band.label}
              </p>
              <p
                className={`mt-1 font-mono text-lg ${
                  i === activeBand ? "text-white" : "text-white/40"
                }`}
              >
                ${band.rate}
                <span className="text-xs text-white/40">/user/yr</span>
              </p>
            </div>
          ))}
        </div>

        {/* Total — monospace odometer */}
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-white/50">
              <span className="font-mono tabular-nums text-white/80">{seats}</span> ×{" "}
              <span className="font-mono tabular-nums text-white/80">${rate}</span> / user / year
            </p>
            <p className="mt-1 text-xs text-white/40">
              Billed annually. Flat on renewal.
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-5xl font-medium tabular-nums text-white md:text-6xl">
              ${total.toLocaleString()}
            </span>
            <span className="ml-1 text-sm text-white/50">/yr</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={startCheckout}
          disabled={loading}
          className="athena-pill-solid font-headline mt-8 w-full px-8 py-4 text-base font-medium disabled:opacity-60"
        >
          {loading ? "Redirecting to checkout…" : "Get started"}
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {/* Auto-renewal disclosure — REQUIRED BEFORE PAYMENT, do not move below
            the fold or fold into the refund sentence.

            Checkout runs in mode: "subscription", so every firm auto-renews
            annually until it cancels. Nothing disclosed that before the charge:
            the page mentioned renewal only as a price fact ("Flat on renewal"),
            which tells a buyer what a renewal COSTS while never saying one will
            happen. US auto-renewal statutes generally expect clear disclosure
            before the charge, so this is a legal requirement rather than a copy
            preference (Max: "we HAVE to be extremely clear about autorenewal").

            The figures are the live slider values, not hardcoded, so the notice
            always states the amount the buyer is actually about to authorise. */}
        <p className="mt-4 text-xs leading-relaxed text-white/60">
          <strong className="font-semibold text-white/80">
            This is an automatically renewing annual subscription.
          </strong>{" "}
          You will be charged{" "}
          <span className="font-mono tabular-nums">${total.toLocaleString()}</span> today
          ({seats} {seats === 1 ? "seat" : "seats"} × ${rate} per user per year), and the
          same amount again on the same date each year unless you cancel. Your card is
          charged automatically. You can cancel auto-renewal at any time from Settings →
          Billing in your dashboard; cancelling stops future charges and keeps the
          certificates you have already earned.
        </p>

        <p className="mt-3 text-xs leading-relaxed text-white/40">
          Secure checkout via Stripe — you can fine-tune the seat count there, which will
          change the amount above. Refunds available within 14 days of purchase and only
          if no certificate has yet been issued. Once any certificate is issued, the
          purchase is non-refundable.
        </p>
      </div>
    </div>
  );
}
