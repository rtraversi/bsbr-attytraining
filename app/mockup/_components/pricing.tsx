"use client"

import { useState } from "react"
import { Check, Minus, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/app/mockup/_components/reveal"

function perSeatRate(seats: number): number {
  if (seats >= 25) return 28
  if (seats >= 10) return 32
  return 35
}

const INCLUDED = [
  "Full 30-minute training per person",
  "All six compliance modules",
  "Completion tracking for your file",
  "Content updates as guidance evolves",
  "Firm-wide access, one standard",
]

export function Pricing() {
  const [seats, setSeats] = useState(10)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

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
        body: JSON.stringify({ seats }),
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
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Pricing</p>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Simple per-seat pricing
        </h2>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
          One flat price per person. Add a seat for everyone who touches client work — attorneys,
          paralegals, and staff.
        </p>
      </Reveal>

      <Reveal className="mx-auto mt-14 max-w-lg">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-secondary/50 px-6 py-6 text-center sm:px-8">
            <span className="text-sm font-medium text-muted-foreground">Per seat</span>
            <div className="mt-1 flex items-end justify-center gap-1">
              <span className="text-5xl font-semibold tracking-tight text-foreground">
                ${rate}
              </span>
              <span className="mb-1.5 text-sm text-muted-foreground">/ person</span>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <ul className="space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <label
                htmlFor="seats"
                className="text-sm font-medium text-foreground"
              >
                Number of seats
              </label>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-border">
                  <button
                    type="button"
                    onClick={() => updateSeats(seats - 1)}
                    className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
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
                    className="h-11 w-16 border-x border-border bg-transparent text-center text-base font-medium text-foreground outline-none focus:ring-2 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateSeats(seats + 1)}
                    className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    disabled={seats >= 500}
                    aria-label="Increase seats"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-2xl font-semibold tracking-tight text-foreground">
                    ${total.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="mt-6 h-11 w-full rounded-full text-sm"
              onClick={handleCheckout}
              disabled={loading}
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
    </section>
  )
}
