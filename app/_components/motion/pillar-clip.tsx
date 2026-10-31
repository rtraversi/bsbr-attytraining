"use client";

import { useEffect, useRef, useState } from "react";

// A short clip in the open space of a pillar flip card, played while the card is
// hovered or keyboard-focused, front face up. Added 2026-10-31 (Rob). Rendered
// with Higgsfield (Seedance 2.5 text-to-video, 480p, 21:9) from
// scripts/higgsfield/jobs/pillar-<name>.json, then re-encoded to ~50-90 KB.
//
// The clip's last frame is always rendered as a still, so the card has its
// picture at rest, on touch screens (Rob: no animation there) and under reduced
// motion. Only hover-capable pointers get the video; it fades in over the still
// once it is actually playing and fades out when the pointer leaves.
//
// The clips are shot on a pale mint-white ground; .pillar-clip in globals.css
// brightens each one and multiplies it into the card, so the ground disappears
// and only the subject and its shadow are left.
export function PillarClip({ name }: { name: string }) {
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setEnabled(
      window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches,
    );
  }, []);

  useEffect(() => {
    const video = ref.current;
    const card = video?.closest(".flip-card");
    if (!video || !card) return;

    const start = () => {
      if (card.classList.contains("is-flipped")) return;
      video.currentTime = 0;
      video.play().catch(() => {});
    };
    const stop = () => {
      video.pause();
      setPlaying(false);
    };
    const focus = () => card.matches(":focus-visible") && start();

    card.addEventListener("pointerenter", start);
    card.addEventListener("pointerleave", stop);
    card.addEventListener("focus", focus);
    card.addEventListener("blur", stop);
    return () => {
      card.removeEventListener("pointerenter", start);
      card.removeEventListener("pointerleave", stop);
      card.removeEventListener("focus", focus);
      card.removeEventListener("blur", stop);
    };
  }, [enabled]);

  return (
    <span className={`pillar-clip pillar-clip-${name}`} aria-hidden>
      <img src={`/brand/pillars/${name}.webp`} alt="" />
      {enabled && (
        <video
          ref={ref}
          src={`/brand/pillars/${name}.mp4`}
          muted
          playsInline
          preload="auto"
          onPlaying={() => setPlaying(true)}
          className={playing ? "opacity-100" : "opacity-0"}
        />
      )}
    </span>
  );
}
