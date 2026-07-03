"use client";

import { useEffect, useRef, useState } from "react";
import { SpiroPattern } from "./spiro-pattern";

// Brief §2: last word cycles easy → simple → for you with a delete-then-retype
// typewriter — then STOPS on "for you" (no looping). Caret keeps blinking after.
const CYCLE_WORDS = ["easy", "simple", "for you"];

const TYPE_MS = 95; // per character while typing
const DELETE_MS = 55; // per character while deleting
const HOLD_MS = 1600; // pause on a complete word before deleting

type Phase = "typing" | "holding" | "deleting" | "done";

function useTypewriter(words: string[], enabled: boolean) {
  const [text, setText] = useState(enabled ? "" : words[words.length - 1]);
  const wordIndex = useRef(0);
  const phase = useRef<Phase>("typing");

  // Reduced-motion (or animation disabled): show the final word statically.
  useEffect(() => {
    if (!enabled) setText(words[words.length - 1]);
  }, [enabled, words]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;

    // All animation state lives in these locals, not in setText updaters:
    // React Strict Mode double-invokes updater functions in dev, so side
    // effects inside them (advancing wordIndex, scheduling timers) fire
    // twice and run wordIndex past the end of the array.
    let value = "";
    wordIndex.current = 0;
    phase.current = "typing";

    function tick() {
      const current = words[wordIndex.current];
      const isLastWord = wordIndex.current === words.length - 1;

      if (phase.current === "typing") {
        value = current.slice(0, value.length + 1);
        setText(value);
        if (value === current) {
          // Freeze permanently once the final word is fully typed.
          if (isLastWord) {
            phase.current = "done";
          } else {
            phase.current = "holding";
            timer = setTimeout(tick, HOLD_MS);
          }
        } else {
          timer = setTimeout(tick, TYPE_MS);
        }
      } else if (phase.current === "deleting") {
        value = value.slice(0, -1);
        setText(value);
        if (value.length === 0) {
          phase.current = "typing";
          wordIndex.current = wordIndex.current + 1;
          timer = setTimeout(tick, TYPE_MS);
        } else {
          timer = setTimeout(tick, DELETE_MS);
        }
      } else if (phase.current === "holding") {
        phase.current = "deleting";
        timer = setTimeout(tick, DELETE_MS);
      }
      // phase "done": no further timers — text stays on "for you".
    }

    timer = setTimeout(tick, TYPE_MS);
    return () => clearTimeout(timer);
  }, [words, enabled]);

  return text;
}

export function HeroSection() {
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    setAnimate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const word = useTypewriter(CYCLE_WORDS, animate);

  return (
    <section className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Closed Spiro rosette — contained, sits on the left; headline is the focus */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full md:left-[10%] md:w-[42%]">
        <SpiroPattern className="h-full w-full" scale={0.5} speed={0.7} />
      </div>

      {/* Headline — right edge lands around the "Get started" margin (max-w-1600) */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] items-center px-6 md:px-10">
        <div className="ml-auto mt-[7vh] max-w-[52rem] text-right">
          <h1 className="font-headline font-medium leading-[0.95] tracking-tight text-white">
            <span className="block text-[clamp(2.75rem,6.75vw,7.5rem)]">training</span>
            <span className="block whitespace-nowrap text-[clamp(2.75rem,6.75vw,7.5rem)]">
              made{" "}
              <span className="font-serif-italic font-normal">
                {word}
                <span className="athena-caret" aria-hidden />
              </span>
            </span>
          </h1>
        </div>
      </div>

      {/* Bottom gridline strip (v1 treatment — Max will re-spec gridlines later) */}
      <div className="absolute inset-x-0 bottom-0 h-24 border-t border-white/10">
        <div className="athena-columns h-full w-full" />
      </div>
    </section>
  );
}
