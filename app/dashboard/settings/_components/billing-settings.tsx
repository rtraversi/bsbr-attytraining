import Link from 'next/link'
import { Row } from './row'

/**
 * Billing — a pointer to /dashboard/billing, nothing more.
 *
 * This used to render two rows that both deep-linked /api/portal, so "Cancel
 * auto-renewal" was a second door to the same room with a different sign on it.
 * The real page now owns subscription state, payment history and the renewal
 * switch; this is just the signpost to it.
 *
 * The #billing anchor and its nav entry MUST stay. The pricing page's
 * auto-renewal disclosure names "Settings → Billing" as the cancellation path,
 * so that path is load-bearing — a legal disclosure points at it.
 *
 * NOTE the reminder_days control is NOT here and must not move here — it lives
 * under Notifications and runInactivityReminders still reads it. It becomes
 * dead config only after the inactivity rewrite.
 */
export function BillingSettings() {
  return (
    <Row first last>
      <div>
        <span className="block text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
          Subscription &amp; payment method
        </span>
        <p className="text-sm text-[#8A8A8A] dark:text-[#7A8189]">
          Your IURIX subscription renews automatically each year and your card is charged
          on your renewal date.
        </p>
      </div>
      <Link
        href="/dashboard/billing"
        className="shrink-0 rounded-full bg-[var(--brand-emphasis)] px-5 py-2.5 text-sm font-bold whitespace-nowrap text-white transition-opacity hover:opacity-90"
      >
        Manage billing
      </Link>
    </Row>
  )
}
