// Run one Higgsfield API generation from a saved job file and download the result.
// Billable. Usage: pnpm higgsfield:gen scripts/higgsfield/jobs/<job>.json
// Job file: { "model": "<model id>", "input": { ...model inputs } }
// An input value of "file:<path>" is uploaded to Higgsfield first and replaced with its URL.
// Output lands in scripts/higgsfield/out/ (gitignored), named after the job file.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { config, higgsfield, HiggsfieldError, NotEnoughCreditsError } from "@higgsfield/client/v2";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
};

// Per docs.higgsfield.ai/docs/concepts/file-uploads: get a presigned URL, PUT the file
// with every returned upload header (the SDK's own helper drops x-amz-tagging and gets a
// 403), then hand public_url to the model. Credentials never go to the storage URL.
async function upload(file: string, credentials: string): Promise<string> {
  const contentType = CONTENT_TYPES[path.extname(file).toLowerCase()];
  if (!contentType) throw new Error(`Unsupported upload type: ${file}`);
  const res = await fetch("https://api.higgsfield.ai/files/generate-upload-url", {
    method: "POST",
    headers: { Authorization: `Key ${credentials}`, "Content-Type": "application/json" },
    body: JSON.stringify({ content_type: contentType }),
  });
  if (!res.ok) throw new Error(`Upload URL request failed: HTTP ${res.status}`);
  const { upload_url, public_url, upload_headers } = (await res.json()) as {
    upload_url: string;
    public_url: string;
    upload_headers?: Record<string, string>;
  };
  const put = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType, ...upload_headers },
    body: await readFile(file),
  });
  if (!put.ok) throw new Error(`Upload failed: HTTP ${put.status}`);
  return public_url;
}

const jobPath = process.argv[2];
if (!jobPath) {
  console.error("Usage: pnpm higgsfield:gen <job.json>");
  process.exit(1);
}
if (!process.env.HF_CREDENTIALS) {
  console.error("HF_CREDENTIALS is not set. Add it to .env.local as key-id:key-secret.");
  process.exit(1);
}

const job = JSON.parse(await readFile(jobPath, "utf8")) as { model: string; input: Record<string, unknown> };
config({ credentials: process.env.HF_CREDENTIALS });

try {
  for (const [key, value] of Object.entries(job.input)) {
    if (typeof value !== "string" || !value.startsWith("file:")) continue;
    const file = value.slice("file:".length);
    job.input[key] = await upload(file, process.env.HF_CREDENTIALS);
    console.log(`Uploaded ${file}`);
  }

  console.log(`Submitting ${job.model} (${path.basename(jobPath)})...`);
  const result = await higgsfield.subscribe(job.model, { input: job.input, withPolling: true });
  const status: string = result.status;
  const url = result.video?.url ?? result.images?.[0]?.url;

  if (status !== "completed" || !url) {
    const reason = status === "nsfw" ? "rejected by moderation" : status === "completed" ? "completed without an output URL" : `ended with status "${status}"`;
    console.error(`Request ${result.request_id} ${reason}. Nothing was produced.`);
    // Failed statuses carry an `error` string the SDK's V2Response type leaves out.
    const detail = (result as { error?: string }).error;
    if (detail) console.error(`Reason: ${detail}`);
    process.exit(1);
  }

  const outDir = path.join("scripts", "higgsfield", "out");
  await mkdir(outDir, { recursive: true });
  const ext = path.extname(new URL(url).pathname) || ".bin";
  const outFile = path.join(outDir, `${path.basename(jobPath, ".json")}-${Date.now()}${ext}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  await writeFile(outFile, Buffer.from(await res.arrayBuffer()));

  console.log(`Request ${result.request_id} completed.`);
  console.log(url);
  console.log(`Saved to ${outFile}`);
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
