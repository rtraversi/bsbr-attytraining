# Session Summary — Max
**Date:** 2026-06-15
**Who:** Max (developer) + Claude (desktop app for guidance, Claude Code in terminal for execution)

---

## How We Work
- **Claude desktop app** = discuss, plan, explain, answer questions. Max learns here.
- **Claude Code in terminal** = actual file edits, commands, code generation.
- Max is new to coding. Explain things simply before doing them.

---

## What Was Accomplished

### Session 1 (2026-06-14/15)
All work is in repo: `https://github.com/rtraversi/bsbr-attytraining`
App folder is at the repo root (not in a subfolder).

**Completed:**
- ✅ Removed deprecated `@cloudflare/next-on-pages` adapter
- ✅ Installed `@opennextjs/cloudflare` (OpenNext adapter)
- ✅ Created `wrangler.jsonc` and `open-next.config.ts`
- ✅ Added `preview`, `deploy`, `cf-typegen` scripts to `package.json`
- ✅ Created `.env.local` and `.dev.vars` with Supabase staging keys
- ✅ Added `.open-next/` and `.wrangler/` to `.gitignore`
- ✅ Moved app files from `~/Desktop/Coding/aistaffcompliance` into repo root
- ✅ Database schema — `supabase/migrations/0001_initial_schema.sql` (8 tables, RLS on all, firm_id indexed)
- ✅ Supabase auth wiring — `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
- ✅ Fixed font issue — swapped `next/font/google` → `geist` package (workerd compatible)
- ✅ First deploy to Cloudflare Workers — live at `https://bsbr-attytraining.aistaffcompliance.workers.dev`
- ✅ Cert worker stub — deployed at `https://bsbr-cert-worker.aistaffcompliance.workers.dev`
- ✅ Supabase Database Webhook wired on `quiz_attempts` INSERT → cert worker
- ✅ Supabase service role key rotated after accidental exposure in git history
- ✅ Rob cleaned git history on his end; Max needs to sync (see Next Actions)
- ✅ Code pushed to GitHub

**Known issues:**
- Migration `0001_initial_schema.sql` is missing two tables: `training_events` and `cert_generation_queue`. Rob flagged this — needs a `0002` follow-up migration next session.
- Old exposed key exists in local git history but is rotated (harmless). Rob cleaned it on remote.

---

## Environment
- **Supabase:** Two projects — `aistaffcompliance STAGING` (dev) and prod. Use staging for all dev work.
- **Cloudflare:** App on Workers (not Pages). Uses OpenNext adapter.
- **Local dev:** `pnpm dev` → localhost:3000. `pnpm run preview` → localhost:8787 (Cloudflare simulation).
- **Deploy:** `pnpm run deploy`
- **Cert worker deploy:** `cd workers/cert-worker && wrangler deploy --config wrangler.toml`

---

## Next Actions (Step 9 from NEXT-10-STEPS.md)

**First thing next session — sync with Rob's cleaned repo:**
```bash
git remote set-url origin https://github.com/rtraversi/bsbr-attytraining.git
git fetch origin
git checkout main
git reset --hard origin/main
pnpm install
pnpm dev
```

**Then:**
1. Write migration `0002` adding `training_events` and `cert_generation_queue` tables
2. Run `supabase db push` to apply it
3. Complete Step 9 smoke check from `NEXT-10-STEPS.md`

---

## Key Files
- `.planning/NEXT-10-STEPS.md` — Max's task checklist
- `.planning/STATE.md` — overall project state
- `CLAUDE.md` — full project spec and stack decisions
- `workers/cert-worker/` — standalone cert generation Worker
- `supabase/migrations/` — database schema migrations
- `lib/supabase/` — Supabase client helpers
- `middleware.ts` — session refresh on every request
