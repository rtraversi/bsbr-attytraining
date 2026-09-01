'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from './theme'
import { isTrainingRoute } from './employee-tab-bar'
import { IntakeChip, EmailDeliverabilityChip, type UnreachableMember } from './setup-notices'

interface NavPillProps {
  firmName: string | null
  role: string | null
  /**
   * Firm setup state, admin-only, resolved in app/dashboard/layout.tsx.
   *
   * These used to be full-width banners above the dashboard grid and are now
   * chips in this pill — which means they render on EVERY /dashboard route
   * rather than only the admin home. Deliberate: the intake prompt is the only
   * thing in the product that ever gets the intake completed (see
   * setup-notices.tsx), so following the admin around is the point.
   *
   * Null for employees and for any firm with nothing outstanding.
   */
  setup?: SetupState | null
  /**
   * Whether this firm's policy has been approved and released.
   *
   * 🔴 GATED ON `delivered`, NOT ON "an intake exists". A link to
   * /dashboard/policy before delivery leads to a waiting screen, and a nav item
   * that reliably goes nowhere teaches people to ignore it. It appears the day
   * the document does — which also makes its appearance the signal.
   *
   * Resolved in the LAYOUT, not here: it needs the session row, and the layout
   * is already reading intake state for the setup chips.
   */
  policyDelivered?: boolean
}

export interface SetupState {
  /** Has this firm submitted its policy intake? Drives a CHIP, never a redirect. */
  intakeSubmitted: boolean
  /** A part-finished intake, so the chip can say "continue" rather than "start". */
  intakeInProgress: boolean
  /** Members whose address is unproven or whose invite bounced. Already filtered. */
  unreachable: UnreachableMember[]
}

// The three routes that make up the training experience are now owned by the
// bottom tab bar (its own sub-nav), and imported rather than re-listed here —
// this was a hand-copied duplicate of that list.

const ICON_CLASS = 'h-[17px] w-[17px] shrink-0'

function DashboardIcon() {
  return (
    <svg className={ICON_CLASS} viewBox="0 0 2250 2250" fill="currentColor">
      <path d="M1465.27,431.517l0,323.191c0,132.378 -107.473,239.851 -239.851,239.851l-789.635,0c-132.377,0 -239.851,-107.473 -239.851,-239.851l0,-323.191c0,-132.377 107.474,-239.85 239.851,-239.85l789.635,-0c132.378,-0 239.851,107.473 239.851,239.85Zm-212.121,0c-0,-15.304 -12.425,-27.729 -27.73,-27.729l-789.635,-0c-15.304,-0 -27.729,12.425 -27.729,27.729l-0,323.191c-0,15.305 12.425,27.73 27.729,27.73l789.635,0c15.305,0 27.73,-12.425 27.73,-27.73l-0,-323.191Z" />
      <path d="M2054.07,341.018l-0,504.19c-0,82.429 -66.923,149.351 -149.352,149.351l-204.297,0c-82.43,0 -149.352,-66.922 -149.352,-149.351l0,-504.19c0,-82.429 66.922,-149.351 149.352,-149.351l204.297,-0c82.429,-0 149.352,66.922 149.352,149.351Zm-290.88,62.77l0,378.65l78.758,0l0.001,-378.65l-78.759,-0Z" />
      <path d="M823.2,1238.63l-0,631.948c-0,103.625 -84.131,187.755 -187.756,187.755l-251.76,0c-103.625,0 -187.756,-84.13 -187.756,-187.755l0,-631.948c0,-103.625 84.131,-187.755 187.756,-187.755l251.76,-0c103.625,-0 187.756,84.13 187.756,187.755Zm-415.15,24.366l-0,583.216l203.029,0l0,-583.216l-203.029,-0Z" />
      <path d="M2054.07,1356.32l-0,396.576c-0,168.577 -136.864,305.441 -305.442,305.441l-537.141,0c-168.578,0 -305.442,-136.864 -305.442,-305.441l-0,-396.576c-0,-168.578 136.864,-305.441 305.442,-305.441l537.141,-0c168.578,-0 305.442,136.863 305.442,305.441Zm-212.122,0c0,-51.505 -41.815,-93.32 -93.32,-93.32l-537.141,-0c-51.505,-0 -93.321,41.815 -93.321,93.32l0,396.576c0,51.505 41.816,93.32 93.321,93.32l537.141,0c51.505,0 93.32,-41.815 93.32,-93.32l0,-396.576Z" />
    </svg>
  )
}

function TrainingIcon() {
  return (
    <svg className={ICON_CLASS} viewBox="0 0 2250 2250" fill="currentColor">
      <path d="M936.154,836.923l-233.421,410.305l-126.425,-74.076l233.421,-410.305l126.425,74.076Z" />
      <path d="M845.403,1247.23l-507.805,892.615l-337.598,-197.808l507.805,-892.615l337.598,197.808Zm-201.716,54.045l-81.142,-47.545l-360.83,634.262l81.143,47.544l360.829,-634.261Z" />
      <path d="M531.758,1798.55l-74.677,131.267l-337.597,-197.808l74.677,-131.267l337.597,197.808Z" />
      <path d="M1313.85,836.923l126.425,-74.076l233.421,410.305l-126.425,74.076l-233.421,-410.305Z" />
      <path d="M1404.6,1247.23l337.598,-197.808l507.805,892.615l-337.598,197.808l-507.805,-892.615Zm201.716,54.045l360.829,634.261l81.143,-47.544l-360.83,-634.262l-81.142,47.545Z" />
      <path d="M1718.24,1798.55l74.677,131.267l337.597,-197.808l-74.677,-131.267l-337.597,197.808Z" />
      <path d="M1137.11,110.157c241.711,-0 437.949,199.154 437.949,444.457c0,245.302 -196.238,444.457 -437.949,444.457c-241.71,-0 -437.948,-199.155 -437.948,-444.457c-0,-245.303 196.238,-444.457 437.948,-444.457Zm0,245.934c-106.988,-0 -192.014,89.944 -192.014,198.523c-0,108.578 85.026,198.522 192.014,198.522c106.989,0 192.015,-89.944 192.015,-198.522c-0,-108.579 -85.026,-198.523 -192.015,-198.523Z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className={ICON_CLASS} viewBox="0 0 2250 2250" fill="currentColor">
      <path d="M578.628,178.657c359.438,35.9 733.306,35.9 1092.74,-0c148.628,329.232 335.561,653.011 546.371,946.343c-210.81,293.332 -397.743,617.111 -546.371,946.343c-359.438,-35.9 -733.306,-35.9 -1092.74,0c-148.628,-329.232 -335.561,-653.011 -546.371,-946.343c210.81,-293.332 397.743,-617.111 546.371,-946.343Zm546.372,516.581c-243.399,0 -441.008,197.609 -441.008,441.008c0,243.399 197.609,441.008 441.008,441.008c243.399,0 441.008,-197.609 441.008,-441.008c-0,-243.399 -197.609,-441.008 -441.008,-441.008Z" />
    </svg>
  )
}

function PolicyIcon() {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function SupportIcon() {
  return (
    <svg className={ICON_CLASS} viewBox="0 0 2250 2250" fill="currentColor">
      <circle cx="1125" cy="580.645" r="580.645" />
      <path d="M1995.97,2250l-1741.94,0c0,-521.107 389.946,-943.548 870.968,-943.548c481.022,-0 870.968,422.441 870.968,943.548Z" />
    </svg>
  )
}

/** Generic person-outline mark used in the profile slot. */
function ProfileIcon() {
  return (
    <svg className="h-full w-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  )
}

/** The circular profile slot. Always the person-outline mark — this product
 * deliberately holds no profile photographs (decision: Rob, 2026-07-28).
 * Tone mirrors the sketch's subtle, near-invisible-by-design opacity rules
 * for the mark's backdrop. */
function ProfileSlot({ tone }: { tone: 'idle' | 'active' | 'identity' }) {
  const toneClass = {
    idle: 'bg-white/15',
    // Was bg-black/[0.08]; the active pill is now blue, on which a black tint
    // reads as a visible disc. White at 15% keeps it near-invisible as designed.
    active: 'bg-white/15 dark:bg-black/[0.08]',
    identity: 'bg-black/[0.06] dark:bg-white/10',
  }[tone]

  return (
    <span
      className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full p-[5px] ${toneClass}`}
    >
      <ProfileIcon />
    </span>
  )
}

function SunIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"
      />
    </svg>
  )
}

/** Dark-mode toggle — a track with a sliding knob and an explicit sun and moon
 * (Rob asked for the icons), plus the click-triggered squish (see the
 * `nav-switch-clicking` keyframe in globals.css).
 *
 * The icons sit ABOVE the knob and never change colour: the sun is always dark
 * and the moon always light, which is correct in both themes because the track
 * and the knob invert together. Light mode = white knob over the sun on a black
 * track; dark mode = black knob over the moon on a light track. Either way the
 * dark glyph is on the light surface and the light glyph on the dark one. The
 * knob marks the selected side, so the unselected glyph is dimmed rather than
 * recoloured. */
function ThemeToggle() {
  const themeCtx = useTheme()
  const [clicking, setClicking] = useState(false)
  const isDark = themeCtx?.theme === 'dark'

  const handleClick = () => {
    themeCtx?.toggle()
    setClicking(true)
    setTimeout(() => setClicking(false), 380)
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={handleClick}
      className={`relative h-10 w-[88px] shrink-0 rounded-full bg-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-emphasis)] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-[#F5F7FA] dark:focus-visible:ring-[var(--brand-primary)] dark:focus-visible:ring-offset-[#0D0F12] ${
        clicking ? 'nav-switch-clicking' : ''
      }`}
    >
      {/* Knob. Geometry is shared with the two icon slots below — same top/height
          and same left-1 / left-11 stops — so each glyph lands dead-centre of the
          knob when the knob is on its side. */}
      <span
        aria-hidden
        className={`absolute top-1 h-8 w-10 rounded-full bg-white transition-[left] duration-[380ms] ease-[cubic-bezier(.34,1.56,.64,1)] dark:bg-[#0A0A0A] ${
          isDark ? 'left-11' : 'left-1'
        }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1 left-1 z-10 flex h-8 w-10 items-center justify-center text-[#0A0A0A] transition-opacity duration-[380ms] ${
          isDark ? 'opacity-50' : 'opacity-100'
        }`}
      >
        <SunIcon />
      </span>
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1 left-11 z-10 flex h-8 w-10 items-center justify-center text-[#F5F7FA] transition-opacity duration-[380ms] ${
          isDark ? 'opacity-100' : 'opacity-50'
        }`}
      >
        <MoonIcon />
      </span>
    </button>
  )
}

/**
 * Unified overhead nav, shared by the admin and employee shells.
 *
 * Admin: profile-icon + firm name + "Dashboard" + grid icon merge into ONE
 * pill linking to /dashboard, sharing the exact same pillBase/pillIdle/
 * pillActive treatment as every other link (active only when on /dashboard).
 * Member: the same visual slot renders as plain, non-interactive identity
 * content — no link, no hover, no active state.
 *
 * The dark-mode toggle used to live in a click-to-open AccountMenu dropdown;
 * it's now inline in the pill itself (see ThemeToggle above). Sign out moved
 * to the end of /dashboard/settings; name/email display already lives there.
 *
 * Separate from EmployeeTabBar: this switches app sections, that one navigates
 * within the training area.
 */
export function NavPill({ firmName, role, setup = null, policyDelivered = false }: NavPillProps) {
  const pathname = usePathname()
  const isAdmin = role === 'admin'
  const isDashboardActive = pathname === '/dashboard'

  // Overview is the training entry point for everyone — greeting, course outline,
  // cert status — now that admins are unblocked there too (route-based shell).
  const trainingHref = '/dashboard/overview'

  const links = [
    {
      href: trainingHref,
      label: 'Training',
      icon: <TrainingIcon />,
      active: isTrainingRoute(pathname),
    },
    // Admin-only and delivered-only. The policy carries the firm's disclosures,
    // its tool inventory and its vendor positions; staff have no business in it,
    // which is the same rule /dashboard/policy enforces server-side. This is
    // the affordance, not the gate.
    ...(isAdmin && policyDelivered
      ? [
          {
            href: '/dashboard/policy',
            label: 'Policy',
            icon: <PolicyIcon />,
            active: pathname.startsWith('/dashboard/policy'),
          },
        ]
      : []),
    // Order is Training → Support → Settings (Max): Settings sits last so it is
    // adjacent to the light/dark toggle, which is also a preference control.
    {
      href: '/dashboard/support',
      label: 'Support',
      icon: <SupportIcon />,
      active: pathname.startsWith('/dashboard/support'),
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: <SettingsIcon />,
      active: pathname.startsWith('/dashboard/settings'),
    },
  ]

  // ── The bar's colour rule ────────────────────────────────────────────────
  //
  //   BLUE is where you can go.  AMBER is what you owe.
  //
  // Every nav pill is blue-family: pale tint at rest, solid app blue when
  // active. The two setup chips are amber-family (see setup-notices.tsx), so
  // status stops competing with navigation for the same visual language.
  //
  // Every pairing below was measured, not eyeballed. AA wants 4.5:1 at this
  // size (14px semibold is under the 18.66px large-text threshold).
  //
  // Every pill — dashboard cluster included — shares this exact height,
  // padding, font-size and corner radius. Only pillIdle/pillActive differ.
  const pillBase =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm'
  // Idle: pale blue ground, BRAND BLUE label (Max, 2026-08-27). The three
  // section links now read as blue-on-blue and the active pill as solid-blue,
  // so the whole left-to-right run is one colour family at two weights.
  //
  // Hover moves the GROUND, not the text — the label is already the brand
  // colour, so darkening it further would read as a second state rather than as
  // feedback.
  //
  // 🔴 #0094FF on #EAF6FF measures 2.86:1. AA wants 4.5:1 at 14px semibold, so
  // this is below the bar; see the note on pillActive.
  const pillIdle =
    'bg-[#EAF6FF] text-[var(--brand-emphasis)] hover:bg-[#DCEEFF] dark:bg-[#131A20] dark:text-[var(--brand-primary)] dark:hover:bg-[#18212A]'
  // Active: solid app blue, WHITE label (Max, 2026-08-27), which is what makes
  // the Dashboard pill read as the anchor against the lighter section links.
  //
  // 🔴 KNOWN AND ACCEPTED: white on #0094FF is 3.14:1, under AA's 4.5:1 for
  // 14px semibold. This is the pairing Batch A introduced and the 2026-08-25
  // notes flagged; it was briefly near-black (6.30:1) and Max chose white for
  // the contrast BETWEEN pills. Recorded, not hidden — the alternative that
  // keeps this exact look and clears AA is a slightly deeper ground, white on
  // #0077CC (4.66:1), which needs no change to --brand-emphasis itself because
  // it applies only to this pill. Do not "fix" it by moving the brand token:
  // #0094FF is the app's signature colour and STATE.md's standing rule is that
  // the palette does not move without Max saying so.
  //
  // Dark mode is untouched and already passes: #0A0A0A on --brand-primary
  // (#32C7FF) is 10.13:1.
  const pillActive =
    'bg-[var(--brand-emphasis)] text-white dark:bg-[var(--brand-primary)] dark:text-[#0A0A0A]'

  // Chips are status, not navigation, so they are quieter and narrower than a
  // nav pill — but exactly the same HEIGHT at both breakpoints, or the pill's
  // row goes ragged. That parity is why the numbers look arbitrary and are not:
  //   below sm  py-2   + text-xs (16px)  = 32px, same as pillBase
  //   sm and up py-3   + text-xs (16px)  = 40px, same as pillBase's py-2.5 + text-sm
  // At pillBase's own px-5/text-sm the two chips plus three nav links plus the
  // firm name overflow a 1280 viewport, which pushes the links into the
  // horizontal scroller — status should not cost navigation its place.
  const chipBase =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:gap-2 sm:px-3.5 sm:py-3'

  return (
    <nav className="flex max-w-full">
      <div className="relative flex w-full items-center justify-between gap-2 rounded-full bg-white p-1.5 shadow-[0_1px_2px_rgba(10,10,10,0.04)] transition-shadow hover:shadow-[0_6px_20px_rgba(10,10,10,0.10)] dark:bg-[#0D0F12] dark:shadow-none dark:hover:shadow-[0_6px_20px_rgba(0,0,0,0.5)]">
        {isAdmin ? (
          <Link
            href="/dashboard"
            aria-current={isDashboardActive ? 'page' : undefined}
            className={`${pillBase} shrink-0 ${isDashboardActive ? pillActive : pillIdle}`}
          >
            <ProfileSlot tone={isDashboardActive ? 'active' : 'idle'} />
            {/* Hidden below sm — same reasoning as the old firm-name-only rule:
                on a phone this text alone would eat the pill's width and push
                the nav links out of reach. Icons stay visible either way. */}
            {firmName && <span className="font-headline hidden sm:inline">{firmName} Dashboard</span>}
            <DashboardIcon />
          </Link>
        ) : (
          <span className={`${pillBase} shrink-0 bg-[#F5F7FA] text-[#0A0A0A] dark:bg-[#131A20] dark:text-[#F5F7FA]`}>
            <ProfileSlot tone="identity" />
            {firmName && <span className="font-headline hidden sm:inline">{firmName}</span>}
          </span>
        )}

        <div className="flex min-w-0 items-center gap-2">
          {/*
            Setup chips sit OUTSIDE the overflow-x-auto scroller below, for the
            same reason ThemeToggle does: the email chip opens an absolutely
            positioned popover, and an ancestor with overflow-x-auto would clip
            it to the scroller's box. shrink-0 on each chip means a narrow
            viewport squeezes the links row — which is built to scroll — rather
            than the chips, which are not.
          */}
          {isAdmin && setup && (
            <>
              {!setup.intakeSubmitted && (
                <IntakeChip inProgress={setup.intakeInProgress} chipClassName={chipBase} />
              )}
              <EmailDeliverabilityChip members={setup.unreachable} chipClassName={chipBase} />
            </>
          )}

          {/* Always visible. min-w-0 + overflow-x-auto lets the row shrink and
              scroll within the pill on a narrow screen instead of pushing the
              whole page sideways. ThemeToggle lives outside this scroller —
              its click-animation overshoot would otherwise get clipped by
              overflow-x-auto. */}
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.active ? 'page' : undefined}
                className={`${pillBase} shrink-0 ${link.active ? pillActive : pillIdle}`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
