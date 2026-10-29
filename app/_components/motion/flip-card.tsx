"use client";

import { useState, type ReactNode } from "react";

// A card that turns over on click, tap, Enter or Space. Added 2026-10-29 (Rob).
//
// Both faces sit in the same grid cell, so the card is as tall as its taller face
// and neither side clips — no fixed heights to keep in sync with the copy. The
// hidden face is aria-hidden so a screen reader reads the side that is showing.
// No borders on either face (CLAUDE.md: no contours); depth is shadow only.
export function FlipCard({
  front,
  back,
  className = "",
}: {
  front: ReactNode;
  back: ReactNode;
  className?: string;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={flipped}
      onClick={() => setFlipped((f) => !f)}
      className={`flip-card ${flipped ? "is-flipped" : ""} ${className}`}
    >
      <span className="flip-card-inner">
        <span className="flip-face flip-front" aria-hidden={flipped}>
          {front}
        </span>
        <span className="flip-face flip-back" aria-hidden={!flipped}>
          {back}
        </span>
      </span>
    </button>
  );
}

// The "turn over" hint at the foot of each face.
export function FlipHint({ children }: { children: ReactNode }) {
  return (
    <span className="flip-hint">
      <svg viewBox="0 0 16 16" aria-hidden>
        <path d="M13.5 6.5A5.5 5.5 0 1 0 13 10.6" />
        <path d="M13.8 2.8v3.9H9.9" />
      </svg>
      {children}
    </span>
  );
}
