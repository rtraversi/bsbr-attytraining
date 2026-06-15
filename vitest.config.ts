import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Supabase Auth sign-in + multiple insert round-trips in beforeAll can take
    // several seconds on a cold connection — extend the defaults.
    testTimeout: 15_000,
    hookTimeout: 45_000,
    // Run each test file in its own worker so auth state can't bleed between suites.
    isolate: true,
    // .env.local is loaded by the test scripts via `node --env-file=.env.local`
    // (package.json "test" / "test:watch" scripts) — no extra setup file needed.
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
