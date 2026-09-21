import { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Who is this buyer? Resolved before anything is charged, provisioned,
 * cancelled or refused. Resolution order is owner before member (Max's
 * ruling, 2026-08-03), and among owned firms active beats non-active.
 *
 * Extracted from app/api/webhooks/stripe/route.ts (ix-dupcheck,
 * OPEN-ISSUES.md #9c) so app/api/checkout/route.ts can ask this question
 * BEFORE creating a Stripe session — the pre-charge half of the duplicate
 * check that only ever existed post-charge. Same two-layer shape as the
 * US-only rule already in this codebase: layer 1 here is self-declared
 * (the buyer typed this email) and therefore defeatable by typing a
 * different one at Stripe's own hosted page; layer 2 is the webhook's own
 * call to this same function against `session.customer_details.email`,
 * which Stripe collected and the buyer cannot forge. Both call sites
 * import this one implementation so they can never classify the same
 * buyer two different ways.
 */
export type BuyerIdentity =
  /** Owns a firm that is currently active — this payment would be a genuine duplicate. */
  | { kind: 'duplicate'; userId: string; firmId: string; firmSubscriptionId: string | null }
  /** Owns a firm that lapsed or was cancelled — reattach their history. */
  | { kind: 'returning'; userId: string; firmId: string; firmStatus: string }
  /** Owns nothing, but is staff at somebody else's active firm. */
  | { kind: 'email_in_use'; userId: string }
  /** Has a login but owns nothing and belongs to nothing active — give them a firm. */
  | { kind: 'existing_user_no_firm'; userId: string }
  /** No user row matches this email. The common case pre-charge; should be rare post-charge. */
  | { kind: 'unresolved' }

export async function resolveBuyer(supabase: AdminClient, email: string): Promise<BuyerIdentity> {
  const { data: userId, error: lookupError } = await supabase.rpc('find_user_id_by_email', {
    p_email: email,
  })

  // A lookup fault is transient, not an identity answer — surface it rather
  // than guessing at someone's billing.
  if (lookupError) throw lookupError

  // The generated signature says `Returns: string`, but a SQL function that
  // matches no rows resolves to null. Trust the runtime, not the type.
  if (!userId) return { kind: 'unresolved' }

  // Owner before member. Among owned firms, active beats non-active — a buyer
  // who owns both an active and a dead firm is duplicating, not returning.
  const { data: ownedFirms, error: firmsError } = await supabase
    .from('firms')
    .select('id, status, stripe_subscription_id')
    .eq('owner_id', userId)

  if (firmsError) throw firmsError

  const activeOwned = ownedFirms?.find((f) => f.status === 'active')
  if (activeOwned) {
    return {
      kind: 'duplicate',
      userId,
      firmId: activeOwned.id,
      firmSubscriptionId: activeOwned.stripe_subscription_id,
    }
  }

  // firms.status is CHECK-constrained to ('active','payment_failed','cancelled')
  // (0001:45-46), so anything not active is revivable by definition.
  const revivableOwned = ownedFirms?.[0]
  if (revivableOwned) {
    return {
      kind: 'returning',
      userId,
      firmId: revivableOwned.id,
      firmStatus: revivableOwned.status,
    }
  }

  // Owns nothing. Are they staff somewhere? app_metadata.firm_id is the right
  // signal rather than a firm_members lookup: reassign and delete both clear it
  // (member/delete/route.ts:64, and the 07-30 revoke-on-reassign work), so a
  // departed employee correctly reads as belonging to nothing and gets their
  // own firm instead of being refused.
  const { data: userRecord, error: userError } = await supabase.auth.admin.getUserById(userId)
  if (userError) throw userError

  const memberFirmId = userRecord.user?.app_metadata?.firm_id as string | undefined

  if (memberFirmId) {
    const { data: memberFirm, error: memberFirmError } = await supabase
      .from('firms')
      .select('status')
      .eq('id', memberFirmId)
      .maybeSingle()

    if (memberFirmError) throw memberFirmError

    // Only an *active* employer blocks the purchase. Staff at a lapsed firm are
    // free to buy their own.
    if (memberFirm?.status === 'active') return { kind: 'email_in_use', userId }
  }

  return { kind: 'existing_user_no_firm', userId }
}
