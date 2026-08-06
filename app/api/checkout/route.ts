import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  choosePriceId,
  priceLookupKey,
  PriceResolutionError,
} from "@/lib/stripe-price";

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-05-27.dahlia",
      httpClient: Stripe.createFetchHttpClient(),
    })
  }
  return _stripe
}

/**
 * The seat Price, resolved by lookup key rather than hardcoded.
 *
 * This was `const PRICE_ID = "price_1TjNHc6ZCSojEKRrKs79ToJ0"` — a
 * `livemode: false` object, which meant going live required a source edit and a
 * redeploy in the middle of the key-and-webhook cutover. See lib/stripe-price.ts
 * for the full reasoning and for why the sandbox fallback is gated on test keys.
 *
 * Cached per Worker instance because the lookup is a network round trip on a
 * value that changes roughly never. The FALLBACK IS NEVER CACHED: if it were, an
 * instance that started before the lookup key was set would keep using the
 * sandbox Price for its whole lifetime, and the cutover would appear to have
 * silently not taken.
 */
let cachedPriceId: string | null = null;

async function resolvePriceId(stripe: Stripe): Promise<string> {
  if (cachedPriceId) return cachedPriceId;

  const lookupKey = priceLookupKey();
  // limit: 2 is enough to detect ambiguity without paging.
  const list = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 2,
  });

  const { priceId, usedFallback } = choosePriceId({
    matches: list.data.map((p) => ({ id: p.id, active: p.active })),
    secretKey: process.env.STRIPE_SECRET_KEY,
    lookupKey,
  });

  if (usedFallback) {
    console.warn(
      `[checkout] No Stripe Price carries lookup_key "${lookupKey}"; using the ` +
        `sandbox Price ${priceId}. This is expected until the lookup key is set, ` +
        `and is impossible once STRIPE_SECRET_KEY is a live key.`
    );
  } else {
    cachedPriceId = priceId;
  }

  return priceId;
}

/**
 * LAYER 1 of the US-only rule — charge prevention.
 *
 * Katy's position is a hard no on international data transfers: US law firms
 * only, US sub-processors, no adequacy decisions, no SCCs. The Terms and DPA
 * will say so, so the product has to mean it.
 *
 * Stripe Checkout offers no billing-country allowlist. Checked against the API
 * reference rather than assumed: `allowed_countries` exists only under
 * `shipping_address_collection`, which governs SHIPPING. Turning that on for a
 * digital product to borrow its country list would add a shipping-address field
 * to a certification purchase and assert something untrue about what is being
 * sold. So the rule is enforced here and again in the webhook.
 *
 * This layer is SELF-DECLARED and therefore defeatable — anyone can post a
 * different value. That is understood and accepted. Its job is to stop the
 * honest case before a card is charged, which is the case that actually
 * happens; layer 2 exists for everything else, and should almost never fire.
 */
const ALLOWED_BILLING_COUNTRY = "US";

export async function POST(req: NextRequest) {
  let seats: number;
  let billingCountry: string;

  try {
    const body = (await req.json()) as { seats?: unknown; billingCountry?: unknown };
    seats = typeof body.seats === "number" ? Math.floor(body.seats) : 1;
    if (seats < 1 || seats > 500) seats = Math.max(1, Math.min(500, seats));
    billingCountry =
      typeof body.billingCountry === "string" ? body.billingCountry.trim().toUpperCase() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Refused BEFORE the session is created, so no card is ever charged. 403 with
  // a specific message rather than a generic failure: a firm that cannot buy
  // deserves to know why in one read, not to think the site is broken.
  if (billingCountry !== ALLOWED_BILLING_COUNTRY) {
    return NextResponse.json(
      {
        error:
          "IURIX is currently available to US-based law firms only. We keep all training " +
          "and certification data within the United States, so we cannot accept " +
          "international billing addresses at this time.",
        code: "non_us_billing",
      },
      { status: 403 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const firmId = user?.app_metadata?.firm_id as string | undefined;

    if (user && firmId) {
      const admin = createAdminClient();
      const { data: firm } = await admin
        .from("firms")
        .select("status")
        .eq("id", firmId)
        .single();

      if (firm?.status === "active") {
        return NextResponse.json({ url: "/api/portal" });
      }
    }
  } catch (err) {
    console.error("checkout active-firm check failed, falling through:", err);
  }

  try {
    const stripe = getStripe();
    const priceId = await resolvePriceId(stripe);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: seats,
          adjustable_quantity: { enabled: true, minimum: 1, maximum: 500 },
        },
      ],
      success_url: `${appUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/`,
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      // Explicit, not incidental. automatic_tax already forces Stripe to collect
      // an address, but layer 2 in the webhook reads
      // customer_details.address.country and must never find it null — under
      // 'auto' Stripe collects only what it judges necessary. Making it
      // 'required' is what turns that backstop from best-effort into reliable.
      billing_address_collection: "required",
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // A price-resolution failure is an operator misconfiguration, not a Stripe
    // outage or a bad request, and it will affect EVERY buyer until someone
    // fixes it in the dashboard. Logged distinctly so it is greppable and does
    // not disappear into the general checkout-error noise. The buyer still gets
    // the generic message — the lookup key is not their problem.
    if (err instanceof PriceResolutionError) {
      console.error("[checkout] STRIPE PRICE MISCONFIGURED —", err.message);
    } else {
      console.error("Stripe checkout error:", err);
    }
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
