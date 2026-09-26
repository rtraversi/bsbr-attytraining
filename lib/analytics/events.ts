import { getCloudflareContext } from "@opennextjs/cloudflare";

// First-party funnel events, written to Workers Analytics Engine (dataset
// `iurix_events`, binding IURIX_EVENTS in wrangler.jsonc) and read back by
// /ops/metrics through the Analytics Engine SQL API.
//
// WHY ANALYTICS ENGINE AND NOT A THIRD-PARTY TOOL
//
// The privacy policy says we use no advertising cookies, cross-site trackers or
// third-party marketing analytics. These events never leave our own Cloudflare
// account, carry no cookie and no user identifier, so that promise stays true.
//
// Only the top of the funnel lives here — visits, pricing views, checkout
// starts, payments and where each came from. Everything after payment (firms,
// seats, invites, certificates, renewals due) is already in Supabase and
// /ops/metrics reads it from there, because the database is the authority.
//
// COLUMN LAYOUT — Analytics Engine columns are positional. Changing the order
// silently corrupts every query in lib/analytics/query.ts, so append only.
//   blob1 event      blob2 host       blob3 path
//   blob4 source     blob5 medium     blob6 campaign
//   blob7 variant    blob8 referrer   blob9 country
//   double1 value in cents (paid / renewed)   double2 seats

export type FunnelEvent = "page_view" | "checkout_started" | "paid" | "renewed";

export type Attribution = {
  source?: string;
  medium?: string;
  campaign?: string;
  variant?: string;
  referrer?: string;
};

const ATTRIBUTION_KEYS = ["source", "medium", "campaign", "variant", "referrer"] as const;

type EventsBinding = {
  writeDataPoint(point: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void;
};

/** Trim, lowercase and cap one untrusted string. Empty becomes undefined. */
function clean(value: unknown, max = 100): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase().slice(0, max);
  return v || undefined;
}

/**
 * Parse an attribution object from an untrusted body (the browser, or Stripe
 * metadata we wrote ourselves). Unknown keys are dropped, values are capped.
 */
export function parseAttribution(raw: unknown): Attribution {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const v = clean(src[key]);
    if (v) out[key] = v;
  }
  return out;
}

/** Attribution as Stripe metadata (`src_*` keys), so the webhook can recover it. */
export function attributionToMetadata(a: Attribution): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    if (a[key]) out[`src_${key}`] = a[key]!;
  }
  return out;
}

export function attributionFromMetadata(meta: Record<string, string> | null | undefined): Attribution {
  if (!meta) return {};
  return parseAttribution(
    Object.fromEntries(ATTRIBUTION_KEYS.map((k) => [k, meta[`src_${k}`]])),
  );
}

function binding(): EventsBinding | undefined {
  try {
    const env = getCloudflareContext().env as unknown as { IURIX_EVENTS?: EventsBinding };
    return env.IURIX_EVENTS;
  } catch {
    // `next dev` has no Cloudflare context. Tracking is simply off there.
    return undefined;
  }
}

/**
 * Record one event. Never throws and never awaits: a lost data point must not
 * be able to fail a checkout or a webhook.
 */
export function trackEvent(
  event: FunnelEvent,
  opts: {
    host?: string | null;
    path?: string;
    attribution?: Attribution;
    country?: string | null;
    valueCents?: number | null;
    seats?: number | null;
  } = {},
): void {
  try {
    const events = binding();
    if (!events) return;
    const a = opts.attribution ?? {};
    events.writeDataPoint({
      indexes: [event],
      blobs: [
        event,
        clean(opts.host) ?? "",
        clean(opts.path, 200) ?? "",
        a.source ?? "",
        a.medium ?? "",
        a.campaign ?? "",
        a.variant ?? "",
        a.referrer ?? "",
        clean(opts.country, 2) ?? "",
      ],
      doubles: [opts.valueCents ?? 0, opts.seats ?? 0],
    });
  } catch (err) {
    console.error("[analytics] writeDataPoint failed", err);
  }
}
