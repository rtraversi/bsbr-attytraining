import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  choosePriceId,
  priceLookupKey,
  PriceResolutionError,
} from "@/lib/stripe-price";
import { CURRENT_TERMS_VERSION, isCurrentTermsVersion } from "@/lib/legal/terms";
import { normalizeFirmName } from "@/lib/firm-name";
import { resolveBuyer } from "@/lib/buyer-identity";

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
  let termsAccepted: boolean;
  let termsVersion: unknown;
  let firmName: string | null;
  let email: string;

  try {
    const body = (await req.json()) as {
      seats?: unknown;
      billingCountry?: unknown;
      termsAccepted?: unknown;
      termsVersion?: unknown;
      firmName?: unknown;
      email?: unknown;
    };
    seats = typeof body.seats === "number" ? Math.floor(body.seats) : 1;
    if (seats < 1 || seats > 500) seats = Math.max(1, Math.min(500, seats));
    billingCountry =
      typeof body.billingCountry === "string" ? body.billingCountry.trim().toUpperCase() : "";
    termsAccepted = body.termsAccepted === true;
    termsVersion = body.termsVersion;
    // Optional. Only /pricing's slider collects this today (ix-firmnametwice);
    // a caller that doesn't send it falls straight back to the pre-existing
    // behavior — the webhook creates the firm with name: '' and /onboarding
    // asks once, same as before this field existed.
    firmName = normalizeFirmName(body.firmName);
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ix-dupcheck (OPEN-ISSUES.md #9c). Required, unlike firmName: omitting it
  // doesn't degrade gracefully here, it silently reintroduces the exact bug
  // being fixed. A basic shape check only — Stripe is the one that actually
  // validates deliverability, and rejecting too aggressively here would block
  // a real buyer over a false positive.
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  // ix-termsaccept. Refused before the Stripe session exists, so a firm can
  // never come into being without a recorded acceptance. The version must match
  // what we are serving right now: a stale version means the browser is running
  // old JS against newly published terms, and consent to superseded wording is
  // not consent to the current wording.
  if (!termsAccepted || !isCurrentTermsVersion(termsVersion)) {
    return NextResponse.json(
      {
        error:
          // ix-dparetired (Katy, 2026-09-21): the DPA is permanently out of
          // scope, not just unwritten yet. This message must not ask for
          // acceptance of a document /pricing's own checkbox doesn't offer.
          "Please review and accept the Terms of Service and Privacy Policy " +
          "before continuing. If you already ticked the box, reload the page. " +
          "Our terms may have been updated since you opened it.",
        code: "terms_not_accepted",
      },
      { status: 400 }
    );
  }
  const termsAcceptedAt = new Date().toISOString();

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

  // ix-dupcheck (OPEN-ISSUES.md #9c).
  //
  // LAYER 1 of the duplicate-purchase check — charge prevention, same shape as
  // the US-only rule above. The check above only catches a buyer who is
  // CURRENTLY SIGNED IN as the admin of their own active firm. It misses the
  // common real case: someone who forgot they already have an account, opened
  // a private window, or is simply signed out, and types the same email they
  // already used. Nothing existed to stop that buyer's card from being
  // charged before this — the webhook's resolveBuyer() only ever ran AFTER a
  // successful payment, so the fix was always "cancel and maybe refund",
  // never "don't charge."
  //
  // SELF-DECLARED and therefore defeatable: this is the email the BUYER
  // typed, not one Stripe verified, so it stops the honest case (the person
  // who didn't realize, or wasn't trying to be clever) rather than a
  // determined bad actor who edits the email on Stripe's own hosted page.
  // Layer 2 is unchanged and still authoritative: the webhook calls this same
  // resolveBuyer() again against session.customer_details.email — the
  // address Stripe actually collected — and cancels + alerts if anyone slips
  // past this layer. Both layers import the identical function
  // (lib/buyer-identity.ts) so they can never disagree about what a given
  // email means.
  //
  // `returning` (a lapsed/cancelled firm resubscribing) and
  // `existing_user_no_firm` are NOT refused here — both are legitimate
  // purchases the webhook already knows how to provision correctly.
  try {
    const admin = createAdminClient();
    const buyer = await resolveBuyer(admin, email);

    if (buyer.kind === "duplicate") {
      return NextResponse.json(
        {
          error:
            "This email already has an active IURIX subscription. Sign in to reach your " +
            "dashboard, or use a different email if this is a separate firm.",
          code: "duplicate",
        },
        { status: 409 }
      );
    }

    if (buyer.kind === "email_in_use") {
      return NextResponse.json(
        {
          error:
            "This email is already registered as a staff member at another firm's IURIX " +
            "account. Use a different email to set up your own firm.",
          code: "email_in_use",
        },
        { status: 409 }
      );
    }
  } catch (err) {
    // Fail open, same posture as the active-firm check above: a lookup fault
    // is not proof of a duplicate, and the webhook's layer-2 check remains
    // the authoritative backstop regardless of whether this one ran.
    console.error("checkout duplicate-buyer check failed, falling through:", err);
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
      // ix-dupcheck. Pre-fills the email Stripe asks for with the one already
      // checked above, so the buyer isn't asked to type it twice. Soft only —
      // customer_email pre-fills an editable field, it does not lock it the
      // way passing an existing `customer` id would. That edit surface is
      // exactly what layer 2 in the webhook exists to catch.
      customer_email: email,
      // ix-termsaccept. Carried on the session so the webhook can persist it
      // onto the firm row it creates. The acceptance happened HERE, before any
      // charge; the webhook is only the transport to the database.
      metadata: {
        terms_accepted_at: termsAcceptedAt,
        terms_version: CURRENT_TERMS_VERSION,
        // ix-firmnametwice. Read by provisionFirm() in the webhook, which uses
        // it to pre-fill firms.name instead of the deliberate ''. Only set when
        // the caller actually sent a usable name — omitted entirely rather than
        // written as an empty string, so the webhook's own fallback stays in
        // charge of what "no name given" means.
        ...(firmName ? { firm_name: firmName } : {}),
      },
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
