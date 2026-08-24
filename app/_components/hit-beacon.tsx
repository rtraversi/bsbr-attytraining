"use client";

import { useEffect, useRef } from "react";

// Counts landing-page opens per link variant for Katy's A/B: she circulates
// https://iurixaccreditation.com/?v=1 and /?v=2 and wants to know which one
// people actually open.
//
// WHY THIS AND NOT CLOUDFLARE WEB ANALYTICS
//
// CF Web Analytics groups pageviews by request PATH and discards the query
// string — and the query string is the ONLY thing telling the two variants
// apart. Both would land on "/" as one undifferentiated number. So the count
// goes to the counter that already backs the RMT portal tiles.
//
// The endpoint is the RMT Netlify function, cross-origin from here; it answers
// CORS with Access-Control-Allow-Origin: * and takes an unauthenticated POST.
// That means anyone who finds the URL can inflate these numbers. Acceptable:
// it is a marketing tally on a public landing page, it grants nothing, and the
// server allowlists the metric names so nothing else can be written.
const ENDPOINT = "https://rmtnetworks.com/.netlify/functions/track-hit";

// Only these two are counted. An unknown ?v= value is ignored rather than
// guessed at — the server allowlist would reject it anyway, and silently
// folding it into v1 or v2 would corrupt the comparison Katy is reading.
const METRIC_BY_VARIANT: Record<string, string> = {
  "1": "iurix_v1_hits",
  "2": "iurix_v2_hits",
};

export function HitBeacon() {
  // React StrictMode runs effects twice in dev. Without this guard every local
  // page load would post two hits.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    // Read the query string off window rather than useSearchParams(): this page
    // is statically rendered, and useSearchParams() would force it into a
    // Suspense boundary (or opt the whole route into dynamic rendering) purely
    // to read one marketing parameter.
    const variant = new URLSearchParams(window.location.search).get("v");
    const metric = variant ? METRIC_BY_VARIANT[variant] : undefined;
    if (!metric) return;

    // Dev and preview deploys share this code. Counting them would mix our own
    // page loads into the number Katy is using to pick a landing page.
    if (window.location.hostname !== "iurixaccreditation.com") return;

    // Fire and forget. keepalive so the request survives the click-through if
    // someone lands and immediately navigates. A failed beacon must never be
    // visible to the visitor, hence the empty catch.
    fetch(`${ENDPOINT}?metric=${metric}`, {
      method: "POST",
      mode: "cors",
      keepalive: true,
    }).catch(() => {});
  }, []);

  return null;
}
