// Browser-side half of the first-party funnel (see lib/analytics/events.ts).
//
// Remembers where a visitor came from so that, if they buy days later, the
// checkout can say so. Stored in localStorage — not a cookie, never sent to a
// server on its own, and it holds only campaign labels (utm_*, Katy's ?v=, the
// referring site's hostname). No identifier of the person.
//
// Last *meaningful* touch wins: a visit that arrives with a campaign tag or from
// another site replaces what is stored; a plain direct visit keeps it. So a
// buyer who clicked Katy's link on Monday and typed the URL on Thursday is still
// credited to Katy's link.

import type { Attribution } from "@/lib/analytics/events";

const STORAGE_KEY = "iurix_src";

/** What the current page URL and referrer say about this visit, if anything. */
function currentTouch(): Attribution {
  const params = new URLSearchParams(window.location.search);
  const touch: Attribution = {};
  const source = params.get("utm_source") ?? params.get("ref");
  if (source) touch.source = source;
  const medium = params.get("utm_medium");
  if (medium) touch.medium = medium;
  const campaign = params.get("utm_campaign");
  if (campaign) touch.campaign = campaign;
  const variant = params.get("v");
  if (variant) touch.variant = variant;

  try {
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (host && host !== window.location.hostname.replace(/^www\./, "")) {
        touch.referrer = host;
      }
    }
  } catch {
    // Malformed referrer — ignore.
  }
  return touch;
}

/**
 * Update the stored attribution from the current visit and return what applies
 * to it. Safe to call on every marketing page load.
 */
export function captureAttribution(): Attribution {
  const touch = currentTouch();
  const meaningful = Object.keys(touch).length > 0;
  try {
    if (meaningful) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(touch));
      return touch;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Attribution) : {};
  } catch {
    // Private window / blocked storage: attribute this visit only.
    return touch;
  }
}

/** The stored attribution, for sending along with a checkout. */
export function readAttribution(): Attribution {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Attribution) : {};
  } catch {
    return {};
  }
}
