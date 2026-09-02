'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QuestionField } from './question-field'
import { IntakeIntro } from './intake-intro'
import { IntakeShell } from './intake-shell'
import {
  BTN_GHOST,
  BTN_PRIMARY,
  CARD,
  MISSING_TEXT,
  MUTED,
  NAV_BTN,
  NOTICE,
  PROMPT,
  SECTION_STEP,
} from './intake-styles'
import {
  isComplete,
  missingRequired,
  rosterOverSeats,
  visibleQuestions,
  progressBySection,
} from '@/lib/intake/branching'
import { sectionPositionOf } from '@/lib/intake/review'
import { AUTO_SEEDED_KEYS, SECTION_LABELS } from '@/lib/intake/types'
import type { AnswerMap, AnswerValue, Question, RosterRow } from '@/lib/intake/types'

/**
 * The intake shell.
 *
 * Built to .planning/intake-mockup/iurix-intake-mockup-light.html, which Katy
 * has seen and approved. The structural decisions it encodes, so nobody
 * "improves" them later:
 *
 *   ONE QUESTION PER SCREEN. Katy, 2026-08-25: "If there are a bunch at a time
 *   it doesnt seem custom." The roster and the tool grid are the two exceptions
 *   and both are tables.
 *
 *   PROGRESS PER SECTION, NEVER A RUNNING TOTAL. A "12 of 29" counter makes a
 *   long form feel long, which is the opposite of what showing one at a time is
 *   for. The counter under the card is position within the SECTION.
 *
 *   NOTHING IS MARKED REQUIRED UNTIL SEND. Required-ness is shown by
 *   consequence rather than by decorating every question with an asterisk: press
 *   Send, and only what is actually missing turns red. Optional questions carry
 *   a muted asterisk and never turn red at all.
 */
export interface IntakeClientProps {
  /** intake_sessions.current_question — the authoritative resume point. */
  resumeAt: string | null
  initialAnswers: AnswerMap
  seatsPurchased: number | null
  adminName: string | null
  adminEmail: string
  firmName: string | null
}

/** Text-ish types save on a pause; a click saves at once. */
const DEBOUNCED_TYPES = new Set(['text', 'longtext', 'roster', 'tool-grid'])
const SAVE_DELAY_MS = 700

// ── The section strip, and why it measures instead of using a breakpoint ────
//
// The strip is a grid of equal columns with a label under each. It has always
// fitted on one line by construction and paid for it in characters, so as
// sections were added the labels got shorter rather than the strip getting
// smaller: ~6 characters each at eight sections and 390px, ~4 at twelve.
//
// 🔴 A BREAKPOINT CANNOT EXPRESS THIS RULE. The width at which labels stop
// fitting is a function of HOW MANY sections there are — twelve break at one
// width, twenty at a much larger one — so any `md:` threshold written today is
// wrong the next time Katy adds a module, which is the redesign this is
// supposed to be the last of. What decides the layout is whether the labels
// fit, so that is what gets measured.
//
// Below the threshold the strip does not truncate harder. It changes shape: the
// current section keeps its name and takes the width it needs, every other
// section shrinks to its bar, and a step control appears to move between them.
//
// SECTION_LABEL_PX is the width one labelled column needs. It is MEASURED, not
// estimated: the twelve labels rendered at 11px semibold in Stack Sans run
// Firm 23 · Data 24 · Staff 26 · Tools 28 · Courts 36 · Clients 36 ·
// History 37 · Drafting 42 · Records 44 · Systems 45 · Meetings 49 ·
// Marketing 52. The columns are equal, so the widest is what every column has
// to hold.
//
// An earlier pass here guessed 6.1px per character and got 64. That was wrong
// by 23% — Stack Sans at this size runs nearer 5.2 — and it is the same
// arithmetic that produced the "~4 characters at twelve sections" figure in the
// 2026-08-27 notes. Measure the face; do not multiply characters.
//
// Re-derive by rendering the widest SECTION_LABELS entry at `text-[11px]
// font-semibold` inside the strip and reading its width, whenever the type
// scale, the face, or the longest label changes.
const SECTION_LABEL_PX = 52
/** gap-1.5 between columns in the labelled strip. */
const SECTION_GAP_PX = 6

export function IntakeClient({
  resumeAt,
  initialAnswers,
  seatsPurchased,
  adminName,
  adminEmail,
  firmName,
}: IntakeClientProps) {
  const router = useRouter()
  // initialAnswers already carries the auto-seeded firm name: page.tsx writes it
  // as a real answer row (seedAutoAnswers) rather than handing it here as a
  // display-only prop. That is what makes isComplete/missingRequired count it.
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers)
  // 🔴 A TRANSIENT STATE, not a screen. This component is only ever rendered
  // for an OPEN intake now — app/intake/page.tsx decides, and hands a submitted
  // one to IntakeReview instead. So this covers the seconds between a
  // successful Send and router.refresh() landing, and nothing else.
  //
  // It used to be initialised from a `locked` prop and render a full "Pending
  // attorney review" panel, which made this file a second, quietly different
  // account of a submitted intake. There is one now.
  const [sent, setSent] = useState(false)
  const [index, setIndex] = useState(0)
  // Nothing is marked until Send is pressed. This is the flag that turns that on.
  const [missing, setMissing] = useState<Set<string>>(new Set())
  const [banner, setBanner] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ── the walkthrough, and how it knows who it is talking to ────────────────
  //
  // 🔴 BOTH OF THESE READ THE SESSION. There is no dismissal flag, no cookie and
  // no "seen it" column, because the session already knows: a firm that has
  // answered something, or that has a resume point, has been here before.
  //
  // A flag would be a second record of the same fact, and the two would drift —
  // an admin who cleared it would get the first-run introduction over a
  // half-finished intake, which is exactly the "someone back three days later"
  // case this is supposed to serve.
  //
  // getOrCreateOpenSession inserts current_question as NULL, so an untouched
  // session is unambiguous.
  //
  // 🔴 AUTO-SEEDED ANSWERS DO NOT COUNT AS HAVING BEEN HERE. The firm name is
  // written into the session on the firm's behalf (page.tsx → seedAutoAnswers),
  // so a plain `length === 0` would make every brand-new session look visited
  // and the walkthrough would never render for anyone again.
  //
  // The pairing is what makes this safe: seedAutoAnswers deliberately does NOT
  // touch the session, while every real answer goes through
  // POST /api/intake/answer, which does. So resumeAt === null means the firm has
  // saved nothing itself, and any auto-seeded key sitting beside it can only
  // have come from the seed.
  const untouched =
    resumeAt === null &&
    Object.keys(initialAnswers).every((key) => AUTO_SEEDED_KEYS.has(key))
  const [introOpen, setIntroOpen] = useState(untouched)

  // Shown once per visit to somebody who is returning, and cleared the moment
  // they move — it is an orientation line, not a banner to live with.
  const [showResume, setShowResume] = useState(resumeAt !== null)

  const visible = useMemo(() => visibleQuestions(answers), [answers])
  const progress = useMemo(() => progressBySection(answers), [answers])

  // Resume where the firm stopped. intake_sessions.current_question, not
  // nextUnanswered() — the two disagree on an optional question the firm chose
  // to skip, and sending them backwards to a question they deliberately passed
  // reads as the form losing their place.
  const resumed = useRef(false)
  useEffect(() => {
    if (resumed.current || !resumeAt) return
    resumed.current = true
    const at = visible.findIndex((q) => q.key === resumeAt)
    if (at >= 0) setIndex(at)
  }, [resumeAt, visible])

  // Keep the cursor in range when a branch shortens the visible set underneath it.
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, visible.length - 1)))
  }, [visible.length])

  const current: Question | undefined = visible[index]

  // ── does the labelled strip still fit? ────────────────────────────────────
  //
  // `null` until measured, which is also what the server renders. The bars are
  // identical in every state and the label row keeps its height throughout, so
  // the unmeasured first paint settles by fading text in rather than by moving
  // anything.
  const stripRef = useRef<HTMLDivElement | null>(null)
  const [labelsFit, setLabelsFit] = useState<boolean | null>(null)

  const labelsNeed =
    progress.length * SECTION_LABEL_PX + Math.max(0, progress.length - 1) * SECTION_GAP_PX

  // Measures the STRIP, not the window. The strip is bounded by the card's
  // measure — max-w-3xl, and max-w-5xl on the roster and the tool grid — so it
  // stops growing at 720px however wide the monitor is, and 768px and 1280px
  // are the same layout by construction.
  //
  // The step control lives outside the strip, so compact mode has ~40px less to
  // measure than full mode does. That gives the switch about 40px of
  // hysteresis — it drops to compact near 738px and only comes back near 778px
  // — which is why dragging a window across the boundary settles instead of
  // flickering. Keep the control outside the measured element if this is ever
  // reworked; measuring a box that contains the thing whose presence depends on
  // the measurement is how that becomes a loop.
  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const measure = () => setLabelsFit(el.clientWidth >= labelsNeed)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
    // introOpen and sent gate whether the strip is mounted at all, so they are
    // what tells this to re-attach — not decoration on the dependency list.
  }, [labelsNeed, introOpen, sent])

  // Which sections hold a question Send flagged. Same source as the red
  // numeral, so a section cannot say "fine" while a question inside it is red.
  // `missing` is cleared per key the moment that question is answered
  // (see the persist handler), so a section's red clears as it is filled without
  // any second bookkeeping here.
  const missingSections = useMemo(() => {
    if (missing.size === 0) return new Set<string>()
    const found = new Set<string>()
    for (const question of visible) {
      if (missing.has(question.key)) found.add(question.section)
    }
    return found
  }, [missing, visible])

  const sectionIndex = current ? progress.findIndex((s) => s.section === current.section) : -1
  const nextSection = sectionIndex >= 0 ? progress[sectionIndex + 1] : undefined

  // ── saving ────────────────────────────────────────────────────────────────
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const persist = useCallback(async (key: string, value: AnswerValue | null) => {
    setSaving(true)
    try {
      await fetch('/api/intake/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionKey: key, value, currentQuestion: key }),
      })
    } catch {
      // Deliberately quiet. The next answer re-sends the resume point, and an
      // error toast on every keystroke in a dead tunnel is worse than the gap.
    } finally {
      setSaving(false)
    }
  }, [])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => clearTimeout(t))
  }, [])

  const answer = useCallback(
    (question: Question, value: AnswerValue | null) => {
      setShowResume(false)
      setAnswers((prev) => {
        const next = { ...prev }
        if (value === null) delete next[question.key]
        else next[question.key] = value
        return next
      })

      // Answering clears the red on that question immediately, rather than
      // waiting for the next Send.
      setMissing((prev) => {
        if (!prev.has(question.key)) return prev
        const next = new Set(prev)
        next.delete(question.key)
        return next
      })

      const existing = timers.current.get(question.key)
      if (existing) clearTimeout(existing)

      if (DEBOUNCED_TYPES.has(question.type)) {
        timers.current.set(
          question.key,
          setTimeout(() => {
            timers.current.delete(question.key)
            void persist(question.key, value)
          }, SAVE_DELAY_MS),
        )
      } else {
        void persist(question.key, value)
      }
    },
    [persist],
  )

  // ── navigation ────────────────────────────────────────────────────────────
  const go = useCallback(
    (to: number) => {
      setShowResume(false)
      const clamped = Math.max(0, Math.min(visible.length - 1, to))
      setIndex(clamped)
      const key = visible[clamped]?.key
      // Move the resume point even when nothing was answered, so closing the tab
      // on a question the firm is thinking about returns them to it.
      if (key) {
        void fetch('/api/intake/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionKey: key, value: answers[key] ?? null, currentQuestion: key }),
        }).catch(() => {})
      }
    },
    [visible, answers],
  )

  const jumpToSection = (section: string) => {
    const at = visible.findIndex((q) => q.section === section)
    if (at >= 0) go(at)
  }

  // Counted off `progress` rather than recomputed, so the resume line and the
  // section nav can never disagree about how far along the firm is.
  const totalRequired = progress.reduce((n, s) => n + s.total, 0)
  const answeredRequired = progress.reduce((n, s) => n + s.answered, 0)

  // ── submit ────────────────────────────────────────────────────────────────
  const roster = (answers['roster'] as RosterRow[] | undefined) ?? []
  const overSeats = rosterOverSeats(roster, seatsPurchased)

  async function send() {
    if (!isComplete(answers)) {
      const gaps = missingRequired(answers)
      setMissing(new Set(gaps.map((q) => q.key)))
      setBanner('Please fill in the missing questions. The * means optional.')
      // Jump to the first gap, switching section if it is on another one.
      const at = visible.findIndex((q) => q.key === gaps[0]?.key)
      if (at >= 0) setIndex(at)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Flush anything still sitting on a debounce, or a roster typed and sent in
    // the same second loses its last edit.
    for (const [key, timer] of timers.current) {
      clearTimeout(timer)
      await persist(key, answers[key] ?? null)
    }
    timers.current.clear()

    setSaving(true)
    try {
      const res = await fetch('/api/intake/submit', { method: 'POST' })
      const body = (await res.json()) as { error?: string; missing?: string[] }
      if (!res.ok) {
        setBanner(body.error ?? 'That did not go through. Try again in a moment.')
        if (body.missing) setMissing(new Set(body.missing))
        return
      }
      setBanner(null)
      setMissing(new Set())
      setSent(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // The server decides which screen a submitted intake gets. Refreshing
      // hands it back rather than rendering a second version of "submitted"
      // here — page.tsx re-reads the session and renders IntakeReview.
      router.refresh()
    } catch {
      setBanner('That did not go through. Try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  // ── layout ────────────────────────────────────────────────────────────────
  //
  // A single question is a focused single column, so a narrow measure is right.
  // The roster and the tool grid are TABLES and need real width — this is the
  // one thing not to "simplify" back to a constant. Older employee pages in this
  // repo default everything to a narrow column and the tables suffer for it.
  const wide = current?.type === 'roster' || current?.type === 'tool-grid'
  const measure = wide ? 'max-w-5xl' : 'max-w-3xl'

  return (
    <IntakeShell
      firmName={firmName}
      measure={measure}
      subtitle={
        introOpen ? null : (
          /* Suppressed while the introduction is open — it says the same thing
             at length two inches lower, and twice reads as a stutter. */
          <p>
            Tell us how your firm uses AI. Your policy is assembled from these answers and
            reviewed by an attorney.
          </p>
        )
      }
    >
      <>
        {/*
          The seconds between a successful Send and the refresh landing. The
          server owns every screen after that: page.tsx re-reads the session,
          sees `submitted`, and renders IntakeReview — which is where the firm
          reads their answers back and can reopen to change them.
        */}
        {sent ? (
          <div className="rounded-xl border border-[#E5EEF5] bg-[#F6F9FB] px-5 py-4 dark:border-[#1F2429] dark:bg-[#131A20]">
            <p className="text-sm font-semibold">Sent. Thank you.</p>
            <p className={`mt-1 max-w-[38rem] text-[13px] leading-relaxed ${MUTED}`}>
              Bringing up your answers…
            </p>
          </div>
        ) : null}

        {sent || !current ? null : introOpen ? (
          <IntakeIntro
            /* Measured at the answers actually held, which on an untouched
               session is none — so this is the unbranched set. "Around" in the
               copy is carrying the branching, which can only shorten it. */
            questionCount={visible.length}
            onStart={() => setIntroOpen(false)}
          />
        ) : (
          <>
            {/*
              The returning firm's orientation line. Deliberately NOT the
              first-run introduction: somebody back three days later needs to
              know where they are, not what the product is. It clears on the
              first move — see go().
            */}
            {showResume && (
              <p className={`mb-6 text-[13.5px] ${MUTED}`}>
                <span className="font-semibold text-[var(--brand-emphasis)]">Welcome back.</span>{' '}
                Picking up where you left off in {SECTION_LABELS[current.section]}: {answeredRequired}{' '}
                of {totalRequired} required questions answered. Everything saves as you go.
              </p>
            )}

            {/*
              The section strip. One rule, applied at whatever width it lands on:
              the labels stay while they fit, and when they stop fitting the
              strip gets more COMPACT rather than more truncated. See the
              SECTION_LABEL_PX note at the top of this file for why the switch is
              measured rather than written as a breakpoint.

              Full — every section labelled, every section a jump target. This is
              the strip as it has always been, and at full width it is unchanged.

              Compact — the current section keeps its name and takes the width it
              needs; the rest are bars. Direct jumping to an arbitrary section is
              given up here (Max, 2026-08-28, accepted): with this many modules,
              twelve tap targets four characters wide were not a way of getting
              anywhere anyway. The step control replaces them.

              🔴 Presentation only. Both branches read `progress` and call the
              same jumpToSection. No question, section or count is computed here.
            */}
            <nav aria-label="Policy sections" className="mb-6 flex items-center gap-3">
              <div
                ref={stripRef}
                className={`min-w-0 flex-1 grid ${labelsFit === false ? 'gap-1' : 'gap-1.5'}`}
                style={{
                  gridTemplateColumns:
                    labelsFit === false
                      ? progress
                          .map((_, i) => (i === sectionIndex ? 'auto' : 'minmax(2px,1fr)'))
                          .join(' ')
                      : `repeat(${progress.length}, minmax(0,1fr))`,
                }}
              >
                {progress.map((section) => {
                  const on = section.section === current.section
                  // Red outranks current and complete alike: a section you are
                  // standing in can still be the one with the gap, and that is
                  // exactly when it most needs to say so.
                  const gap = missingSections.has(section.section)
                  const bar = (
                    <span
                      className={`block h-[3px] rounded-sm transition-colors ${
                        gap
                          ? 'bg-[#E4705F]'
                          : on
                            ? 'bg-[var(--brand-emphasis)]'
                            : section.complete
                              ? 'bg-[var(--brand-primary)]'
                              : 'bg-[#C7CDD3] dark:bg-[#2A3138]'
                      }`}
                    />
                  )

                  // Compact: a bar, and a name only on the one you are in. The
                  // others are not buttons — nothing to press means nothing that
                  // looks pressable and does nothing useful at 17px wide.
                  if (labelsFit === false) {
                    return (
                      <div
                        key={section.section}
                        className="block min-w-0 text-center"
                        aria-current={on ? 'step' : undefined}
                      >
                        {bar}
                        <span
                          className={`mt-2 block whitespace-nowrap px-1 text-[11px] font-semibold ${
                            gap ? MISSING_TEXT : 'text-[var(--brand-emphasis)]'
                          } ${on ? '' : 'invisible'}`}
                        >
                          {/* Held in the layout by every column, painted by one.
                              That is what keeps the label row's height steady as
                              the current section moves along the strip. */}
                          {on ? section.label : ' '}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <button
                      key={section.section}
                      type="button"
                      onClick={() => jumpToSection(section.section)}
                      className="group block min-w-0 text-center"
                      aria-current={on ? 'step' : undefined}
                    >
                      {bar}
                      <span
                        className={`mt-2 block truncate text-[11px] font-semibold transition-opacity ${
                          gap ? MISSING_TEXT : on ? 'text-[var(--brand-emphasis)]' : MUTED
                        } ${labelsFit === null ? 'opacity-0' : 'opacity-100'}`}
                      >
                        {/* Unmeasured, on the server and for one frame after:
                            the label holds its space but is not painted, so the
                            strip settles without moving the card. */}
                        {section.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {labelsFit === false && (
                <button
                  type="button"
                  className={SECTION_STEP}
                  disabled={!nextSection}
                  onClick={() => nextSection && jumpToSection(nextSection.section)}
                  aria-label={
                    nextSection ? `Next section: ${nextSection.label}` : 'Last section'
                  }
                >
                  {/* A double chevron, and never the single arrow the question
                      controls use. See SECTION_STEP in intake-styles.ts. */}
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3.5 3.5 8 8l-4.5 4.5" />
                    <path d="M9 3.5 13.5 8 9 12.5" />
                  </svg>
                </button>
              )}
            </nav>

            <QuestionCard
              question={current}
              number={index + 1}
              missed={missing.has(current.key)}
              answers={answers}
              onChange={(value) => answer(current, value)}
              seatsPurchased={seatsPurchased}
              adminName={adminName}
              adminEmail={adminEmail}
            />

            <SectionCounter question={current} visible={visible} />

            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                className={NAV_BTN}
                onClick={() => go(index - 1)}
                disabled={index === 0}
                aria-label="Previous question"
              >
                &larr;
              </button>
              <button
                type="button"
                className={NAV_BTN}
                onClick={() => go(index + 1)}
                disabled={index === visible.length - 1}
                aria-label="Next question"
              >
                &rarr;
              </button>
            </div>

            <div className="mt-10 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" className={BTN_PRIMARY} onClick={() => void send()} disabled={saving}>
                Send intake
              </button>
              <Link href="/dashboard" className={`text-center ${BTN_GHOST}`}>
                Save and finish later
              </Link>
            </div>

            {/*
              The cap, restated on the way out. Max reversed flag-never-block on
              2026-08-26: the previous copy here promised "we will sort it out
              with you" and nobody owned that process. Send is genuinely refused
              now — the server checks the same rule, so this is a warning the
              firm can act on rather than the only thing standing in the way.
            */}
            {overSeats > 0 && (
              <p className={`mt-5 ${NOTICE}`}>
                Your roster lists {overSeats} more {overSeats === 1 ? 'person' : 'people'} needing
                training than you have seats for. Add {overSeats} more{' '}
                {overSeats === 1 ? 'seat' : 'seats'} in Billing, or take{' '}
                {overSeats === 1 ? 'them' : 'them'} off the roster, before sending.
              </p>
            )}

            {banner && <p className={`mt-4 ${NOTICE}`}>{banner}</p>}

            <p className={`mt-6 h-4 text-[12px] ${MUTED}`}>{saving ? 'Saving…' : ' '}</p>
          </>
        )}
      </>
    </IntakeShell>
  )
}

// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  number,
  missed,
  answers,
  onChange,
  seatsPurchased,
  adminName,
  adminEmail,
}: {
  question: Question
  number: number
  missed: boolean
  answers: AnswerMap
  onChange: (value: AnswerValue | null) => void
  seatsPurchased: number | null
  adminName: string | null
  adminEmail: string
}) {
  return (
    <section className={CARD}>
      {/*
        The big numeral. Brand on a required question, muted with an asterisk on
        an optional one, red only after Send found it missing — the mockup's
        "required-ness by consequence" rule.
      */}
      <span
        className={`mb-3 block text-[3.1rem] font-semibold leading-[0.8] tracking-tight ${
          missed
            ? MISSING_TEXT
            : question.required
              ? 'text-[var(--brand-emphasis)]'
              : 'text-[#C7CDD3] dark:text-[#2A3138]'
        }`}
      >
        {number}
        {!question.required && <span className="align-super text-[0.55em]">*</span>}
      </span>

      <p className={PROMPT}>{question.prompt}</p>
      {question.help && (
        <p className={`mt-2 max-w-[36rem] text-[12.5px] leading-relaxed ${MUTED}`}>{question.help}</p>
      )}

      <QuestionField
        question={question}
        answers={answers}
        onChange={onChange}
        seatsPurchased={seatsPurchased}
        adminName={adminName}
        adminEmail={adminEmail}
      />
    </section>
  )
}

/**
 * Position within the SECTION. Never a running total across the whole intake.
 *
 * The arithmetic moved to sectionPositionOf() in lib/intake/review.ts so the
 * read-back screen can print THE SAME NUMBER. It computed it inline here until
 * 2026-09-01, and the review had no number at all — a firm saw "7" while
 * answering and an unnumbered list afterwards.
 */
function SectionCounter({ question, visible }: { question: Question; visible: Question[] }) {
  const { at, of } = sectionPositionOf(question, visible)
  return (
    <p className={`mt-4 text-[12px] font-semibold uppercase tracking-wider ${MUTED}`}>
      {at} of {of}
    </p>
  )
}
