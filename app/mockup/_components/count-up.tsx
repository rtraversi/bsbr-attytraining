"use client"

import { useEffect, useRef, useState } from "react"

interface CountUpProps {
  to: number
  duration?: number
  suffix?: string
  className?: string
}

/**
 * Counts from 0 to `to` when scrolled into view. Renders the final value
 * immediately for reduced-motion users. All animation state lives outside
 * setState updaters (Strict Mode safe).
 */
export function CountUp({ to, duration = 1400, suffix = "", className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  const [value, setValue] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to)
      return
    }

    let raf = 0
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        observer.disconnect()
        if (started.current) {
          setValue(to)
          return
        }
        started.current = true
        const t0 = performance.now()
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          setValue(Math.round(eased * to))
          if (p < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to, duration])

  return (
    <span ref={ref} className={className}>
      {value}
      {suffix}
    </span>
  )
}
