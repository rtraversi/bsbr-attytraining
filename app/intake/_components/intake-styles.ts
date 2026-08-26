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
  'relative rounded-2xl border border-[#E5EEF5] bg-white p-6 dark:border-[#1F2429] dark:bg-[#0D0F12]'

export const MUTED = 'text-[#8A8A8A] dark:text-[#7A8189]'

export const LINE = 'border-[#E5EEF5] dark:border-[#1F2429]'

/** The question prompt. */
export const PROMPT = 'text-base font-semibold leading-snug'

/**
 * One choice in a radio or checkbox list. Hover reveals the row rather than
 * outlining every row permanently — sixteen bordered rows read as a table.
 */
export const OPTION_ROW =
  'flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-[#E5EEF5] hover:bg-[#F6F9FB] dark:hover:border-[#1F2429] dark:hover:bg-[#131A20]'

export const CHECKBOX =
  'mt-1 h-[15px] w-[15px] shrink-0 accent-[var(--brand-emphasis)]'

/** Text input, textarea, select — one look. */
export const FIELD =
  'w-full rounded-lg border border-[#E5EEF5] bg-[#FAFAF8] px-3 py-2.5 text-[14.5px] outline-none transition-colors placeholder:text-[#8A8A8A] focus:border-[var(--brand-emphasis)] dark:border-[#1F2429] dark:bg-[#050607] dark:placeholder:text-[#7A8189]'

/** The bare underline input used inside an "Something else" option row. */
export const INLINE_FIELD =
  'min-w-36 flex-1 border-0 border-b border-[#E5EEF5] bg-transparent px-2 py-1 text-sm outline-none placeholder:text-[#8A8A8A] focus:border-[var(--brand-emphasis)] dark:border-[#1F2429] dark:placeholder:text-[#7A8189]'

/** Segmented pill — yes/no, the tool grid's tier and agreement columns. */
export const PILL_OFF =
  'grid place-items-center rounded-lg border border-[#E5EEF5] bg-white px-4 py-2.5 text-sm font-semibold text-[#8A8A8A] transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)] dark:border-[#1F2429] dark:bg-[#0D0F12] dark:text-[#7A8189]'

export const PILL_ON =
  'grid place-items-center rounded-lg border border-[var(--brand-emphasis)] bg-[var(--brand-emphasis)] px-4 py-2.5 text-sm font-semibold text-white transition-colors'

export const BTN =
  'rounded-full border border-[#E5EEF5] bg-white px-6 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--brand-emphasis)] dark:border-[#1F2429] dark:bg-[#0D0F12]'

export const BTN_PRIMARY =
  'rounded-full border border-[var(--brand-emphasis)] bg-[var(--brand-emphasis)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50'

export const BTN_GHOST =
  `rounded-full border border-transparent bg-transparent px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-[#F6F9FB] dark:hover:bg-[#131A20] ${MUTED}`

/** Round arrow, prev/next. */
export const NAV_BTN =
  'grid h-10 w-10 place-items-center rounded-full border border-[#E5EEF5] bg-white text-lg transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)] disabled:cursor-default disabled:border-[#E5EEF5] disabled:text-[#C7CDD3] disabled:hover:border-[#E5EEF5] disabled:hover:text-[#C7CDD3] dark:border-[#1F2429] dark:bg-[#0D0F12] dark:disabled:border-[#1F2429]'

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
