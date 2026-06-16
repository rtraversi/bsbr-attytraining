'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShaderBg } from './shader-bg'

const POINTS: Record<string, number> = {
  A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8,
  K:5, L:1, M:3, N:1, O:1, P:3, Q:10, R:1, S:1, T:1,
  U:1, V:4, W:4, X:8, Y:4, Z:10,
}

type CycleWord = 'EASY' | 'SIMPLE' | 'FOR YOU'

const CYCLE_TILES: Record<CycleWord, string[]> = {
  'EASY':    ['E', 'A', 'S', 'Y'],
  'SIMPLE':  ['S', 'I', 'M', 'P', 'L', 'E'],
  'FOR YOU': ['F', 'O', 'R', '·', 'Y', 'O', 'U'],
}

const ROW1 = ['T', 'R', 'A', 'I', 'N', 'I', 'N', 'G']
const ROW2_STATIC = ['M', 'A', 'D', 'E']

// Faster, snappier spring — reduced drop height, tighter stagger
function Tile({ letter, delay = 0 }: { letter: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 600, damping: 35, delay }}
      whileHover={{ y: -8, scale: 1.05, boxShadow: '0 12px 24px rgba(0,0,0,0.1), inset 0 -2px 0 0 rgba(0,0,0,0.1)' }}
      className="relative w-16 h-16 md:w-24 md:h-24 bg-[#FDFCF0] border border-[#E5E1D8] rounded-md flex items-center justify-center tile-shadow select-none cursor-default"
    >
      <span className="font-lora text-3xl md:text-5xl font-bold text-[#1b1c1c]">
        {letter}
      </span>
      <span className="absolute bottom-1.5 right-2 text-[10px] md:text-[13px] font-bold text-[#1b1c1c]/40">
        {POINTS[letter]}
      </span>
    </motion.div>
  )
}

// Minimum ms between word changes — prevents racing through words on fast scroll
const WORD_CHANGE_COOLDOWN = 420

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [word, setWord] = useState<CycleWord>('EASY')

  // Refs for rate-limited word cycling
  const lastChangeRef = useRef(0)
  const scheduledRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function applyWord(target: CycleWord) {
      // Cancel any pending scheduled change
      if (scheduledRef.current) {
        clearTimeout(scheduledRef.current)
        scheduledRef.current = null
      }

      const now = Date.now()
      const elapsed = now - lastChangeRef.current

      if (elapsed >= WORD_CHANGE_COOLDOWN) {
        // Enough time has passed — update immediately
        lastChangeRef.current = now
        setWord(target)
      } else {
        // Schedule a trailing update so the final position is always correct
        const remaining = WORD_CHANGE_COOLDOWN - elapsed
        scheduledRef.current = setTimeout(() => {
          lastChangeRef.current = Date.now()
          setWord(target)
          scheduledRef.current = null
        }, remaining)
      }
    }

    function onScroll() {
      const section = sectionRef.current
      if (!section) return
      const { top, height } = section.getBoundingClientRect()
      const scrollable = height - window.innerHeight
      if (scrollable <= 0) return
      const progress = Math.max(0, Math.min(1, -top / scrollable))

      // Thresholds at 25% and 55% — responds after ~35vh of scroll on a 240vh section
      if (progress < 0.25) applyWord('EASY')
      else if (progress < 0.55) applyWord('SIMPLE')
      else applyWord('FOR YOU')
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scheduledRef.current) clearTimeout(scheduledRef.current)
    }
  }, [])

  const cyclingTiles = CYCLE_TILES[word]

  return (
    <>
      {/* Fixed nav */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <nav className="max-w-[1280px] mx-auto px-6 md:px-[80px] py-5 flex justify-between items-center">
          <div className="font-dm-sans text-lg font-bold text-[#1b1c1c] tracking-tight">
            Staff Compliance
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#how-it-works"
              className="nav-btn-neutral px-4 py-1.5 rounded-full bg-white text-[#544439] text-sm font-medium hover:text-[#8e4a0d] transition-colors"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="nav-btn-neutral px-4 py-1.5 rounded-full bg-white text-[#544439] text-sm font-medium hover:text-[#8e4a0d] transition-colors"
            >
              Pricing
            </a>
            <a
              href="/login"
              className="nav-btn-accent px-6 py-1.5 rounded-full bg-white text-[#C8783A] text-sm font-bold hover:bg-[#C8783A]/5 transition-all"
            >
              Sign in
            </a>
          </div>
        </nav>
      </header>

      {/* Hero — 240vh gives ~35vh per word zone, feels responsive without racing */}
      <section ref={sectionRef} className="relative min-h-[240vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="absolute inset-0 z-0">
            <ShaderBg />
          </div>
          <div className="absolute inset-0 z-10 frosted-overlay" />

          <div className="relative z-20 h-full flex flex-col items-center justify-center pt-20 px-6 text-center">
            {/* Tile block */}
            <div className="mb-14 flex flex-col items-center gap-6 md:gap-10">
              {/* Row 1: TRAINING */}
              <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                {ROW1.map((letter, i) => (
                  <Tile key={`r1-${i}`} letter={letter} delay={i * 0.04} />
                ))}
              </div>

              {/* Row 2: MADE + cycling word */}
              <div className="flex flex-wrap justify-center gap-5 md:gap-9 items-center">
                <div className="flex gap-4 md:gap-6">
                  {ROW2_STATIC.map((letter, i) => (
                    <Tile
                      key={`r2-${i}`}
                      letter={letter}
                      delay={(ROW1.length + i) * 0.04}
                    />
                  ))}
                </div>

                {/* Cycling word — slides out/in on change */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={word}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="flex gap-4 md:gap-6 items-center"
                  >
                    {cyclingTiles.map((ch, i) =>
                      ch === '·' ? (
                        <div key={`gap-${i}`} className="w-3 md:w-5" />
                      ) : (
                        <Tile key={`${word}-${i}`} letter={ch} delay={0} />
                      )
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Tagline */}
            <p className="font-dm-sans text-lg md:text-xl text-[#544439] max-w-xl leading-relaxed mb-8">
              Complete staff training in 30 minutes.
              <br />
              <span className="text-[#1b1c1c] font-bold">
                Trained and certified. No operator involvement.
              </span>
            </p>

            {/* Physical CTA button */}
            <a
              href="#how-it-works"
              className="physical-button group inline-flex items-center gap-2 px-10 py-4 bg-[#C8783A] text-white font-bold font-dm-sans rounded-full text-base relative overflow-hidden"
            >
              <span className="relative z-10">How it works</span>
              <span className="relative z-10 transition-transform duration-150 group-hover:translate-x-1">
                →
              </span>
              <div className="absolute inset-x-0 top-0 h-px bg-white opacity-40 pointer-events-none" />
            </a>

            {/* Scroll indicator */}
            <div className="mt-14 flex flex-col items-center gap-2 opacity-40">
              <span className="font-dm-sans text-[11px] font-bold uppercase tracking-[0.08em] text-[#1b1c1c]">
                Scroll
              </span>
              <div className="w-px h-12 bg-[#1b1c1c]" />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
