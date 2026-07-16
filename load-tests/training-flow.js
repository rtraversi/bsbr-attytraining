// ─────────────────────────────────────────────────────────────────────────────
// DORMANT SKELETON — NOT wired to real endpoints, NOT for CI, NOT for pre-launch.
// Fill in TODOs before use. Target STAGING only, never production.
// ─────────────────────────────────────────────────────────────────────────────
//
// Run with:
//   k6 run -e BASE_URL=https://<staging-host> load-tests/training-flow.js
//
// See load-tests/README.md for context, review date, and safety notes.

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- wired up once the TODOs below are filled in
import http from 'k6/http'
import { sleep } from 'k6'

// TODO: set to STAGING url via env — never point this at production.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- wired up once the TODOs below are filled in
const BASE_URL = __ENV.BASE_URL || 'https://staging.example.invalid'

// Placeholder ramped VU profile — values are illustrative only.
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // ramp up to 10 VUs
    { duration: '3m', target: 10 }, // hold at 10 VUs
    { duration: '1m', target: 25 }, // ramp up to 25 VUs
    { duration: '3m', target: 25 }, // hold at 25 VUs
    { duration: '1m', target: 0 }, // ramp down
  ],
}

export default function trainingFlow() {
  // Step 1: login / obtain session
  // TODO: wire real auth — likely a Supabase session cookie obtained via a
  // dedicated test login endpoint or a pre-seeded staging credential set.
  // const loginRes = http.post(`${BASE_URL}/api/auth/login`, { ... })
  // const sessionCookie = loginRes.cookies['sb-access-token']

  sleep(1)

  // Step 2: read dashboard / progress
  // TODO: real endpoint — e.g. GET /dashboard or GET /api/training/progress
  // http.get(`${BASE_URL}/dashboard`, { headers: { Cookie: sessionCookie } })

  sleep(1)

  // Step 3: submit knowledge-check / quiz
  // TODO: real endpoint + payload — e.g. POST /api/quiz/attempt with a
  // representative answer set and identity attestation flag.
  // http.post(`${BASE_URL}/api/quiz/attempt`, JSON.stringify({ ... }), {
  //   headers: { Cookie: sessionCookie, 'Content-Type': 'application/json' },
  // })

  sleep(1)
}
