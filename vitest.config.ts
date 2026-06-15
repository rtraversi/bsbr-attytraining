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
    // Vitest loads .env.local automatically (same resolution order as Vite).
    // No explicit envFile needed; NEXT_PUBLIC_* vars are available as-is in process.env.
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
})
