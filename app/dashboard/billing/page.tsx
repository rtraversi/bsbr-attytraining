import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BillingClient } from './_components/billing-client'

export const metadata = {
  title: 'Billing — IURIX',
}

/**
 * The billing page.
 *
 * Exists because the Settings section it replaces had two rows that both
 * deep-linked the same Stripe portal — "Cancel auto-renewal" was a second door
 * to the same room with a different sign on it. The split now is: this page
 * shows state and owns the renewal switch; the Stripe portal owns changing the
 * payment method. No card data is rendered, accepted, or stored here.
 *
 * Server component for the guard only. Data is fetched client-side from
 * /api/billing/summary so the auto-renew control can re-render from the
 * mutation's response without a full page round trip.
 */
export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const firmId = user.app_metadata?.firm_id as string | undefined
  const role = user.app_metadata?.role as string | undefined
  if (!firmId) redirect('/login')

  // Admin-only, matching the API routes behind it. Employees are sent to their
  // own landing rather than shown a forbidden page for a route that is simply
  // not theirs.
  if (role !== 'admin') redirect('/dashboard/overview')

  return <BillingClient />
}
