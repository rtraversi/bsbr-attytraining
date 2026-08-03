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
      <div className="border border-mint-line bg-white p-8 md:p-12">
        <label
          htmlFor="seats"
          className="block text-[11px] font-medium uppercase tracking-[0.2em] text-ink-mute"
        >
          How many staff members?
        </label>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="font-gyrotrope text-6xl font-normal tabular-nums text-ink md:text-7xl">
            {seats}
          </span>
          <span className="text-ink-mute">
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
            [&::-webkit-slider-thumb]:bg-teal-deep [&::-webkit-slider-thumb]:shadow-md
            [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-teal-deep"
          style={{
            background: `linear-gradient(to right, #2b3334 ${fillPct}%, #d0e5e0 ${fillPct}%)`,
          }}
        />
        <div className="mt-2 flex justify-between text-xs text-ink-mute">
          <span>1</span>
          <span>{SLIDER_MAX}+</span>
        </div>

        {/* Volume bands */}
        <div className="mt-10 grid gap-2 sm:grid-cols-3">
          {BANDS.map((band, i) => (
            <div
              key={band.label}
              className={`border p-4 transition-colors ${
                i === activeBand
                  ? "border-gold bg-marble-deep"
                  : "border-mint-line bg-transparent"
              }`}
            >
              <p
                className={`text-sm ${
                  i === activeBand ? "text-ink" : "text-ink-mute"
                }`}
              >
                {band.label}
              </p>
              <p
                className={`mt-1 font-mono text-lg ${
                  i === activeBand ? "text-ink" : "text-ink-mute"
                }`}
              >
                ${band.rate}
                <span className="text-xs text-ink-mute">/user/yr</span>
              </p>
            </div>
          ))}
        </div>

        {/* Total — monospace odometer */}
        <div className="mt-10 flex flex-col gap-2 border-t border-mint-line pt-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-ink-mute">
              <span className="font-mono tabular-nums text-ink-soft">{seats}</span> ×{" "}
              <span className="font-mono tabular-nums text-ink-soft">${rate}</span> / user / year
            </p>
            <p className="mt-1 text-xs text-ink-mute">
              Billed annually. Flat on renewal.
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-5xl font-medium tabular-nums text-ink md:text-6xl">
              ${total.toLocaleString()}
            </span>
            <span className="ml-1 text-sm text-ink-mute">/yr</span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={startCheckout}
          disabled={loading}
          className="mt-8 w-full rounded-[1px] bg-teal-deep px-8 py-4 text-base font-medium text-marble transition-colors hover:bg-ink disabled:opacity-60"
        >
          {loading ? "Redirecting to checkout…" : "Get started"}
        </button>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

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
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          <strong className="font-semibold text-ink">
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

        <p className="mt-3 text-xs leading-relaxed text-ink-mute">
          Secure checkout via Stripe — you can fine-tune the seat count there, which will
          change the amount above. Refunds available within 14 days of purchase and only
          if no certificate has yet been issued. Once any certificate is issued, the
          purchase is non-refundable.
        </p>
      </div>
    </div>
  );
}
