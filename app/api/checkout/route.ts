import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

const PRICE_ID = "price_1TjNHc6ZCSojEKRrKs79ToJ0";

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
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: PRICE_ID,
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
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
