> **ARCHIVED 2026-08-27.** Executed. The redesign was merged and went live 2026-08-05.
> Historical record only. Do not cite it for current status: that lives in `.planning/STATE.md`.

---

# Merge guide — `main` → `redesign-iurix`

**Written:** 2026-08-05 (Rob + Claude) · **For:** Max
**12 conflicts.** Most are mechanical. Three are decisions, and Rob has already made two of them.

## Direction: merge `main` INTO `redesign-iurix`, not the reverse

```bash
git checkout redesign-iurix
git pull
git merge origin/main
```

`main` stays clean and deployable while the conflicts get worked out, and the CI preview you
review afterwards then contains *everything* — your 26 commits and the redesign — rather than
half of it. `redesign-iurix` → `main` happens later, after production is verified.

## Why this diverged so badly

Rob's branch carried 19 commits including the 07-28 avatar removal, which had never been pushed —
it sat uncommitted on his machine for a week. Meanwhile you built 26 commits on `main`. Neither
side could see the other. Nothing was done wrong; the work just needs reconciling now.

---

# 🔴 Decision 1 — avatars stay REMOVED (Rob, 2026-08-05)

**You and Rob did opposite things.** You secured staff photos (`6f441b5 put staff photos behind
signed URLs`, migration `0019_private_avatars.sql`). Rob deleted the feature outright on 07-28,
for a broader reason than the public bucket: *"this product should not hold profile photographs of
law firm staff at all."* Staff are enrolled by their employer rather than signing up, and the photo
served no function in the certification record.

**Rob has confirmed removal wins.** Your signed-URL work is superseded, not rejected — it was the
right fix for a feature that is now going away.

Resolution:

| File | Action |
|---|---|
| `app/api/account/avatar/route.ts` | **delete** (`git rm`) |
| `app/dashboard/settings/_components/avatar-upload.tsx` | **delete** (`git rm`) |
| `app/dashboard/layout.tsx` · `page.tsx` · `settings/page.tsx` | take **main's** version, then strip avatar rendering |
| `app/dashboard/_components/nav-pill.tsx` · `team-table.tsx` · `certification-forecast.tsx` | auto-merged; verify no `avatarUrl` survives |

Then check nothing references it:

```bash
grep -rn "avatarUrl\|avatar_url\|avatars" app/ lib/    # expect: no hits outside migrations
```

## ⚠️ Migration collision — second time this has happened

`0018` is taken on both sides:

- ours: `0018_remove_avatars.sql`
- yours: `0018_provisioning_identity.sql`, plus `0019`–`0022`

**Renumber ours to `0023_remove_avatars.sql`.**

**And it needs rewriting, not just renaming.** Its comment says the bucket was created public by
`0013` — no longer true, because your `0019_private_avatars.sql` made it private. The DROP still
works, but the stated rationale is now wrong, and `0019` will have run first in every environment.
It should read as "removing the feature, including the private bucket `0019` established."

Nothing in `0023` touches `training_events_event_type_check`, so your `0017` warning does not
apply here.

---

# 🟢 Take MAIN's version wholesale

### `app/api/webhooks/stripe/route.ts`

You and Rob independently made the **same fix** — the `OPERATOR_ALERT_EMAIL` fallback pointed at
the retired `info@aistaffcompliance.com`. Yours also supports multiple addresses, so it is a strict
superset. **Take main's.** Just confirm the fallback domain reads `iurixaccreditation.com`.

Same for `5d9cf70` (retiring the personal Gmail from customer surfaces) — Rob flagged that and
deliberately left it alone; you had already done it.

---

# 🟡 `app/pricing/_components/pricing-slider.tsx` — take main's LOGIC, re-apply the light palette

This one needs care, because the two changes are of completely different kinds:

- **Your change is functional and legally load-bearing**: the US-only checkbox, `billingCountry`
  in the checkout body, and surfacing the server's real error instead of "please try again."
  Katy's constraint. **All of it must survive.**
- **Rob's change is purely cosmetic**: dark palette → light marble/teal.

So: **keep every line of your logic**, then restyle. Specifically, your new checkbox is written for
the dark page:

```tsx
<label className="mt-8 flex ... text-sm text-white/60">
```

`text-white/60` on the new marble background is **invisible**. It needs `text-ink-soft`, and the
`accent-[var(--brand-emphasis)]` wants checking against the new palette. A legally-required
disclosure that cannot be read is worse than one that is merely ugly — please eyeball this one in
the browser rather than trusting the diff.

Palette mapping, for reference: `bg-black`→`bg-marble`, `text-white`→`text-ink`,
`text-white/60`→`text-ink-soft`, `text-white/40`→`text-ink-mute`, `border-white/10`→`border-silver`,
`athena-pill-solid`→`bg-teal-ink text-marble`.

---

# 🟡 `app/_components/legal-page.tsx` — add/add, you both built one

You refactored the legal pages onto the app's current system (`6805527`); Rob built a shared
long-form template for the new marketing brand. **Same idea, arrived at independently.**

Rob's is probably the one to keep, for one structural reason: the legal pages share the marketing
**footer**, so they inherit the marble/teal surface whether or not their body matches it. His
template also ships `LegalCallout`, `LegalDisclaimer` (for the all-caps conspicuousness blocks the
Terms need) and `LegalTable` (scrolls on mobile) ready for the real drafts.

But look at both before deciding — you have seen your version rendered and Rob never has.
`app/privacy/page.tsx`, `app/terms/page.tsx` and `app/dpa/page.tsx` then simply follow whichever
template wins. Note main has **four** legal pages (`/cookies`); the redesign branch only converted
three, so `/cookies` needs the same treatment either way.

---

# ⚪ `session_handoff.md`

Combine both — nothing is exclusive. Rob's side carries the deploy runbook pointer, the Windows
build failure, and the unverified-citations blocker; yours carries your 26 commits.

---

# After the merge

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm dev            # this works fine on Windows
```

Then walk `.planning/DEPLOY-RUNBOOK.md` from step 2. **Do not run
`opennextjs-cloudflare build` or `pnpm run deploy` on Windows** — it produces a Worker that 500s on
every route. CI handles it.

Specific things to re-check after merging, because they are where the two branches actually
collide in behaviour:

- [ ] `/pricing` — US-only checkbox **visible and readable** on the light background
- [ ] `/pricing` — slider, bands, total still work; the auto-renewal disclosure is intact
- [ ] `/dashboard` — no broken avatar references, term resolution still correct
- [ ] `/privacy`, `/terms`, `/dpa`, `/cookies` — one consistent template
- [ ] The marketing homepage still renders the new mark and wordmark
