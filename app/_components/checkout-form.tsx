"use client";

import { useState } from "react";
import { CURRENT_TERMS_VERSION } from "@/lib/legal/terms";

export default function CheckoutForm() {
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // US-only (Katy): all training and certification data stays in the US, and
  // Stripe Checkout has no billing-country allowlist to enforce it for us.
  const [isUsFirm, setIsUsFirm] = useState(false);
  // ix-termsaccept. This component is currently referenced by nothing, but it
  // posts to the REAL /api/checkout, so it carries the same gate as /pricing.
  // Without it the server refuses with terms_not_accepted and the form simply
  // breaks the moment anyone wires it up.
  const [termsAccepted, setTermsAccepted] = useState(false);

  const pricePerSeat = seats >= 25 ? 28 : seats >= 10 ? 32 : 35;
  const total = seats * pricePerSeat;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seats,
          billingCountry: isUsFirm ? "US" : "",
          termsAccepted,
          termsVersion: CURRENT_TERMS_VERSION,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to start checkout. Please try again.");
      }

      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <label
          htmlFor="seats"
          className="text-sm font-medium text-gray-700 whitespace-nowrap"
        >
          Number of staff
        </label>
        <input
          id="seats"
          type="number"
          min={1}
          max={500}
          value={seats}
          onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <p className="text-sm text-gray-500">
        {seats} {seats === 1 ? "user" : "users"} × ${pricePerSeat}/yr ={" "}
        <span className="font-semibold text-gray-800">${total}/yr</span>
      </p>

      <label className="flex max-w-sm cursor-pointer items-start gap-2.5 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={isUsFirm}
          onChange={(e) => setIsUsFirm(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          My firm is based in the United States.{" "}
          <span className="text-gray-400">
            IURIX is available to US firms only — all data is held in the US.
          </span>
        </span>
      </label>

      <label className="flex max-w-sm cursor-pointer items-start gap-2.5 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          I have read and agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">
            Terms of Service
          </a>
          ,{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">
            Privacy Policy
          </a>
          , and I am authorised to accept them for my firm.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !isUsFirm || !termsAccepted}
        className="mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl px-8 py-3 text-base transition-colors"
      >
        {loading ? "Redirecting…" : "Get Started"}
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <p className="text-xs text-gray-400 mt-1">
        Secure checkout via Stripe. You can adjust seat count at checkout.
      </p>
    </form>
  );
}
