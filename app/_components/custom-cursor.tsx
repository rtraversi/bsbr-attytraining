"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

// Cuberto-style custom cursor (brief §4) using the provided pixel-arrow asset
// (public/custom-cursor.svg). The SVG is applied as a CSS mask over a white fill so
// it renders white regardless of the file's black strokes. Follows the pointer with
// light spring lag (useMotionValue + useSpring). Hover of interactive targets scales
// it up (the base "morph"). Fails gracefully: only activates on fine-pointer,
// motion-OK devices — otherwise the native cursor is left untouched.

const SIZE = 40; // px

export function CustomCursor() {
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  // Snappy — near-instant follow with just a hair of lag.
  const springConfig = { stiffness: 2200, damping: 90, mass: 0.25 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return; // graceful fallback → keep native cursor

    setActive(true);
    document.documentElement.classList.add("athena-custom-cursor");

    function onMove(e: MouseEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
    }
    function onOver(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      setHovering(!!target?.closest("a, button, [role='button'], input, label"));
    }
    function onLeave() {
      setVisible(false);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      document.documentElement.classList.remove("athena-custom-cursor");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [x, y]);

  if (!active) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999]"
      style={{
        x: springX,
        y: springY,
        width: SIZE,
        height: SIZE,
        // tip sits near the pointer
        marginLeft: -3,
        marginTop: -2,
      }}
      animate={{
        scale: hovering ? 1.5 : 1,
        opacity: visible ? 1 : 0,
      }}
      transition={{ scale: { duration: 0.18 }, opacity: { duration: 0.15 } }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#ffffff",
          maskImage: "url(/custom-cursor.svg)",
          WebkitMaskImage: "url(/custom-cursor.svg)",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskSize: "contain",
          WebkitMaskSize: "contain",
        }}
      />
    </motion.div>
  );
}
