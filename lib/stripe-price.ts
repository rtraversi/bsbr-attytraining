/**
 * Resolving the seat Price by lookup key instead of by hardcoded ID.
 *
 * WHY THIS EXISTS
 *
 * `app/api/checkout/route.ts` used to carry `price_1TjNHc6ZCSojEKRrKs79ToJ0` as
 * a module constant. That ID is `livemode: false`. Going live therefore meant
 * editing source, rebuilding and redeploying at exactly the moment the operator
 * is also switching API keys and webhook secrets — the worst possible time to
 * need a deploy, and a step that is easy to forget until the first real customer
 * hits a card error.
 *
 * A lookup key is Stripe's own answer to this: a stable, human-chosen handle
 * that points at whichever Price currently carries it, in whichever mode the API
 * key belongs to. The same build then works in sandbox and in live mode with no
 * source change. Creating the live Price with `lookup_key: per_seat_annual`
 * becomes the last step of the cutover rather than the trigger for another
 * deploy.
 *
 * THE TRANSITION, AND WHY THE FALLBACK IS SHAPED THE WAY IT IS
 *
 * The sandbox Price has **no lookup key** — verified against the Stripe API on
 * 2026-08-03 and recorded in CLAUDE.md. So a lookup-key-only implementation
 * would break checkout the moment it shipped, before anyone had a chance to set
 * the key. Hence the fallback to the sandbox ID.
 *
 * The fallback is deliberately gated on the secret key being a TEST key:
 *
 *   - In sandbox, nothing changes today. Checkout keeps working untouched.
 *   - In live mode the fallback is inert. A live key cannot use a test Price
 *     anyway — Stripe rejects it — so falling back there would only convert a
 *     clear "no price carries this lookup key" error into a confusing
 *     "no such price" one. Live mode demands the lookup key, loudly.
 *
 * That makes the fallback self-retiring: it stops being reachable the instant
 * the live key is in place, without anyone having to remember to delete it.
 * Delete it anyway once the live Price exists and the sandbox Price has been
 * given the same lookup key.
 */

/** The lookup key the seat Price is expected to carry in every mode. */
export function priceLookupKey(): string {
  // Read lazily rather than at module scope: under the OpenNext/Workers runtime
  // module evaluation can happen before the environment is bound.
  return process.env.STRIPE_PRICE_LOOKUP_KEY ?? "per_seat_annual";
}

/**
 * Transitional only — the sandbox Price, which carries no lookup key.
 * Unreachable once STRIPE_SECRET_KEY is a live key. See the header.
 */
export const SANDBOX_FALLBACK_PRICE_ID = "price_1TjNHc6ZCSojEKRrKs79ToJ0";

/**
 * Stripe test secret keys are `sk_test_…`; restricted test keys are `rk_test_…`.
 * Anything else — including an undefined key, which is its own failure — is
 * treated as live, because the safe default is to refuse rather than to quietly
 * charge against a Price nobody chose.
 */
export function isTestSecretKey(key: string | undefined): boolean {
  return typeof key === "string" && /^(sk|rk)_test_/.test(key);
}

export class PriceResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PriceResolutionError";
  }
}

/** The subset of a Stripe Price this decision actually depends on. */
export interface PriceCandidate {
  id: string;
  active: boolean;
}

export interface PriceChoice {
  priceId: string;
  /** True when the sandbox ID was used because no Price carried the lookup key. */
  usedFallback: boolean;
}

/**
 * Pure decision: given the Prices Stripe returned for the lookup key, and the
 * secret key in use, which Price ID should Checkout charge against?
 *
 * Separated from the network call so the rules can be tested directly rather
 * than through a mock that only asserts the mock matches the code.
 */
export function choosePriceId(opts: {
  matches: PriceCandidate[];
  secretKey: string | undefined;
  lookupKey?: string;
}): PriceChoice {
  const lookupKey = opts.lookupKey ?? priceLookupKey();
  const active = opts.matches.filter((p) => p.active);

  if (active.length === 1) {
    return { priceId: active[0].id, usedFallback: false };
  }

  // Ambiguous is never safe to guess at: two active Prices sharing a lookup key
  // means someone is mid-migration, and picking one at random would bill some
  // customers at the old rate with no signal that it happened. Stripe does not
  // permit duplicate active lookup keys, so reaching this means something
  // outside the normal flow created it.
  if (active.length > 1) {
    throw new PriceResolutionError(
      `Multiple active Stripe Prices carry lookup_key "${lookupKey}" ` +
        `(${active.map((p) => p.id).join(", ")}). Refusing to guess which one to charge.`
    );
  }

  if (isTestSecretKey(opts.secretKey)) {
    return { priceId: SANDBOX_FALLBACK_PRICE_ID, usedFallback: true };
  }

  throw new PriceResolutionError(
    `No active Stripe Price carries lookup_key "${lookupKey}". ` +
      `In live mode this is fatal: set the lookup key on the live Price ` +
      `(Stripe Dashboard → Product → Price → Edit → Lookup key) and retry. ` +
      `No fallback is applied outside test mode.`
  );
}
