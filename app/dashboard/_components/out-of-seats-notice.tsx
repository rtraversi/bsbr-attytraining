'use client'

import { useState } from 'react'

/**
 * The "you can't invite anyone else" explanation on the Invitations card.
 *
 * It used to sit permanently as a block of amber text once a firm filled up.
 * Both invite forms already render disabled buttons at zero seats, so the block
 * was being blocked visibly — this is the reason, and it is now tucked behind a
 * short trigger instead of shouting continuously.
 *
 * Deliberately NOT styled as a warning at rest (Max): grey text, no danger icon.
 * Being at your seat limit is a normal state of a healthy account, not a fault,
 * and a permanent amber alert reads as something having gone wrong. It warms to
 * amber only once the notice is opened — i.e. at the moment someone is actually
 * trying to invite and needs to know the limit is what stopped them.
 *
 * ⚠️ Not hover-only. Hover is unavailable to keyboard and touch users entirely,
 * and what is hidden here is billing information plus the only route to fixing
 * the problem — making that hover-gated would put it out of reach rather than
 * merely being a style choice. So it opens on ANY of: hover (pointer), focus
 * (keyboard), or click/tap (touch, and it pins so it doesn't vanish mid-read).
 *
 * The disabled invite buttons can't be the trigger themselves: disabled controls
 * are not focusable and don't reliably emit pointer events.
 */
export function OutOfSeatsNotice() {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const open = pinned || hovered || focused

  return (
    <div
      className="mt-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The trigger carries the first half of the sentence, so nothing is
          duplicated when the rest is revealed and the permanent footprint is one
          short phrase rather than a paragraph.

          Colour is driven off `open` rather than a :hover class so all three
          entry points agree — a keyboard focus or a tap warms it exactly like a
          pointer hover does, instead of leaving those users on the grey resting
          state while the panel is open. */}
      <button
        type="button"
        onClick={() => setPinned(p => !p)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-center rounded-lg py-1 text-[11px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[#8A8A8A]/40 focus-visible:outline-none ${
          open
            ? 'text-[#B45309] dark:text-[#F0B357]'
            : 'text-[#8A8A8A] dark:text-[#7A8189]'
        }`}
      >
        Out of seats!
      </button>

      {/* grid-rows 0fr→1fr collapses without needing a measured height. */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="pt-1 text-center text-[11px] leading-relaxed text-[#B45309] dark:text-[#F0B357]">
            {/* Same /api/portal route the "Manage billing" button uses — it
                creates the Stripe portal session server-side. Never a hardcoded
                Stripe URL: portal links are per-customer and short-lived. */}
            <a
              href="/api/portal"
              className="font-bold underline underline-offset-2 transition-colors hover:text-[#92400E] dark:hover:text-[#FFCE7A]"
            >
              Add seats in Billing
            </a>{' '}
            to invite more.
          </p>
        </div>
      </div>
    </div>
  )
}
