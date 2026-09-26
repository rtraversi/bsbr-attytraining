"use client";

import { useEffect, useRef } from "react";
import { captureAttribution } from "@/lib/analytics/attribution";

// Records one first-party page view (see lib/analytics/events.ts) and refreshes
// the stored attribution. Mounted on the marketing pages whose views make up the
// top of the funnel.
//
// Sits alongside HitBeacon rather than replacing it: HitBeacon feeds the counter
// Katy already reads on the RMT portal, and retiring it is her call.
export function VisitBeacon() {
  // StrictMode runs effects twice in dev; one view per load.
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const attribution = captureAttribution();
    const body = JSON.stringify({ path: window.location.pathname, attribution });

    // sendBeacon survives an immediate click-away. A failed beacon must never be
    // visible to the visitor.
    try {
      if (navigator.sendBeacon?.("/api/track", body)) return;
    } catch {
      // fall through to fetch
    }
    fetch("/api/track", { method: "POST", body, keepalive: true }).catch(() => {});
  }, []);

  return null;
}
