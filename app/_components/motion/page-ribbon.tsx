"use client";

import { useEffect, useRef } from "react";

// The rose-gold ribbon. Added 2026-10-29 (Rob).
//
// One thin line that leaves the hero seal, winds down the page as the visitor
// scrolls, and at the closing panel wraps once round the seal, which then
// "presses" (the .is-sealed class on #close-seal, animated in globals.css). It is
// the product told without words: the policy, the training and the record, bound
// and sealed.
//
// The route is not hard-coded. Each section carries invisible <i data-ribbon="x">
// markers: x is a fraction of the viewport width, y is wherever the marker sits.
// Move a marker to re-route the line; the path is rebuilt on resize and after
// fonts and images load, so it follows the layout at every width.
//
// Stacking: this SVG is z-[1] inside <main>. Section grounds paint below it and
// each section's content wrapper is relative z-[2], so the line passes over the
// backgrounds and behind the text and cards.
//
// Reduced motion: drawn in full, no scroll-linked drawing, no press.

const SOFT = "#d2a68c"; // gold-soft, on the dark hero and closing
const DEEP = "#a9714f"; // gold, on marble

export function PageRibbon() {
  const svgRef = useRef<SVGSVGElement>(null);
  const mainRef = useRef<SVGPathElement>(null);
  const shadowRef = useRef<SVGPathElement>(null);
  const gradRef = useRef<SVGLinearGradientElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const pMain = mainRef.current;
    const pShadow = shadowRef.current;
    const grad = gradRef.current;
    const host = svg?.parentElement;
    if (!svg || !pMain || !pShadow || !grad || !host) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let total = 0;
    let preLen = 0;
    let loopStartY = 0;
    let loopSpan = 1;
    let samples: number[] = [];
    let sealed = false;

    const hostTop = () => host.getBoundingClientRect().top + window.scrollY;
    const yOf = (el: Element) => el.getBoundingClientRect().top + window.scrollY - hostTop();

    // Catmull-Rom through the points, as cubic Béziers. endTangent overrides the
    // last control point so the line arrives at the seal heading straight up,
    // which is the direction the loop leaves in — no kink at the join.
    const curve = (pts: [number, number][], endTangent: [number, number]) => {
      let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] ?? pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] ?? pts[i + 1];
        const c1x = p1[0] + (p2[0] - p0[0]) / 6;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6;
        let c2x = p2[0] - (p3[0] - p1[0]) / 6;
        let c2y = p2[1] - (p3[1] - p1[1]) / 6;
        if (i === pts.length - 2) [c2x, c2y] = endTangent;
        d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
      }
      return d;
    };

    const setDrawn = (len: number) => {
      const off = String(Math.max(0, total - len));
      pMain.style.strokeDashoffset = off;
      pShadow.style.strokeDashoffset = off;
      if (!sealed && !reduce && len >= total - 2) {
        sealed = true;
        document.getElementById("close-seal")?.classList.add("is-sealed");
      }
    };

    const onScroll = () => {
      if (!total) return;
      if (reduce) return setDrawn(total);
      const target = window.scrollY + window.innerHeight * 0.72 - hostTop();
      const atBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      let len: number;
      if (target < samples[samples.length - 1]) {
        let lo = 0;
        let hi = samples.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (samples[mid] < target) lo = mid + 1;
          else hi = mid;
        }
        len = (preLen * lo) / (samples.length - 1);
      } else {
        const t = Math.min(1, Math.max(0, (target - loopStartY) / loopSpan));
        len = preLen + (total - preLen) * t;
      }
      setDrawn(atBottom ? total : len);
    };

    const build = () => {
      const heroSeal = document.getElementById("hero-seal");
      const closeSeal = document.getElementById("close-seal");
      const hero = document.getElementById("hero");
      const closing = document.getElementById("closing");
      if (!heroSeal || !closeSeal || !hero || !closing) return;

      const W = document.documentElement.clientWidth;
      const H = host.offsetHeight;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.style.width = `${W}px`;
      svg.style.height = `${H}px`;

      const hs = heroSeal.getBoundingClientRect();
      const pts: [number, number][] = [
        [hs.left + hs.width * 1.02, yOf(heroSeal) + hs.height * 0.62],
      ];
      host.querySelectorAll<HTMLElement>("[data-ribbon]").forEach((m) => {
        pts.push([parseFloat(m.dataset.ribbon ?? "0.5") * W, yOf(m)]);
      });

      const cs = closeSeal.getBoundingClientRect();
      const cx = cs.left + cs.width / 2;
      const cy = yOf(closeSeal) + cs.height / 2;
      const R = cs.width / 2 + 20;
      pts.push([cx - R * 2.6, cy - R * 1.1], [cx - R * 1.35, cy + R * 0.95], [cx - R, cy]);

      const pre = curve(pts, [cx - R, cy + R * 0.6]);
      const loop =
        ` A${R} ${R} 0 1 1 ${(cx + R).toFixed(1)} ${cy.toFixed(1)}` +
        ` A${R} ${R} 0 1 1 ${(cx - R).toFixed(1)} ${cy.toFixed(1)}`;

      // Sample the run-up for scroll mapping: y is not monotonic (the line
      // swings), so keep the running maximum and binary-search that.
      pMain.setAttribute("d", pre);
      preLen = pMain.getTotalLength();
      samples = [];
      let maxY = -Infinity;
      for (let i = 0; i <= 500; i++) {
        maxY = Math.max(maxY, pMain.getPointAtLength((preLen * i) / 500).y);
        samples.push(maxY);
      }
      pMain.setAttribute("d", pre + loop);
      pShadow.setAttribute("d", pre + loop);
      total = pMain.getTotalLength();
      loopStartY = cy;
      loopSpan = Math.max(160, R * 2 + 120);

      // Soft gold over the two dark panels, deeper gold over marble.
      const heroEnd = hero.offsetHeight / H;
      const closeTop = yOf(closing) / H;
      grad.setAttribute("y2", String(H));
      const stops = grad.querySelectorAll("stop");
      const offsets = [0, heroEnd - 0.01, heroEnd + 0.01, closeTop - 0.01, closeTop + 0.01, 1];
      stops.forEach((s, i) => s.setAttribute("offset", String(Math.min(1, Math.max(0, offsets[i])))));

      pMain.style.strokeDasharray = `${total} ${total}`;
      pShadow.style.strokeDasharray = `${total} ${total}`;
      onScroll();
    };

    let raf = 0;
    const scrollHandler = () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; onScroll(); });
    };
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const resizeHandler = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 120);
    };

    build();
    document.fonts?.ready.then(build);
    window.addEventListener("load", build);
    window.addEventListener("scroll", scrollHandler, { passive: true });
    window.addEventListener("resize", resizeHandler);
    // Late layout shifts (images, fonts) that fire no resize.
    const ro = new ResizeObserver(resizeHandler);
    ro.observe(host);

    return () => {
      window.removeEventListener("load", build);
      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("resize", resizeHandler);
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-[1] overflow-hidden"
    >
      <defs>
        <linearGradient ref={gradRef} id="ribbon-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1000">
          <stop offset="0" stopColor={SOFT} />
          <stop offset="0.2" stopColor={SOFT} />
          <stop offset="0.22" stopColor={DEEP} />
          <stop offset="0.8" stopColor={DEEP} />
          <stop offset="0.82" stopColor={SOFT} />
          <stop offset="1" stopColor={SOFT} />
        </linearGradient>
      </defs>
      {/* a fainter offset twin, so the line reads as a ribbon with an edge */}
      <path ref={shadowRef} fill="none" stroke="url(#ribbon-grad)" strokeWidth={1.2} strokeLinecap="round" opacity={0.35} transform="translate(3 3)" />
      <path ref={mainRef} fill="none" stroke="url(#ribbon-grad)" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}
