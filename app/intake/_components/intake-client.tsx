'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { IurixLockup } from '@/app/_components/iurix-lockup'
import { QuestionField } from './question-field'
import {
  BTN_GHOST,
  BTN_PRIMARY,
  CARD,
  MISSING_TEXT,
  MUTED,
  NAV_BTN,
  NOTICE,
  PAGE,
  PROMPT,
} from './intake-styles'
import {
  isComplete,
  missingRequired,
  rosterOverSeats,
  visibleQuestions,
  progressBySection,
} from '@/lib/intake/branching'
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
  locked: boolean
  submittedAt: string | null
  /** intake_sessions.current_question — the authoritative resume point. */
  resumeAt: string | null
  initialAnswers: AnswerMap
  seatsPurchased: number
  adminName: string | null
  adminEmail: string
  firmName: string | null
}

/** Text-ish types save on a pause; a click saves at once. */
const DEBOUNCED_TYPES = new Set(['text', 'longtext', 'roster', 'tool-grid'])
const SAVE_DELAY_MS = 700

export function IntakeClient({
  locked,
  submittedAt,
  resumeAt,
  initialAnswers,
  seatsPurchased,
  adminName,
  adminEmail,
  firmName,
}: IntakeClientProps) {
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers)
  const [sent, setSent] = useState(locked)
  const [index, setIndex] = useState(0)
  // Nothing is marked until Send is pressed. This is the flag that turns that on.
  const [missing, setMissing] = useState<Set<string>>(new Set())
  const [banner, setBanner] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    <main className={PAGE}>
      {/*
        Permanently white in both themes: the mark is artwork with its own
        ground, and inverting the page underneath it made it read as a different
        logo. (Same note as the mockup, and the lockup is light-grounds-only.)
      */}
      <div className="border-b border-[#E5EEF5] bg-white px-5 py-10">
        <div className="flex items-center justify-center">
          <IurixLockup style={{ fontSize: '2.6rem' }} />
        </div>
      </div>

      <div className={`mx-auto ${measure} px-6 pb-24 pt-10 transition-[max-width] duration-200`}>
        <header className="mb-8 border-b border-[#E5EEF5] pb-6 dark:border-[#1F2429]">
          <h1 className="mb-2 text-[1.9rem] font-semibold leading-tight tracking-tight">
            {firmName ? `${firmName}’s AI policy` : 'Your firm’s AI policy'}
          </h1>

          {sent ? (
            <div className="rounded-xl border border-[#E5EEF5] bg-[#F6F9FB] px-5 py-4 dark:border-[#1F2429] dark:bg-[#131A20]">
              <p className="text-sm font-semibold">Pending attorney review</p>
              <p className={`mt-1 max-w-[38rem] text-[13px] leading-relaxed ${MUTED}`}>
                Your policy is assembled from these answers and reviewed by an attorney before it
                reaches you. You will be emailed when it is ready. Nothing is published in the
                meantime.
                {submittedAt ? ` Submitted ${new Date(submittedAt).toLocaleDateString()}.` : ''}
              </p>
              <Link href="/dashboard" className={`mt-4 inline-block ${BTN_PRIMARY}`}>
                Go to your dashboard
              </Link>
            </div>
          ) : (
            <p className={`max-w-[34rem] text-[14.5px] ${MUTED}`}>
              Tell us how your firm uses AI. Your policy is assembled from these answers and
              reviewed by an attorney.
            </p>
          )}
        </header>

        {/*
          Once submitted, the intake is locked and NO firm-facing screen renders
          any answer — including this one. The two sensitive answers are never
          rendered anywhere outside the session that typed them.
        */}
        {sent || !current ? null : (
          <>
            <nav
              aria-label="Policy sections"
              className="mb-6 grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${progress.length}, minmax(0,1fr))` }}
            >
              {progress.map((section) => {
                const on = section.section === current.section
                return (
                  <button
                    key={section.section}
                    type="button"
                    onClick={() => jumpToSection(section.section)}
                    className="group block text-center"
                    aria-current={on ? 'step' : undefined}
                  >
                    <span
                      className={`block h-[3px] rounded-sm transition-colors ${
                        on
                          ? 'bg-[var(--brand-emphasis)]'
                          : section.complete
                            ? 'bg-[var(--brand-primary)]'
                            : 'bg-[#C7CDD3] dark:bg-[#2A3138]'
                      }`}
                    />
                    <span
                      className={`mt-2 block truncate text-[11px] font-semibold ${
                        on ? 'text-[var(--brand-emphasis)]' : MUTED
                      }`}
                    >
                      {section.label}
                    </span>
                  </button>
                )
              })}
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
      </div>
    </main>
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
  seatsPurchased: number
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

/** Position within the SECTION. Never a running total across the whole intake. */
function SectionCounter({ question, visible }: { question: Question; visible: Question[] }) {
  const inSection = visible.filter((q) => q.section === question.section)
  const at = inSection.findIndex((q) => q.key === question.key) + 1
  return (
    <p className={`mt-4 text-[12px] font-semibold uppercase tracking-wider ${MUTED}`}>
      {at} of {inSection.length}
    </p>
  )
}
