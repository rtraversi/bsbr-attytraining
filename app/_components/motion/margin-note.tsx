"use client";

import { useEffect, useRef, useState } from "react";

// A pen-written note in the margin, with a hand-drawn arrow at what it is about.
// Added 2026-10-29 (Rob), borrowed as a technique from the "Click here" arrows on
// mystudyguide.ai and re-drawn as a partner's annotation rather than a doodle.
//
// The words write themselves in left to right, then the arrow draws. Two triggers:
//   "load"   pure CSS keyframes with a delay — for the hero, where it must play
//            without waiting on hydration and must not flash visible first.
//   "scroll" starts drawn (so the server render and a no-JS visitor see it
//            complete); on mount, a note that is below the fold is hidden and
//            then written in when it scrolls into view.
// Reduced motion: always drawn, never animated (globals.css).
//
// ⚠️ Every note must say something TRUE that the page already says. These are
// annotations, not new claims — never put a number or promise here that the
// copy around it does not already carry.

// One arrow, drawn pointing down-left. The other directions are CSS flips of it.
const ARROW = "M70 6 C52 2 30 10 10 38 M10 38 L12 26 M10 38 L21 33";

type Point = "down-left" | "down-right" | "up-left";

export function MarginNote({
  text,
  point,
  arrowFirst = false,
  tone = "light",
  trigger = "scroll",
  nudge = false,
  className = "",
}: {
  text: string;
  point: Point;
  /** Draw the arrow before the words (arrow on the left). */
  arrowFirst?: boolean;
  tone?: "light" | "dark";
  trigger?: "scroll" | "load";
  /** After drawing, the arrow keeps gesturing at its target every few seconds. */
  nudge?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (trigger !== "scroll") return;
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setPending(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPending(false);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [trigger]);

  const arrow = (
    <span className={nudge ? "note-nudge" : undefined}>
      <svg viewBox="0 0 74 46" className={`note-arrow note-${point}`}>
        <path pathLength={1} d={ARROW} />
      </svg>
    </span>
  );

  return (
    <span
      ref={ref}
      aria-hidden
      className={[
        "margin-note",
        tone === "dark" ? "margin-note-dark" : "",
        trigger === "load" ? "margin-note-onload" : "",
        pending ? "is-pending" : "",
        className,
      ].join(" ")}
    >
      {arrowFirst && arrow}
      <span className="note-text">{text}</span>
      {!arrowFirst && arrow}
    </span>
  );
}
