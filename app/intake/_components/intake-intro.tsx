'use client'

import Link from 'next/link'
import { BTN_GHOST, BTN_PRIMARY, CARD, LINE, MUTED } from './intake-styles'

/**
 * The first thing a buyer sees after paying — what the next twenty minutes are.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * /onboarding took a password and dropped the buyer on question one of a long
 * form with nothing saying what it was for, how long it ran, whether it saved,
 * or what they got at the end of it. The intake IS the product (the firm's
 * written AI policy is what they bought), so arriving at it unannounced made
 * the deliverable look like paperwork standing between them and the thing.
 *
 * ── 🔴 GUIDANCE, NEVER A GATE ───────────────────────────────────────────────
 *
 * Katy killed the hard gate on 2026-08-26 12:11: "The problem is that the intake
 * is time consuming. People will want to explore without having to fill it all
 * in." So this screen carries an explicit way OUT of it — "Look around first" is
 * a real, equal-weight option, not a link buried under a wall. Nothing redirects
 * here, nothing is blocked, and leaving costs nothing because the intake resumes.
 *
 * The nav-pill intake chip (setup-notices.tsx) is the persistent nudge for
 * anyone who takes that door. This is the layer above it: the chip says come
 * back, this says what you are coming back TO.
 *
 * ── Shown by STATE, not by a dismissal flag ─────────────────────────────────
 *
 * It renders only on a genuinely untouched session — no resume point and no
 * saved answers. Someone back three days later has both, so they never see this
 * again and get the resume line instead (see IntakeClient). That means no
 * dismissal column, no cookie and no "shown once" bookkeeping to drift out of
 * step with the session it describes. The session already knows.
 */
export function IntakeIntro({
  questionCount,
  onStart,
}: {
  /** Visible questions at zero answers. Branching moves it, hence "around". */
  questionCount: number
  onStart: () => void
}) {
  return (
    <div className={CARD}>
      <p className={`text-[12px] font-bold tracking-normal ${MUTED}`}>
        What happens next
      </p>

      {/*
        Two steps, not three. Max dropped the staff/training step deliberately
        on 2026-09-02 — this screen is about the policy, and the roster inside
        the intake is where staff actually get set up.

        Copy on this screen is Max's, verbatim. Do not "improve" it.
      */}
      <ol className={`mt-6 divide-y ${LINE} border-y ${LINE}`}>
        <Step
          n={1}
          title="You answer these questions"
          body={`Around ${questionCount} questions about the tools your firm uses, what you want allowed, and who works there. It saves as you go, so you can stop at any point and come back to the question you left.`}
        />
        <Step
          n={2}
          title="Our team assembles and reviews your policy"
          body="Your written AI use policy is assembled from these answers. We email you when it is ready."
        />
      </ol>

      {/*
        Two doors, and the second one is a real door. Katy's reversal is the
        whole reason it is here rather than a footnote: a firm that has just paid
        is allowed to look around before spending twenty minutes on a form.
      */}
      <div className="mt-7 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
        <button type="button" className={BTN_PRIMARY} onClick={onStart}>
          Start the intake
        </button>
        <Link href="/dashboard" className={`text-center ${BTN_GHOST}`}>
          Look around the dashboard first
        </Link>
      </div>

      <p className={`mt-4 text-[12.5px] ${MUTED}`}>
        You can leave whenever you like and finish it later.
      </p>
    </div>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-4 py-4">
      <span
        aria-hidden
        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--brand-emphasis)] text-[12px] font-bold text-white"
      >
        {n}
      </span>
      <div>
        <p className="text-[14.5px] font-semibold leading-snug">{title}</p>
        <p className={`mt-1 max-w-[42rem] text-[13px] leading-relaxed ${MUTED}`}>{body}</p>
      </div>
    </li>
  )
}
