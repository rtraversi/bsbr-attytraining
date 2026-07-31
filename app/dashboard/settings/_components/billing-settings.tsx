import { Row } from './row'

/**
 * Billing — a signpost to the Stripe Customer Portal, not a payment UI.
 *
 * Deliberately builds nothing of its own. app/api/portal/route.ts already
 * creates a Customer Portal session (a GET that redirects), and the portal
 * handles the payment method, invoice history, and cancelling auto-renewal.
 * Re-implementing any of that here would mean holding card state we have no
 * reason to touch, and would drift from what Stripe shows.
 *
 * It exists because the pricing page's auto-renewal disclosure promises a
 * cancellation path by name ("Settings → Billing"). Before this, the only route
 * to the portal was a button on the admin dashboard — a promise the product did
 * not keep. This is a server component: it renders links and static copy, so
 * there is no client JS to ship.
 *
 * NOTE the reminder_days control is NOT here and must not move here — it lives
 * under Notifications and runInactivityReminders still reads it. It becomes
 * dead config only after the inactivity rewrite.
 */
export function BillingSettings() {
  return (
    <>
      <Row first>
        <div>
          <span className="block text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
            Subscription &amp; payment method
          </span>
          <p className="text-sm text-[#8A8A8A] dark:text-[#7A8189]">
            Your IURIX subscription renews automatically each year and the card on file
            is charged on your renewal date. Open the billing portal to see the exact
            amount, update your card, or download invoices.
          </p>
        </div>
        <a
          href="/api/portal"
          className="shrink-0 rounded-xl bg-[#0094FF] px-5 py-2.5 text-sm font-bold whitespace-nowrap text-white transition-opacity hover:opacity-90"
        >
          Open billing portal
        </a>
      </Row>

      <Row last>
        <div>
          <span className="block text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">
            Cancel auto-renewal
          </span>
          <p className="text-sm text-[#8A8A8A] dark:text-[#7A8189]">
            Cancelling stops future charges. Your firm keeps every certificate already
            earned — those records are permanent — but staff cannot re-certify once the
            subscription ends.
          </p>
        </div>
        <a
          href="/api/portal"
          className="shrink-0 rounded-xl border border-[#E5EEF5] px-5 py-2.5 text-sm font-bold whitespace-nowrap text-[#0A0A0A] transition-colors hover:bg-[#F5F7FA] dark:border-[#1F2429] dark:text-[#F5F7FA] dark:hover:bg-[#1F2429]"
        >
          Manage in portal
        </a>
      </Row>
    </>
  )
}
