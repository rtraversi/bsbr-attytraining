// Server-only: reads GSC_PRIVATE_KEY. Never import from a Client Component.
//
// Google Search Console, read through the Search Analytics API with a service
// account. Setup (one-time, by whoever owns the Search Console property):
//   1. Google Cloud project → enable "Google Search Console API".
//   2. Create a service account, download a JSON key.
//   3. Search Console → Settings → Users and permissions → add the service
//      account's email with "Restricted" permission (read-only is enough).
//   4. Worker secrets: GSC_CLIENT_EMAIL = the key's client_email,
//      GSC_PRIVATE_KEY = the key's private_key (the whole PEM, \n escapes fine).
//
// Search Console data lags two to three days, so the most recent days of any
// range are always light or empty. That is Google, not a bug.

const PROPERTY = process.env.GSC_PROPERTY ?? "sc-domain:iurixaccreditation.com";

export class SearchConsoleNotConfigured extends Error {}

function b64url(data: ArrayBuffer | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function accessToken(): Promise<string> {
  const email = process.env.GSC_CLIENT_EMAIL;
  const pem = process.env.GSC_PRIVATE_KEY;
  if (!email || !pem) throw new SearchConsoleNotConfigured("GSC_CLIENT_EMAIL or GSC_PRIVATE_KEY is not set");

  // Secrets pasted from the JSON key often keep their literal "\n" escapes.
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${b64url(sig)}`,
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string; error?: string };
  if (!json.access_token) throw new Error(`Google token: ${json.error_description ?? json.error ?? res.status}`);
  return json.access_token;
}

type ApiRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };

export type SearchRow = { key: string; clicks: number; impressions: number; ctr: number; position: number };

export type SearchReport = {
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  queries: SearchRow[];
  pages: SearchRow[];
  daily: SearchRow[];
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export async function searchReport(days: number): Promise<SearchReport> {
  const token = await accessToken();
  const end = new Date();
  const start = new Date(end.getTime() - (days - 1) * 86_400_000);

  const query = async (dimensions: string[], rowLimit = 25): Promise<ApiRow[]> => {
    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: ymd(start), endDate: ymd(end), dimensions, rowLimit }),
        cache: "no-store",
      },
    );
    const text = await res.text();
    if (!res.ok) throw new Error(`Search Console ${res.status}: ${text.slice(0, 300)}`);
    return (JSON.parse(text) as { rows?: ApiRow[] }).rows ?? [];
  };

  const toRow = (r: ApiRow): SearchRow => ({
    key: r.keys?.[0] ?? "",
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  });

  const [totals, queries, pages, daily] = await Promise.all([
    query([], 1),
    query(["query"]),
    query(["page"]),
    query(["date"], days),
  ]);

  const t = totals[0];
  return {
    totals: t
      ? { clicks: t.clicks, impressions: t.impressions, ctr: t.ctr, position: t.position }
      : { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    queries: queries.map(toRow),
    pages: pages.map((r) => {
      const row = toRow(r);
      return { ...row, key: row.key.replace(/^https?:\/\/[^/]+/, "") || "/" };
    }),
    daily: daily.map(toRow).sort((a, b) => (a.key < b.key ? 1 : -1)),
  };
}
