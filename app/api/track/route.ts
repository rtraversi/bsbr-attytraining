import { NextRequest } from "next/server";
import { parseAttribution, trackEvent } from "@/lib/analytics/events";

// Receives VisitBeacon's page views. Public and unauthenticated by nature — the
// worst anyone can do is inflate a view count, which grants nothing. Only the
// marketing paths below are recorded, so it cannot be used to write arbitrary
// rows into the dataset.
const TRACKED_PATHS = new Set(["/", "/pricing"]);

// Crawlers that run JavaScript still announce themselves here. Not exhaustive —
// the dashboard counts views, and a stray bot is noise, not harm.
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit/i;

export async function POST(req: NextRequest) {
  try {
    if (BOT_UA.test(req.headers.get("user-agent") ?? "")) {
      return new Response(null, { status: 204 });
    }
    // sendBeacon posts text/plain, so parse the text rather than req.json().
    const body = JSON.parse(await req.text()) as { path?: unknown; attribution?: unknown };
    const path = typeof body.path === "string" ? body.path : "";
    if (TRACKED_PATHS.has(path)) {
      trackEvent("page_view", {
        host: req.headers.get("host"),
        path,
        attribution: parseAttribution(body.attribution),
        country: req.headers.get("cf-ipcountry"),
      });
    }
  } catch {
    // Malformed beacon — drop it silently.
  }
  return new Response(null, { status: 204 });
}
