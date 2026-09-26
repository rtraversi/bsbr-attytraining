// Server-only: reads CF_ANALYTICS_TOKEN. Never import from a Client Component.
//
// Reads lib/analytics/events.ts's data back through the Analytics Engine SQL API.
// Column meanings (blob1 = event, blob2 = host, …) are documented there.
//
// Needs CF_ACCOUNT_ID (wrangler.jsonc var) and CF_ANALYTICS_TOKEN (Worker secret,
// Account Analytics: Read). Analytics Engine keeps three months of data, so the
// longest range the page offers is 90 days.

const PROD_HOST = "iurixaccreditation.com";

export class AnalyticsNotConfigured extends Error {}

type Row = Record<string, string | number>;

async function sql(query: string): Promise<Row[]> {
  const account = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_ANALYTICS_TOKEN;
  if (!account || !token) {
    throw new AnalyticsNotConfigured("CF_ACCOUNT_ID or CF_ANALYTICS_TOKEN is not set");
  }
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: query,
      cache: "no-store",
    },
  );
  const text = await res.text();
  if (!res.ok) {
    // A dataset that has never been written to does not exist yet. Before the
    // first event lands, that is "no data", not a failure.
    if (/unknown table|does not exist/i.test(text)) return [];
    throw new Error(`Analytics Engine ${res.status}: ${text.slice(0, 300)}`);
  }
  return (JSON.parse(text) as { data?: Row[] }).data ?? [];
}

const num = (v: unknown) => Number(v ?? 0) || 0;

/**
 * One label per visitor source: explicit utm_source/ref first, then Katy's ?v=
 * variant, then the referring site, else "direct".
 */
function sourceLabel(r: Row): string {
  if (r.src) return String(r.src);
  if (r.variant) return `link v${r.variant}`;
  if (r.referrer) return String(r.referrer);
  return "direct";
}

export type TrafficReport = {
  /** views of "/" and "/pricing", checkouts started, paid, renewed, revenue */
  funnel: {
    homeViews: number;
    pricingViews: number;
    checkoutsStarted: number;
    paid: number;
    paidCents: number;
    renewed: number;
    renewedCents: number;
  };
  /** One row per source label, with how far that source got. */
  sources: { source: string; views: number; checkouts: number; paid: number; paidCents: number }[];
  referrers: { referrer: string; views: number }[];
  countries: { country: string; views: number }[];
  daily: { day: string; views: number; checkouts: number; paid: number }[];
};

export async function trafficReport(days: number): Promise<TrafficReport> {
  // `days` is chosen from a fixed list by the page; never interpolate raw input.
  const range = `timestamp > NOW() - INTERVAL '${Math.trunc(days)}' DAY AND blob2 = '${PROD_HOST}'`;

  const [byEvent, bySource, byReferrer, byCountry, byDay] = await Promise.all([
    sql(`SELECT blob1 AS event, blob3 AS path,
                SUM(_sample_interval) AS n,
                SUM(_sample_interval * double1) AS cents
         FROM iurix_events WHERE ${range}
         GROUP BY event, path`),
    // Grouped on the raw columns and labelled in JS below: the Analytics Engine
    // SQL dialect has no concat() (422 in production, 2026-09-25).
    sql(`SELECT blob4 AS src, blob7 AS variant, blob8 AS referrer, blob1 AS event,
                SUM(_sample_interval) AS n,
                SUM(_sample_interval * double1) AS cents
         FROM iurix_events WHERE ${range} AND blob1 != 'renewed'
         GROUP BY src, variant, referrer, event`),
    sql(`SELECT blob8 AS referrer, SUM(_sample_interval) AS n
         FROM iurix_events WHERE ${range} AND blob1 = 'page_view' AND blob8 != ''
         GROUP BY referrer ORDER BY n DESC LIMIT 15`),
    sql(`SELECT blob9 AS country, SUM(_sample_interval) AS n
         FROM iurix_events WHERE ${range} AND blob1 = 'page_view' AND blob9 != ''
         GROUP BY country ORDER BY n DESC LIMIT 10`),
    sql(`SELECT toStartOfDay(timestamp) AS day, blob1 AS event, SUM(_sample_interval) AS n
         FROM iurix_events WHERE ${range}
         GROUP BY day, event ORDER BY day`),
  ]);

  const funnel: TrafficReport["funnel"] = {
    homeViews: 0,
    pricingViews: 0,
    checkoutsStarted: 0,
    paid: 0,
    paidCents: 0,
    renewed: 0,
    renewedCents: 0,
  };
  for (const r of byEvent) {
    const n = num(r.n);
    if (r.event === "page_view" && r.path === "/") funnel.homeViews += n;
    else if (r.event === "page_view" && r.path === "/pricing") funnel.pricingViews += n;
    else if (r.event === "checkout_started") funnel.checkoutsStarted += n;
    else if (r.event === "paid") {
      funnel.paid += n;
      funnel.paidCents += num(r.cents);
    } else if (r.event === "renewed") {
      funnel.renewed += n;
      funnel.renewedCents += num(r.cents);
    }
  }

  const sourceMap = new Map<string, TrafficReport["sources"][number]>();
  for (const r of bySource) {
    const key = sourceLabel(r);
    const row = sourceMap.get(key) ?? { source: key, views: 0, checkouts: 0, paid: 0, paidCents: 0 };
    if (r.event === "page_view") row.views += num(r.n);
    if (r.event === "checkout_started") row.checkouts += num(r.n);
    if (r.event === "paid") {
      row.paid += num(r.n);
      row.paidCents += num(r.cents);
    }
    sourceMap.set(key, row);
  }

  const dayMap = new Map<string, TrafficReport["daily"][number]>();
  for (const r of byDay) {
    const day = String(r.day).slice(0, 10);
    const row = dayMap.get(day) ?? { day, views: 0, checkouts: 0, paid: 0 };
    if (r.event === "page_view") row.views += num(r.n);
    if (r.event === "checkout_started") row.checkouts += num(r.n);
    if (r.event === "paid") row.paid += num(r.n);
    dayMap.set(day, row);
  }

  return {
    funnel,
    sources: [...sourceMap.values()].sort((a, b) => b.paid - a.paid || b.views - a.views),
    referrers: byReferrer.map((r) => ({ referrer: String(r.referrer), views: num(r.n) })),
    countries: byCountry.map((r) => ({ country: String(r.country).toUpperCase(), views: num(r.n) })),
    daily: [...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day)),
  };
}
