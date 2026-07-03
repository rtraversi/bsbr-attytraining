"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const NAV = [
  { label: "Overview", href: "#overview" },
  { label: "Curriculum", href: "#curriculum" },
  { label: "Why it matters", href: "#why" },
  { label: "Pricing", href: "#pricing" },
]

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors duration-300",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center border border-foreground/15 bg-card font-mono text-base font-semibold text-primary"
            aria-hidden="true"
          >
            §
          </span>
          <span className="mk-display text-base font-semibold tracking-tight text-foreground">
            Staff Compliance
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {NAV.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              className="group/nav font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="mr-1.5 text-[10px] text-primary/60 transition-colors group-hover/nav:text-primary">
                0{i + 1}
              </span>
              {item.label}
            </a>
          ))}
        </nav>

        <Button size="sm" className="h-9 rounded-md px-4" asChild>
          <a href="#pricing">Train your team</a>
        </Button>
      </div>
    </header>
  )
}
