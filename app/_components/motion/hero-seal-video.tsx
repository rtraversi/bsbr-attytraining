"use client";

import { useEffect, useRef, useState } from "react";

// The hero seal's one-time spin: a coin turn, a sparkle, then the "I" lights up
// and holds. Added 2026-10-29 (Rob). Rendered with Higgsfield (Seedance 2.5
// image-to-video) from scripts/higgsfield/jobs/seal-spin-final.json.
//
// The still mark is always rendered and stays the fallback: it is what SSR
// paints, what reduced-motion visitors see, and what shows until the video is
// actually playing. Only then does the video fade in over it.
//
// The video is a 16:9 frame with the mark at 360/1280 of its width (its start
// frame is scripts/higgsfield/assets/seal-start.png), so it is drawn at 1280/360 of the seal's
// width and centred on it; the radial mask fades its rectangle into the
// brushed-metal ground, since an mp4 has no alpha. It overflows the seal box on
// purpose — #hero-seal's own box is what the page ribbon measures, so that box
// must not change size.
const MARK_FRACTION = 360 / 1280;

export function HeroSealVideo({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setEnabled(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    // Autoplay can be refused (iOS Low Power Mode, some data savers); the still
    // mark simply stays up in that case.
    if (enabled) ref.current?.play().catch(() => {});
  }, [enabled]);

  return (
    <>
      <div className={`transition-opacity duration-300 ${playing ? "opacity-0" : "opacity-100"}`}>{children}</div>
      {enabled && (
        <video
          ref={ref}
          src="/brand/iurix-seal-spin.mp4"
          muted
          playsInline
          preload="auto"
          aria-hidden
          onPlaying={() => setPlaying(true)}
          className={`hero-seal-video pointer-events-none absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${playing ? "opacity-100" : "opacity-0"}`}
          style={{ width: `${100 / MARK_FRACTION}%` }}
        />
      )}
    </>
  );
}
