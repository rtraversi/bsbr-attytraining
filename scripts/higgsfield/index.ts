// Higgsfield API smoke test: one Seedance 2.5 text-to-video generation.
// Billable. Run with: pnpm higgsfield:example
// Needs HF_CREDENTIALS ("key-id:key-secret") in .env.local, loaded by node --env-file.
import { config, higgsfield, HiggsfieldError, NotEnoughCreditsError } from "@higgsfield/client/v2";

const MODEL = "bytedance/seedance-2.5/text-to-video";

if (!process.env.HF_CREDENTIALS) {
  console.error("HF_CREDENTIALS is not set. Add it to .env.local as key-id:key-secret.");
  process.exit(1);
}

config({ credentials: process.env.HF_CREDENTIALS });

try {
  const result = await higgsfield.subscribe(MODEL, {
    input: {
      prompt: "A cinematic scene at sunset",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "16:9",
    },
    withPolling: true,
  });

  // The SDK stops polling on completed / failed / nsfw. Anything other than a
  // completed request carrying a video URL is a failure, whatever the status says.
  const status: string = result.status;
  const url = result.video?.url;

  if (status === "completed" && url) {
    console.log(`Request ${result.request_id} completed.`);
    console.log(url);
  } else {
    const reason =
      status === "nsfw"
        ? "rejected by moderation"
        : status === "failed"
          ? "failed"
          : status === "canceled" || status === "cancelled"
            ? "was canceled"
            : status === "completed"
              ? "completed without a video URL"
              : `ended with status "${status}"`;
    console.error(`Request ${result.request_id} ${reason}. No video was produced.`);
    process.exit(1);
  }
} catch (err) {
  if (err instanceof NotEnoughCreditsError) {
    console.error("Not enough API balance for this request.");
  } else if (err instanceof HiggsfieldError) {
    console.error(`Higgsfield error (${err.name}): ${err.message}`);
  } else {
    console.error("Unexpected error:", err instanceof Error ? err.message : err);
  }
  process.exit(1);
}
