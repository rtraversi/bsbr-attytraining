# 2026-10-29 (evening) — Rob (terminal-Claude) — Higgsfield API set up; spinning hero seal LIVE

## What was done

**Higgsfield runs through the API, not the CLI.** Rob put **$115** on the **Higgsfield API**
(open.higgsfield.ai, a developer platform billed in dollars). That balance is separate from the
consumer account the `higgsfield` CLI signs into (rob@builtsmartbyrob.com, free plan, 10 credits),
and the CLI cannot use API keys. So generation goes through the official TypeScript SDK.
- `@higgsfield/client` 0.2.6, installed as a **devDependency** so it stays out of the Worker.
- Credentials: `HF_CREDENTIALS=key-id:key-secret` in `.env.local` (gitignored, never printed or
  committed). Each person needs their own key from open.higgsfield.ai → API keys.
- `pnpm higgsfield:example`: Seedance 2.5 text-to-video smoke test (`scripts/higgsfield/index.ts`).
  It ran successfully and returned a video URL.
- `pnpm higgsfield:gen <job.json>`: runs a saved job file (`scripts/higgsfield/jobs/*.json`:
  `{ model, input }`), downloads the result to `scripts/higgsfield/out/` (gitignored), and uploads
  any `"file:<path>"` input first.
  ⚠️ The SDK's own `uploadImage` gets a **403**: it drops the `x-amz-tagging` header the presigned
  URL requires. `generate.ts` does the documented upload flow itself with `fetch`
  (docs.higgsfield.ai/docs/concepts/file-uploads).
- Failed requests carry an `error` string that the SDK's types omit. `generate.ts` prints it.
- The companion skills (`higgsfield-ai/skills`) are installed project-scope in
  `.agents/skills` + `.claude/skills` (both gitignored). They target the CLI, so they help with
  prompting but don't run API jobs.

**Launch discount claimed (7 days, until ~2026-11-05).** Each model has its own fixed maximum;
everyone gets 15% off everything. The picker allowed 1 image + 2 video models. Picked: **Seedance
2.5 (30%)**, **Kling 3.0 (50%)**, **Marketing Studio Image (15%, the only selectable image
model)**. Cinema Studio 4.0 isn't eligible. Seedance 2.5 list price: $0.2056/s at 480p, $0.4622/s
at 720p, $1.1372/s at 1080p.

**Spinning hero seal, LIVE** (commit `8be1066`, production run `40966563930`, smoke test
passed, verified in a browser on iurixaccreditation.com).
- A 6s video, played once on load: a fast coin spin (done by 2s), a sparkle burst along the
  crescents, then the "I" lights teal-white and holds on the last frame.
- Rendered with Seedance 2.5 **image-to-video** at 720p, standard bitrate (375 KB), from a 16:9
  start frame of the mark on the hero teal (`scripts/higgsfield/assets/seal-start.png`). Job:
  `scripts/higgsfield/jobs/seal-spin-final.json`.
- `app/_components/motion/hero-seal-video.tsx`: the still `<img>` stays as the SSR paint and the
  fallback for reduced motion or blocked autoplay. The video fades in only once it's playing.
  It's drawn at 1280/360 of the seal width and overflows the seal box on purpose, because
  `#hero-seal`'s own box is the page ribbon's anchor and must not change size.
- `.hero-seal-video` in `globals.css`: a radial mask fades the mp4's rectangle (it has no alpha)
  into the brushed metal.

**Spend: about $4.76 of $115.** The smoke test was $1.96 (billing page). The 480p spin test was
about $0.86 and the 720p final about $1.94. One 720p attempt came back `failed` and was retried;
it's assumed not billed, so confirm on Billing. Rob wants a spend update at every $25 crossed.

## Status

- Production: the seal spin is live. Max's `4644641` (sign-in page palette) was rebased under
  this commit cleanly.
- Working tree: `supabase/grants/` is still untracked. It predates this session and was left alone.

## Next steps

1. **More Higgsfield, inside the discount window (~2026-11-05).** Queued: the "paste"
   training-scenario clip (`scripts/higgsfield/jobs/scene-paste-test.json`, 8s 480p, about $1.15).
   A paralegal is about to paste client email into a public chatbot, stops, checks the firm
   policy, and closes it. Plan: test at 480p, final at 720p. Build any on-screen "policy check"
   card in code over the video, not baked into it.
2. **Next.js 16 upgrade**: still the priority from the earlier session today
   (`20261029-rob-summary.md`).

## Open questions

- Was the failed 720p request billed? Check open.higgsfield.ai/billing.
- Does Max want his own Higgsfield API key, or should generation stay on Rob's machine?
