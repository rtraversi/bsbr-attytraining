"use client";

import { useEffect, useRef } from "react";

// Live port of the flat 2D "Closed Spiro" from ../pattern-generator.html (drawSpiro).
// 2D is intentional — lighter than the 3D revolve port, so it doesn't cause the page
// to stutter. Settings match Max's tuned preview: Harmonic wave, n4 / freq5 / amp40 /
// density10 / lineWt1.0 / speed2.0 / opacity100%. White, on transparent black.

type SpiroProps = {
  className?: string;
  layers?: number; // S.n
  freq?: number; // S.freqRaw
  amp?: number; // S.amp
  density?: number; // S.densityRaw — shell count + scale
  lineWeight?: number; // S.lw
  opacity?: number; // S.opa
  speed?: number; // S.spdRaw
  scale?: number; // extra size multiplier on top of the tool formula
};

const BREATHE_PERIOD = 0.22;

// Harmonic wave (matches the tool's Harmonic setting).
function wvHarmonic(x: number) {
  return (Math.sin(x) + Math.sin(2 * x) * 0.5 + Math.sin(3 * x) * 0.25) / 1.75;
}

export function SpiroPattern({
  className = "",
  layers = 4,
  freq = 5,
  amp = 40,
  density = 10,
  lineWeight = 1,
  opacity = 1,
  speed = 2,
  scale = 1.15,
}: SpiroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ tx: 0, ty: 0, x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    // Cap DPR at 1.5 — full retina density on this many strokes is what stutters.
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let cssW = 0;
    let cssH = 0;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      cssW = parent.clientWidth;
      cssH = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.round(cssW * dpr);
      canvas!.height = Math.round(cssH * dpr);
      canvas!.style.width = `${cssW}px`;
      canvas!.style.height = `${cssH}px`;
    }

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    resize();

    function onMouseMove(e: MouseEvent) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      mouse.current.tx = nx * 16;
      mouse.current.ty = ny * 16;
    }
    if (!prefersReduced) window.addEventListener("mousemove", onMouseMove);

    // Quantize ratio to 0.5 so curves close cleanly.
    const ratioRaw = 1.5 + freq * 0.4;
    const ratio = Math.round(ratioRaw * 2) / 2;
    const loops = ratio % 1 < 0.01 ? 1 : 2;
    const steps = loops * 300;
    const numShells = Math.max(3, Math.min(8, Math.round(2 + density)));

    function draw() {
      const w = cssW;
      const h = cssH;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);

      const b = Math.sin(t * BREATHE_PERIOD);
      const breatheScale = 1 + b * 0.035;
      const breatheAlpha = 0.75 + 0.25 * (b * 0.5 + 0.5);

      mouse.current.x += (mouse.current.tx - mouse.current.x) * 0.05;
      mouse.current.y += (mouse.current.ty - mouse.current.y) * 0.05;

      const cx = w / 2;
      const cy = h / 2;
      const maxScale = Math.min(w, h) * 0.44 * (density / 5) * scale;
      const animRot = t * speed * 0.04;
      // Amplitude drifts very slowly ±5 around its base (period ~65s) so the petal
      // spread gently breathes without ever looking animated-on-a-timer.
      const ampOsc = amp + 5 * Math.sin(t * 0.1);

      ctx!.save();
      ctx!.translate(mouse.current.x, mouse.current.y);
      ctx!.translate(cx, cy);
      ctx!.scale(breatheScale, breatheScale);
      ctx!.translate(-cx, -cy);
      ctx!.strokeStyle = "#ffffff";
      ctx!.lineWidth = lineWeight;

      for (let sh = 0; sh < numShells; sh++) {
        const shellFrac = 1 - sh / numShells;
        const R = maxScale * (0.15 + 0.85 * shellFrac);
        const r = R / ratio;
        const shellRot = animRot + sh * 0.18;
        const shellAlphaMul = 0.35 + 0.65 * shellFrac;

        for (let k = 0; k < layers; k++) {
          const rot = (k * Math.PI * 2) / layers + shellRot;
          const dMod =
            (wvHarmonic((k / layers) * Math.PI * 2 + t * speed * 0.08 + sh * 0.7) +
              1) *
            0.5;
          const d = r * (0.35 + ampOsc / 55) * (0.55 + 0.45 * dMod);
          ctx!.globalAlpha =
            opacity * (0.55 + 0.45 * dMod) * shellAlphaMul * breatheAlpha;

          ctx!.beginPath();
          let first = true;
          for (let i = 0; i <= steps; i++) {
            const theta = (i / steps) * loops * Math.PI * 2;
            const px =
              (R - r) * Math.cos(theta) + d * Math.cos(((R - r) / r) * theta);
            const py =
              (R - r) * Math.sin(theta) - d * Math.sin(((R - r) / r) * theta);
            const x = cx + px * Math.cos(rot) - py * Math.sin(rot);
            const y = cy + px * Math.sin(rot) + py * Math.cos(rot);
            if (first) {
              ctx!.moveTo(x, y);
              first = false;
            } else {
              ctx!.lineTo(x, y);
            }
          }
          ctx!.stroke();
        }
      }
      ctx!.globalAlpha = 1;
      ctx!.restore();

      t += 0.016;
      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [layers, freq, amp, density, lineWeight, opacity, speed, scale]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
