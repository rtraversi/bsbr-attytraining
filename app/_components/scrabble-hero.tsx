"use client";

import { useEffect, useRef, useState } from "react";

// Standard Scrabble point values
const POINTS: Record<string, number> = {
  A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8, K:5,
  L:1, M:3, N:1, O:1, P:3, Q:10, R:1, S:1, T:1, U:1,
  V:4, W:4, X:8, Y:4, Z:10,
};

const ROW1 = [..."TRAINING"];
const ROW2 = [..."MADE"];

// Three phases for the cycling word row
const PHASES = [
  [..."EASY"],
  [..."SIMPLE"],
  ["F", "O", "R", " ", "Y", "O", "U"],
] as const;

type Phase = 0 | 1 | 2;

// ─── Single tile ──────────────────────────────────────────────────────────────

function Tile({ letter, delay }: { letter: string; delay: number }) {
  // Spacer tile for the word gap in "FOR YOU"
  if (letter === " ") {
    return (
      <div
        aria-hidden
        className="w-6 sm:w-8 lg:w-10 h-9 sm:h-14 lg:h-16"
      />
    );
  }

  return (
    <div
      className="relative flex items-center justify-center select-none
                 w-9 h-9 sm:w-14 sm:h-14 lg:w-16 lg:h-16
                 rounded-[3px] sm:rounded-[4px]"
      style={{
        background: "#F7F0D8",
        border: "1px solid rgba(0,0,0,0.11)",
        boxShadow:
          "0 2px 0 rgba(0,0,0,0.20), 0 4px 12px rgba(0,0,0,0.06)",
        animation: `tile-in 0.46s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
      }}
    >
      {/* Letter */}
      <span className="font-fraunces font-bold leading-none text-[#1A1A1A] text-base sm:text-[26px] lg:text-[30px]">
        {letter}
      </span>
      {/* Point value */}
      <span className="absolute bottom-[2px] right-[3px] sm:bottom-[3px] sm:right-[4px] font-dm-sans font-semibold leading-none text-[#1A1A1A]/55 text-[7px] sm:text-[9px]">
        {POINTS[letter]}
      </span>
    </div>
  );
}

// ─── Row of tiles ─────────────────────────────────────────────────────────────

function TileRow({
  letters,
  baseDelay,
  phaseKey,
}: {
  letters: readonly string[];
  baseDelay: number;
  phaseKey?: number; // when present, key triggers remount → re-animates on change
}) {
  return (
    <div
      key={phaseKey}
      className="flex items-center gap-[3px] sm:gap-[4px] lg:gap-[5px]"
    >
      {letters.map((l, i) => (
        <Tile key={i} letter={l} delay={baseDelay + i * 55} />
      ))}
    </div>
  );
}

// ─── Hero section ─────────────────────────────────────────────────────────────

export default function ScrabbleHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>(0);

  // Track scroll progress through the 280vh section → cycle the word
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    function onScroll() {
      const { top, height } = el!.getBoundingClientRect();
      const scrollable = height - window.innerHeight;
      if (scrollable <= 0) return;
      const progress = Math.max(0, Math.min(1, -top / scrollable));

      const next: Phase = progress < 0.34 ? 0 : progress < 0.67 ? 1 : 2;
      setPhase((prev) => (prev === next ? prev : next));
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const row3 = PHASES[phase];
  // Initial entrance: row 3 starts after rows 1 + 2 have animated in
  // On swap: starts immediately at 0ms (re-enter feels instant)
  const row3BaseDelay = phase === 0 ? 660 : 0;

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: "280vh", background: "var(--brand-bg)" }}
    >
      {/* ── Sticky viewport panel ── */}
      <div className="sticky top-0 h-screen flex flex-col overflow-hidden">

        {/* Subtle warm background glows that make frosted glass visible */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 70% 60% at 18% 35%, rgba(200,120,58,0.11) 0%, transparent 60%),
              radial-gradient(ellipse 60% 70% at 82% 68%, rgba(139,69,19,0.08) 0%, transparent 58%),
              radial-gradient(ellipse 40% 40% at 50% 90%, rgba(200,120,58,0.05) 0%, transparent 60%)
            `,
          }}
        />

        {/* ── Nav ── */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 h-14 shrink-0">
          <span className="font-fraunces font-bold text-[#1A1A1A] text-lg tracking-tight">
            Built Smart by Rob
          </span>
          <a
            href="/login"
            className="font-dm-sans text-sm text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition-colors duration-150"
          >
            Sign in
          </a>
        </nav>

        {/* ── Centered hero content ── */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-4 gap-7 sm:gap-8">

          {/* Eyebrow */}
          <p className="font-dm-sans text-[11px] sm:text-xs tracking-[0.20em] uppercase font-semibold text-[#C8783A]">
            ABA Model Rule 5.3 Compliance
          </p>

          {/* Frosted glass scrabble board */}
          <div
            className="flex flex-col items-center gap-[3px] sm:gap-[4px] lg:gap-[5px] p-5 sm:p-7 lg:p-9 rounded-2xl sm:rounded-3xl"
            style={{
              background: "rgba(255, 255, 255, 0.28)",
              backdropFilter: "blur(24px) saturate(130%)",
              WebkitBackdropFilter: "blur(24px) saturate(130%)",
              border: "1px solid rgba(255, 255, 255, 0.55)",
              boxShadow:
                "0 8px 48px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.72)",
            }}
          >
            {/* Row 1: TRAINING */}
            <TileRow letters={ROW1} baseDelay={0} />

            {/* Row 2: MADE */}
            <TileRow letters={ROW2} baseDelay={440} />

            {/* Row 3: cycling — key change forces remount → re-animation */}
            <div key={phase}>
              <TileRow letters={row3} baseDelay={row3BaseDelay} phaseKey={phase} />
            </div>
          </div>

          {/* Subheadline */}
          <p className="font-dm-sans text-[15px] sm:text-[17px] text-[#1A1A1A]/58 text-center max-w-[340px] sm:max-w-md leading-relaxed">
            Staff complete training in 30 minutes.
            <br className="hidden sm:block" />
            Automatic PDF certificates. No operator involvement.
          </p>

          {/* CTA */}
          <a
            href="#how-it-works"
            className="btn-primary text-sm sm:text-[15px] px-7 sm:px-9 py-3"
          >
            How it works
            <span aria-hidden className="ml-1">→</span>
          </a>
        </div>

        {/* ── Scroll indicator ── */}
        <div className="relative shrink-0 flex flex-col items-center gap-2 pb-7 opacity-25">
          <span className="font-dm-sans text-[10px] tracking-[0.22em] uppercase text-[#1A1A1A]">
            Scroll
          </span>
          <div
            className="w-px h-6"
            style={{
              background: "linear-gradient(to bottom, #1A1A1A 0%, transparent 100%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
