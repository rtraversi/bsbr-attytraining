'use client'

import { usePathname } from 'next/navigation'
import { EmployeeTabBar, isTrainingRoute } from './employee-tab-bar'
import { ToastProvider } from './toast-provider'

/**
 * Chooses the dashboard chrome by ROUTE, not a route whitelist. The blue-gray
 * admin shell applies ONLY to the bare /dashboard admin home; everything else —
 * Overview/Training/Quizzes (incl. admins taking their own training) AND
 * Settings/Support — gets the standard shell. Inverting the rule this way fixes
 * Settings/Support (previously wrongly blue-gray for admins) without naming them.
 * Same `usePathname()` pattern NavPill and EmployeeTabBar use.
 */
export function DashboardShell({
  role,
  pill,
  children,
}: {
  role: string | null
  pill: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminHome = role === 'admin' && pathname === '/dashboard'
  const showTrainingShell = !isAdminHome

  // The bar is Overview/Content/Quizzes — it meant nothing on Settings and
  // Support, which share this same shell. Scoped by pathname, following the
  // isAdminHome pattern above rather than adding state, and off the tab bar's
  // own route list so the two can't disagree about where it belongs.
  //
  // This is independent of the <html>.quiz-active rule that hides the bar
  // mid-quiz (see app/globals.css): that one hides a bar that IS rendered,
  // whereas this decides whether to render it at all. Both must hold — on a
  // training route mid-quiz the bar is rendered here and hidden by the CSS,
  // and returns when the quiz unmounts and drops the class.
  const showTabBar = showTrainingShell && isTrainingRoute(pathname)

  // Standard shell — light-by-default themed experience with the bottom tab bar.
  // Background pattern: ONE full-bleed masked graphic, colored with the ADMIN
  // shell's bg (#CFDCE8) — the two shells' pattern colors are deliberately
  // cross-swapped from their own background. In dark mode both shells collapse
  // to the same flat #050607 (no cross-swap to make there), so the pattern
  // goes whiteish and faint instead of the light-mode color — same treatment
  // on both shells.
  //
  // The light/dark colors bake their opacity into the rgba alpha (light 0.6,
  // dark 0.1) and cross-fade by TRANSITIONING background-color on this single
  // masked element, rather than overlapping two separately-masked layers that
  // fade via opacity. Masking a full-viewport 10667-unit SVG is the real cost
  // here, and two always-mounted masked elements paid it twice per shell; one
  // element halves that persistent compositing cost. The trade is that the
  // theme toggle now repaints the mask over its 300ms transition instead of a
  // free GPU opacity fade — acceptable because the mask is viewport-sized (see
  // below, not content-tied) and the SVG was run through svgo (~700KB → ~230KB,
  // integer coords), so that repaint is far cheaper than it once was.
  //
  // position: fixed + h-screen (NOT absolute/inset-0, and NOT a large fixed
  // vh value either — both were tried and both broke something). inset-0
  // ties the pattern's size to the page's live content height, so any
  // height-animating accordion on the page (e.g. Quizzes' "Jump back in" card
  // expanding) forces this large mask to resize/re-rasterize every animation
  // frame — that was the "super mega lag" on hover/expand. A large fixed
  // height (e.g. 300vh) fixes THAT but creates a new bug: on a short page
  // (e.g. Settings) that oversized box still creates real scrollable overflow
  // past the actual content, leaving dead blank space below it. `fixed`
  // sidesteps both — it's anchored to the viewport, not the document, so its
  // size never depends on this page's content height (nothing to resize
  // during an accordion animation) AND it never contributes scrollable area
  // of its own (nothing dead to scroll into). It reads as a static backdrop
  // the page scrolls over, which is the intended look anyway.
  if (showTrainingShell) {
    return (
      // pb-16 only clears the tab bar — without the bar it is dead space.
      <div
        className={`font-headline relative flex min-h-screen flex-col bg-[#F5F7FA] text-[#0A0A0A] transition-colors dark:bg-[#050607] dark:text-[#F5F7FA] ${
          showTabBar ? 'pb-16' : ''
        }`}
      >
        <div
          aria-hidden
          className="shell-pattern pointer-events-none fixed inset-x-0 top-0 h-screen bg-[rgba(207,220,232,0.6)] transition-colors duration-300 dark:bg-[rgba(245,247,250,0.1)]"
        />
        <div className="relative z-10 px-4 py-3 md:px-6">{pill}</div>
        <ToastProvider>
          <div className="relative z-10 flex-1">{children}</div>
        </ToastProvider>
        {showTabBar && <EmployeeTabBar />}
      </div>
    )
  }

  // Admin home shell — same flat shape as the standard shell (pill in the same
  // slot), only the light backdrop differs (#CFDCE8 is admin-home-specific).
  // Dark mode is the same flat black as the standard shell — no separate inset
  // panel. Full-bleed on purpose (no max-w cap, minimal padding): the grid owns
  // the whole viewport, side padding matches the pill's so cards line up with it.
  //
  // At lg+ the shell is viewport-locked (h-[max(100vh,880px)] + overflow-y-auto):
  // the pill takes its natural height and the content wrapper gets the rest
  // (flex-1 + min-h-0), so the dashboard grid inside fills it with fr rows and no
  // page-level scroll — down to an 880px floor. Below that floor the shell holds
  // at 880px instead of continuing to compress: admin-dashboard.tsx's fr rows
  // (lg:grid-rows-[minmax(0,19fr)_minmax(0,26fr)]) squeeze toward zero on a short
  // viewport, and per-card content (e.g. CertificationForecast's three stacked
  // blocks) has no overflow clipping of its own, so it starts overlapping instead
  // of shrinking. 880px is empirically measured, not guessed: with the shell
  // forced to various heights and getBoundingClientRect() on the tightest pair
  // (CertificationForecast's "Certification Forecast" heading vs. the
  // "Projected Fully Certified" banner below it — the actual binding
  // constraint; Quick actions and the left stack stayed clear throughout), the
  // gap crosses zero at 868px. 880px adds ~12px of margin over that measured
  // crossover for cross-browser font-rendering variance. overflow-y-auto lets
  // the shell itself scroll once it's pinned at the floor, rather than
  // clipping/hiding the overflow the way lg:overflow-hidden did. Below lg it
  // stays a normal min-h-screen scrolling page, unaffected by any of this.
  // Background pattern: single masked graphic, colored with the STANDARD
  // shell's bg (#F5F7FA) — cross-swapped from this shell's own #CFDCE8, same
  // as above. Dark mode: same whiteish/faint treatment as the standard shell.
  // Same one-element / background-color cross-fade / fixed + h-screen technique
  // as the standard shell (see its comment above) — one masked element, opacity
  // baked into the rgba alpha, anchored to the viewport rather than this shell's
  // own (possibly internally scrolling) content height.
  return (
    <div className="font-headline relative flex min-h-screen flex-col bg-[#CFDCE8] text-[#0A0A0A] transition-colors lg:h-[max(100vh,880px)] lg:overflow-y-auto dark:bg-[#050607] dark:text-[#F5F7FA]">
      <div
        aria-hidden
        className="shell-pattern pointer-events-none fixed inset-x-0 top-0 h-screen bg-[rgba(245,247,250,0.6)] transition-colors duration-300 dark:bg-[rgba(245,247,250,0.1)]"
      />
      <div className="relative z-10 px-4 py-3 md:px-6">{pill}</div>
      <ToastProvider>
        <div className="relative z-10 w-full px-4 pb-4 pt-1 md:px-6 lg:min-h-0 lg:flex-1">
          {children}
        </div>
      </ToastProvider>
    </div>
  )
}
