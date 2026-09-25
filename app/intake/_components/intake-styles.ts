// =============================================================================
// The intake's visual language, in one place.
//
// This is NOT a component library, and it is not the start of one — the repo
// deliberately has none, and style constants live per file (see CARD and MUTED
// in app/dashboard/_components/admin-dashboard.tsx). It is the same idea, one
// level up, because the intake is four files rendering ONE screen: the option
// row in the tool grid and the option row on a multi-select are the same row,
// and four copies of a 200-character class string drift within a week.
//
// Nothing here is exported outside app/intake.
//
// Colours track .planning/intake-mockup/iurix-intake-mockup-light.html, which
// Katy has seen and approved. Dark values follow the dashboard shell
// (bg #050607, card #0D0F12, border #1F2429, muted #7A8189).
// =============================================================================

/** Page ground. The masthead above it stays white in both themes — see the client. */
export const PAGE = 'font-headline min-h-screen bg-[#FAFAF8] text-[#0A0A0A] dark:bg-[#050607] dark:text-[#F5F7FA]'

export const CARD =
  'relative rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(0,148,255,0.08)] dark:bg-[#0D0F12] dark:shadow-none'

export const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'

export const LINE = 'border-[#E5EEF5] dark:border-[#1F2429]'

/** The question prompt. */
export const PROMPT = 'text-base font-semibold leading-snug'

/**
 * One choice in a radio or checkbox list. Hover reveals the row rather than
 * outlining every row permanently — sixteen bordered rows read as a table.
 */
export const OPTION_ROW =
  'flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[#EEF9FF] dark:hover:bg-[#131A20]'

export const CHECKBOX =
  'mt-1 h-[15px] w-[15px] shrink-0 accent-[var(--brand-emphasis)]'

/** Text input, textarea, select — one look. */
export const FIELD =
  'w-full rounded-lg bg-[#F2F5F8] px-3 py-2.5 text-[14.5px] outline-none transition-colors placeholder:text-[#8A8A8A] focus:bg-white focus:ring-2 focus:ring-[var(--brand-emphasis)] dark:bg-[#131A20] dark:placeholder:text-[#7A8189] dark:focus:bg-[#050607]'

/** The bare underline input used inside an "Something else" option row. */
export const INLINE_FIELD =
  'min-w-36 flex-1 rounded-md bg-[#F2F5F8] px-2 py-1 text-sm outline-none placeholder:text-[#8A8A8A] focus:ring-2 focus:ring-[var(--brand-emphasis)] dark:bg-[#131A20] dark:placeholder:text-[#7A8189]'

/** Segmented pill — yes/no, and the tool grid's agreement column. */
export const PILL_OFF =
  'grid place-items-center rounded-lg bg-[#F2F5F8] px-4 py-2.5 text-sm font-semibold text-[#8A8A8A] transition-colors hover:bg-[#EAF6FF] hover:text-[var(--brand-emphasis)] dark:bg-[#131A20] dark:text-[#7A8189] dark:hover:bg-[#18212A]'

export const PILL_ON =
  'grid place-items-center rounded-lg bg-[var(--brand-emphasis)] px-4 py-2.5 text-sm font-semibold text-white transition-colors'

export const BTN =
  'rounded-full bg-[#F2F4F7] px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-[#EAF6FF] dark:bg-[#131A20] dark:hover:bg-[#18212A]'

export const BTN_PRIMARY =
  'rounded-full bg-[var(--brand-emphasis)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50'

export const BTN_GHOST =
  `rounded-full bg-transparent px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-[#F6F9FB] dark:hover:bg-[#131A20] ${MUTED}`

/** Round arrow, prev/next. Moves one QUESTION. */
export const NAV_BTN =
  'grid h-10 w-10 place-items-center rounded-full bg-white text-lg shadow-[0_2px_10px_rgba(0,148,255,0.10)] transition-colors hover:bg-[#EAF6FF] hover:text-[var(--brand-emphasis)] disabled:cursor-default disabled:text-[#C7CDD3] disabled:shadow-none disabled:hover:bg-white disabled:hover:text-[#C7CDD3] dark:bg-[#131A20] dark:shadow-none dark:disabled:hover:bg-[#131A20]'

/**
 * Square chip beside the section strip. Moves one SECTION — a different kind of
 * movement from NAV_BTN above, which moves one question.
 *
 * 🔴 THE DIVERGENCE FROM NAV_BTN IS THE POINT, not a second opinion about
 * buttons. Two controls that look alike teach that they do the same thing, and
 * these two are a step and a jump. They differ on every axis available:
 *
 *              NAV_BTN (question)        this (section)
 *   shape      circle                    rounded square
 *   size       40px                      28px
 *   ground     white, 1px border         filled wash, borderless
 *   glyph      a single arrow            a double chevron
 *   position   under the card, right     above the card, beside the strip
 *
 * If either is ever restyled, move it further from the other, never closer.
 */
export const SECTION_STEP =
  'grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#EAF6FF] text-[var(--brand-emphasis)] transition-colors hover:bg-[var(--brand-emphasis)] hover:text-white disabled:cursor-default disabled:bg-[#F1F4F7] disabled:text-[#C7CDD3] disabled:hover:bg-[#F1F4F7] disabled:hover:text-[#C7CDD3] dark:bg-[#131A20] dark:disabled:bg-[#0D0F12] dark:disabled:text-[#2A3138]'

/**
 * The roster over-seats notice and the missing-answers notice. Amber, not red:
 * neither one blocks anything, and red for a thing that does not stop you is
 * how people learn to ignore red.
 */
export const NOTICE =
  'rounded-full bg-[rgba(214,158,20,0.13)] px-5 py-3 text-[13.5px] text-[#96700F] dark:text-[#D9AE45]'

/** The red used on a question number that was missed at Send. Nothing else is red. */
export const MISSING_TEXT = 'text-[#E4705F]'

export const TABLE_HEAD =
  `border-b ${LINE} pb-2 text-left text-[11px] font-bold uppercase tracking-wide ${MUTED}`
