import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  oxc: {
    // Email template tests import TSX outside Next's compiler. Keep React's
    // automatic runtime explicit so those tests render the same way as app code.
    jsx: { runtime: 'automatic' },
  },
  test: {
    // 🔴 A GIT WORKTREE IS NOT PART OF THIS TEST RUN.
    //
    // .worktrees/<branch> holds a full checkout of another branch, tests and
    // all. Without this, `pnpm test` globs those too and reports a number that
    // is two branches added together — and a stale copy of a test this branch
    // has since corrected shows up as a failure in work that is actually fine.
    // That happened on 2026-09-02: 977 tests and 2 phantom failures, from a
    // parallel session's `em-dash-purge` worktree.
    // Every suite in this repo lives in tests/. Stating that explicitly is what
    // actually holds — an exclude alone still let the worktree's files in,
    // because the default include globs the whole tree.
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
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
