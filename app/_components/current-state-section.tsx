"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

// Brief §3.2 — the "Under the ABA Model Rule 5.3" hook.
// noir.io mechanism (LOCKED): the headline reveal is *scrubbed* to scroll position
// (useScroll + useTransform), not a one-time fade — a staggered per-word reveal plus
// a drawn-in underline (pathLength full→drawn) tied continuously to the scrollbar.
// Dot-grid + alignment-marker backdrop (readme.com). No fabricated cards (brief §1/§3).

const HEADLINE_WORDS = ["Under", "the", "ABA", "Model", "Rule", "5.3"];

function RevealWord({
  word,
  index,
  total,
  progress,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  // Each word occupies a staggered slice of the scroll progress.
  const start = (index / total) * 0.6;
  const end = start + 0.4;
  const opacity = useTransform(progress, [start, end], [0.12, 1]);
  const y = useTransform(progress, [start, end], [34, 0]);
  return (
    <motion.span style={{ opacity, y }} className="mr-[0.28em] inline-block">
      {word}
    </motion.span>
  );
}

// Small alignment "+" markers scattered on the dot grid.
function Marker({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute text-white/20 ${className}`}
    >
      +
    </span>
  );
}

export function CurrentStateSection() {
  const headlineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: headlineRef,
    offset: ["start 0.85", "start 0.2"],
  });

  // Underline draws itself in as the headline scrolls up (scrubbed).
  const drawLength = useTransform(scrollYProgress, [0.35, 1], [0, 1]);

  return (
    <section className="relative overflow-hidden bg-black py-28 text-white md:py-44">
      {/* dot-grid backdrop (readme.com), faded at the edges */}
      <div
        className="athena-dotgrid pointer-events-none absolute inset-0 opacity-70"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, black 40%, transparent 100%)",
        }}
      />
      <Marker className="left-[8%] top-[18%] text-lg" />
      <Marker className="right-[12%] top-[26%] text-lg" />
      <Marker className="left-[20%] bottom-[22%] text-lg" />
      <Marker className="right-[9%] bottom-[16%] text-lg" />

      <div className="relative mx-auto max-w-[1200px] px-6 md:px-10">
        {/* lead-in — sentence case, no letter-spacing (brief §1 no-all-caps rule) */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="font-headline mb-8 text-lg text-white/50"
        >
          Compliance, documented.
        </motion.p>

        {/* giant statement — scrubbed per-word reveal + drawn-in underline */}
        <div ref={headlineRef} className="relative inline-block">
          <h2 className="font-headline max-w-[16ch] text-[clamp(2.75rem,7vw,6.5rem)] font-medium leading-[0.95] tracking-tight">
            {HEADLINE_WORDS.map((w, i) => (
              <RevealWord
                key={`${w}-${i}`}
                word={w}
                index={i}
                total={HEADLINE_WORDS.length}
                progress={scrollYProgress}
              />
            ))}
          </h2>

          {/* hand-drawn underline beneath the last line */}
          <svg
            className="mt-4 h-3 w-full max-w-[22ch]"
            viewBox="0 0 400 12"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden
          >
            <motion.path
              d="M2 8 C 80 2, 160 2, 240 6 S 360 12, 398 4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ pathLength: drawLength }}
            />
          </svg>
        </div>

        {/* CTA — the site always invites action (brief §3) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-16 flex flex-wrap items-center gap-4 md:mt-24"
        >
          <Link
            href="/pricing"
            className="athena-pill-solid font-headline px-7 py-3 text-base font-medium"
          >
            Get your team certified
          </Link>
          <Link
            href="/pricing"
            className="font-headline text-sm text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            See pricing →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
