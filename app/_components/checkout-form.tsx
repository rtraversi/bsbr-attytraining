"use client";

import { useState } from "react";

export default function CheckoutForm() {
  const [seats, setSeats] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ seats }),
      });

      if (!res.ok) {
        throw new Error("Failed to start checkout. Please try again.");
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

      <button
        type="submit"
        disabled={loading}
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
