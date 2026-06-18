import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

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

export async function POST(req: NextRequest) {
  let seats: number;

  try {
    const body = (await req.json()) as { seats?: unknown };
    seats = typeof body.seats === "number" ? Math.floor(body.seats) : 1;
    if (seats < 1 || seats > 500) seats = Math.max(1, Math.min(500, seats));
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
