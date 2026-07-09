# Monitoring & Capacity-Alerting Roadmap

**Prepared:** 2026-07-09 | **For:** Rob (operator) — reference/roadmap, not prose.

Ahead of the 2026-07-20 launch, this doc lays out what to watch, why it matters, and what's
still open. Keep it tight and skimmable.

---

## 1. Primary crash-prevention signal — Supabase resource utilization

The thing most likely to cause an outage is Supabase (Postgres) running out of headroom
under real traffic — CPU, memory, or connection-pool percentage.

- **Alert threshold:** ~70% sustained utilization on any of CPU / memory / connection pool.
- **How:** Supabase Pro exposes a Prometheus-compatible metrics endpoint (service_role auth).
  Scrape it into the existing BetterStack (Telemetry) setup and configure a threshold alert
  at ~70%.
- **Remediation when it fires:** upgrade the Supabase compute add-on from the Supabase
  dashboard. This causes a brief restart — do during low-traffic hours if possible.
- **Correlating signal:** `/api/metrics` `activeSessions` (see §3). When utilization climbs,
  check `activeSessions` to understand WHY — it's the "who's actually using it right now"
  number that explains the utilization spike.

**ACTION ITEM:** Wire the Supabase Prometheus endpoint into BetterStack before launch.

---

## 2. Uptime — `/api/health`

- BetterStack's uptime monitor should point at `GET /api/health`.
- This is the deep health check (upgraded 2026-07-09): it does a real Supabase read and
  returns `200` (`status: 'ok'`) when healthy, `503` (`status: 'degraded'`) when the DB is
  unreachable or erroring. No raw error detail is exposed in the response body.
- Treat a sustained `503` as a P0 — the app is degraded for every user, not just one.

---

## 3. `/api/metrics` — operational note

- Requires `METRICS_SECRET` to be set as a Worker secret:
  ```bash
  wrangler secret put METRICS_SECRET
  ```
- **Fail-closed:** until `METRICS_SECRET` is set (or the caller doesn't send a matching
  `x-metrics-secret` header), the endpoint returns `401` and runs no query.
- **ACTION ITEM: set `METRICS_SECRET` before relying on this metric** — BetterStack (or any
  future consumer) needs the same value in its request header.
- Response: `{ timestamp, windowMinutes: 5, activeSessions }` — distinct `firm_member_id`
  count over the last 5 minutes of `training_events`. Response shape is meant to stay
  stable for downstream consumers (see §4).

---

## 4. iurisdesk.com central hub — DESIGN SPIKE

A future cross-brand aggregation dashboard that pulls `/api/metrics` (and equivalent
endpoints) from each of the operator's properties into one view.

**Status: DESIGN SPIKE.** Not scoped, not scheduled. This belongs in its own planning
session — do not fold it into a quick task or an unrelated phase.

---

## 5. GitHub bug/feature submission — BLOCKED

Mirror the pattern used on the operator's other sites (a lightweight in-app "report a
bug / request a feature" path that files a GitHub issue).

**Status: BLOCKED** pending an example site to replicate the pattern from.

---

## 6. k6 load test — dormant

A commented, staging-only k6 skeleton lives in `load-tests/` (`training-flow.js` +
`README.md`). It is not wired to real endpoints and not run in CI.

**Review ~2026-08-19** (about 30 days post-launch) — decide then whether to fill in the
TODOs and run a real capacity test against staging.
