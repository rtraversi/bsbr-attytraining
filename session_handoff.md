# Session Handoff

**Date:** 2026-08-27
**Who:** Max, with terminal-Claude

> ✅ **The deploy claim that was wrong in this file for three days is now correct.**
> All of 2026-08-24 — the framing correction, Terms, Privacy — **has been live since 2026-08-24
> 19:34:58Z**, deployed from `2efec949` with the workflow's own production smoke test passing.
> `/dpa` 404s in production **by design** (`app/dpa/page.tsx` calls `notFound()` there).
>
> 🔴 **Deploy status is only ever answered by the workflow list**, never by commits or timestamps:
> ```bash
> gh run list --workflow=deploy.yml --limit 15 \
>   --json event,conclusion,createdAt,headSha,displayTitle
> ```
> A `push` run is a **preview**. Only an `event: workflow_dispatch` run whose "Deploy to production"
> step succeeded actually shipped. See `.planning/STATE.md` §1.

---

## What happened today

**Three things: the setup notices became chips in the nav pill, the two UI batches finally merged,
and the attorney seat/certificate defect was fixed.**

```
main
 └── policy-intake   263cf80  setup notices become chips in the nav pill
                     b43324d  merge: ui-polish-batch-b into policy-intake
                     05e2d74  separate navigation and setup chip colours
                     93a92eb  open course access and gate certificates
                     6285e15  classify attorneys without consuming seats
```

**All five pushed.** `policy-intake` is in sync with `origin`. `tsc` 0, `eslint` 0 errors (4
pre-existing `no-img-element` warnings), `next build` clean, **195 tests across 15 files** (was 192
across 14).

**`ui-polish-batch-a` and `-b` are now merged** and can be deleted.

---

## Read these three first

**1. The nav bar has a colour rule now: blue is where you can go, amber is what you owe.** Nav pills
are blue-family; both setup chips are amber-family, so status stops competing with navigation.

🔴 **Two light-mode pairings knowingly fail WCAG AA.** Max's call, made with the numbers in front of
him, recorded in a red-flagged comment above `pillActive` so nobody quietly "fixes" it:

| Pairing | Ratio | needs 4.5:1 |
|---|---|---|
| White on `#0094FF` — active / Dashboard pill | 3.14:1 | ✗ |
| `#0094FF` on `#EAF6FF` — Training / Support / Settings | 2.86:1 | ✗ |

**Do not resolve this by moving the brand token.** `#0094FF` is `--brand-emphasis` and the palette
does not move without Max saying so. The compliant near-miss keeps the look exactly and changes only
this pill's ground: white on `#0077CC` = 4.66:1, `#0068B3` on `#EAF6FF` = 5.27:1.

Fixed on the way: the amber chip text (`#96700F` was 4.04:1 → `#7A5C0C` at 5.55:1) and dark-mode
idle labels (4.45:1 → 5.64:1).

**2. `hasTrainingAccess` no longer exists.** Katy, 2026-08-27 06:56: *"the training program itself
shouldn't be gated it's just the certificate really."* Training is open to everyone; `is_attorney` is
now read before the `cert_generation_queue` insert in **both** `api/certs/generate` and
`api/certs/drain`, so an attorney who passes the quiz gets no certificate. `canSelfEnroll`,
`no-seat-notice.tsx`, `enroll-self-button.tsx` and `api/firm/enroll-self` are **deleted** — they
existed only because access was seat-gated. `occupies_seat` is billing only; the surviving predicate
is `isCertifiableMember` in `lib/seats.ts`.

**3. The chips render on EVERY `/dashboard` route, not just the admin home** — the pill lives in
`app/dashboard/layout.tsx`. Deliberate: the intake chip is the only thing that ever gets the intake
completed, so following the admin around is the point. Costs three indexed queries per route for
admins; the GoTrue lookup runs only for already-flagged members, which is normally zero.

---

## Status

| Thing | State |
|---|---|
| `policy-intake` | 5 commits today, pushed, in sync |
| `ui-polish-batch-a` / `-b` | **merged** — safe to delete |
| Tests / `tsc` / `eslint` / `next build` | all clean |
| Deployed? | ❌ **No `workflow_dispatch` since 2026-08-24** |
| Nav pill + `/intake` in a browser | ❌ **never seen** |
| 0028 + 0029 on PROD | ❌ staging only |
| `Intake-uploads` bucket on PROD | ❌ does not exist |
| Rise 360 content | still not authored |

---

## Next steps

1. 🔴 **`0028` and `0029` onto PROD, and create `Intake-uploads` there.** Still the real blocker: the
   code reaches production through CI, the database it lands on does not. Capital I, case-sensitive,
   unrenameable, and no migration can create it. **Relink the CLI to staging in the same session.**
2. **Merge `policy-intake` to `main`, then run a production `workflow_dispatch`.** Pushing to `main`
   builds a preview only.
3. **Open the nav pill and `/intake` in a browser.** Neither has ever rendered anywhere.
4. **Decide the two AA failures with Rob** now that the look exists to judge.
5. **`.planning/STATE.md` §3 and §5 are stale as of today** — they list `policy-intake` at +6, the UI
   batches as unmerged, and the attorney defect as open. It lives on `main`; fix it there when this
   merges rather than forking it here.

---

## Open questions

1. **Nothing sends invites from the roster.** Promote creates `firm_members` rows as `invited` and
   deliberately sends nothing. The dashboard action is unbuilt.
2. **The purge does not exist.** 0028 has the columns and the backstop index; the route, the audit
   row and the 30-day cron do not. Katy's `.docx` export is unbuilt.
3. **The admin's own address cannot self-clear** from the deliverability chip. While Resend 403s
   (`ix-dnszoho`), an operator hands them a link with `scripts/dev-auth.mjs verify-link`.
4. **Removing the chips' ring removed the only non-chromatic cue** separating a chip from a nav
   pill — the two grounds sit at 1.02:1, so it is hue alone now. Fine in normal vision, weak under a
   red-green deficiency. If revisited, the lever is a **shape** difference, not a darker amber.
   `CHIP_QUIET` in `setup-notices.tsx` is a border-free quieter variant, one line to switch.
5. **Katy still owes:** `lib/intake/questions.ts` (guessed K/K/L module letters, invented section
   grouping), the 50-question bank review, and Privacy §2/§5, which have no category covering intake
   answers.

**Full detail:** `.planning/sessions/20260827-max-summary.md`.
