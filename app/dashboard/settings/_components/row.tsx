/**
 * Shared card-row primitive for the Settings page — label(+description) on the
 * left, control on the right; stacks to a column below `sm`. Explicit
 * first/last flags (not `first:`/`last:` pseudo-classes) because a card's rows
 * are sometimes split across sibling components (a card's rows aren't always
 * literal DOM siblings), so CSS child-position selectors would be unreliable.
 */
export function Row({
  first = false,
  last = false,
  children,
}: {
  first?: boolean
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 ${
        first ? 'pt-0' : 'pt-5'
      } ${last ? 'pb-0' : 'border-b border-[#E5EEF5] pb-5 dark:border-[#1F2429]'}`}
    >
      {children}
    </div>
  )
}
