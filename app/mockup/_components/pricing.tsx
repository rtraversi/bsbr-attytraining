"use client"

import { useState } from "react"
import { Check, Minus, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/app/mockup/_components/reveal"

const BANDS = [
  { label: "1–9 seats", rate: 35, min: 1 },
  { label: "10–24 seats", rate: 32, min: 10 },
  { label: "25+ seats", rate: 28, min: 25 },
]

function perSeatRate(seats: number): number {
  if (seats >= 25) return 28
  if (seats >= 10) return 32
  return 35
}

const INCLUDED = [
  "Full 30-minute course per person",
  "All five lessons, fully interactive",
  "Completion tracking for your file",
  "Content updates as guidance evolves",
  "Firm-wide access, one standard",
]

export function Pricing() {
  const [seats, setSeats] = useState(10)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isUsFirm, setIsUsFirm] = useState(false)

  const rate = perSeatRate(seats)
  const total = seats * rate

  const updateSeats = (next: number) => {
    setSeats(Math.max(1, Math.min(500, next)))
  }

  const handleCheckout = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seats, billingCountry: isUsFirm ? "US" : "" }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
        return
      }
      setMessage(data.error ?? "Something went wrong. Please try again.")
    } catch {
      setMessage("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="pricing" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(560px circle at 10% 15%, color-mix(in oklch, var(--mk-coral) 8%, transparent), transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p
            className="text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--mk-amber-deep)" }}
          >
            Pricing
          </p>
          <h2 className="mk-display mt-3 text-balance text-4xl leading-tight text-foreground sm:text-5xl">
            Per-seat pricing that scales <em style={{ color: "var(--primary)" }}>with</em> the
            firm
          </h2>
          <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Volume bands, billed annually. Add a seat for everyone who touches client work —
            attorneys, paralegals, and staff.
          </p>
        </Reveal>

        <Reveal className="mx-auto mt-14 max-w-lg">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-30px_rgba(30,60,60,0.3)]">
            <div className="border-b border-border bg-secondary/60 px-6 py-6 text-center sm:px-8">
              <span className="text-sm font-medium text-muted-foreground">Per seat / year</span>
              <div
                key={rate}
                className="mt-1 flex items-end justify-center gap-1.5"
                style={{ animation: "fadeRise 0.3s ease" }}
              >
                <span className="mk-display text-6xl text-foreground tabular-nums">${rate}</span>
                <span className="mb-2 text-sm text-muted-foreground">/ person</span>
              </div>

              {/* volume band meter — live-highlights the active band */}
              <div
                className="mt-5 grid grid-cols-3 gap-2"
                role="group"
                aria-label="Volume pricing bands"
              >
                {BANDS.map((band) => (
                  <button
                    key={band.label}
                    type="button"
                    onClick={() => updateSeats(band.min)}
                    aria-pressed={rate === band.rate}
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-xs font-medium transition-all duration-200",
                      rate === band.rate
                        ? "border-transparent bg-[color-mix(in_oklch,var(--mk-amber)_28%,var(--card))] text-foreground shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    <span className="block">{band.label}</span>
                    <span className="mt-0.5 block text-sm font-semibold tabular-nums">
                      ${band.rate}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <ul className="space-y-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: "color-mix(in oklch, var(--primary) 12%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <label htmlFor="seats" className="text-sm font-medium text-foreground">
                  Number of seats
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center overflow-hidden rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => updateSeats(seats - 1)}
                      className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
                      disabled={seats <= 1}
                      aria-label="Decrease seats"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <input
                      id="seats"
                      type="number"
                      min={1}
                      max={500}
                      value={seats}
                      onChange={(e) => updateSeats(Number.parseInt(e.target.value, 10) || 1)}
                      className="h-11 w-16 border-x border-border bg-transparent text-center text-base font-medium text-foreground tabular-nums outline-none focus:ring-2 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateSeats(seats + 1)}
                      className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
                      disabled={seats >= 500}
                      aria-label="Increase seats"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-xs text-muted-foreground">Total / yr</div>
                    <div className="mk-display text-3xl text-foreground tabular-nums">
                      ${total.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* US-only declaration. /mockup is a design surface but it posts
                  to the REAL /api/checkout and can take real money, so it
                  carries the same gate as /pricing rather than a decorative
                  copy of one. */}
              <label className="mt-6 flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={isUsFirm}
                  onChange={(e) => setIsUsFirm(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>
                  My firm is based in the United States. IURIX is available to US firms only —
                  all training and certification data is held in the US.
                </span>
              </label>

              <Button
                size="lg"
                className="mt-4 h-12 w-full rounded-xl text-[0.95rem]"
                onClick={handleCheckout}
                disabled={loading || !isUsFirm}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />
                    Starting checkout…
                  </>
                ) : (
                  `Enroll ${seats} ${seats === 1 ? "seat" : "seats"}`
                )}
              </Button>

              {message && (
                <p className="mt-3 text-center text-sm text-muted-foreground" role="status">
                  {message}
                </p>
              )}

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Secure checkout via Stripe. Need a firm-wide quote?{" "}
                <a href="#" className="font-medium text-primary hover:underline">
                  Contact us
                </a>
                .
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
