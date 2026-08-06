// scripts/remove-avatars-bucket.mjs
//
// The removal half of 0023_remove_avatars.sql, moved out of SQL because
// Supabase's storage.protect_delete() trigger blocks `delete from
// storage.objects` / `delete from storage.buckets` outright. This does the
// same operation through the Storage API instead, which is the door
// Supabase actually wants it to go through.
//
// DESTRUCTIVE AND IRREVERSIBLE. Run once per environment, by hand, watched —
// not part of any automated pipeline. Requires SUPABASE_SERVICE_ROLE_KEY,
// which only exists in .env.local (staging today) or wherever PROD's is kept
// — so which environment this hits is entirely about which env file you load.
//
// Usage:
//   dotenv -e .env.local -- node scripts/remove-avatars-bucket.mjs           # dry run
//   dotenv -e .env.local -- node scripts/remove-avatars-bucket.mjs --yes     # actually deletes

import { createClient } from "@supabase/supabase-js";

const BUCKET = "avatars";
const YES = process.argv.includes("--yes");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run this through dotenv, e.g.:");
  console.error("  dotenv -e .env.local -- node scripts/remove-avatars-bucket.mjs");
  process.exit(1);
}

const host = new URL(url).host;
console.log(`Target project: ${host}`);
console.log(YES ? "Mode: LIVE — will delete\n" : "Mode: dry run — nothing will be deleted\n");

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  // 0. Check bucket existence via listBuckets(), not by sniffing errors from
  //    .from(BUCKET).list(). Confirmed against a real run 2026-08-06: list()
  //    on a bucket that does not exist returns an EMPTY array with NO error in
  //    this supabase-js version, not the "not found" error this used to check
  //    for. That made a removed bucket print "Found 0 object(s)" — indistinguishable
  //    from "bucket exists and is already empty" — instead of saying plainly that
  //    there was nothing to do. This is exactly the failure mode PROD will hit,
  //    since PROD never had this bucket in the first place.
  const { data: buckets, error: listBucketsErr } = await supabase.storage.listBuckets();
  if (listBucketsErr) throw listBucketsErr;
  if (!buckets.some((b) => b.id === BUCKET)) {
    console.log(`Bucket "${BUCKET}" does not exist — already removed. Nothing to do.`);
    return;
  }

  // 1. List every object in the bucket, paginated. list() defaults to 100 rows.
  const paths = [];
  let offset = 0;
  const PAGE = 100;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(undefined, { limit: PAGE, offset });
    if (error) throw error;
    if (!data.length) break;
    // list() can return folder placeholders (no id) alongside real objects; only real
    // objects need removal, and folders disappear on their own once empty.
    for (const entry of data) if (entry.id) paths.push(entry.name);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  console.log(`Found ${paths.length} object(s) in "${BUCKET}".`);

  if (!YES) {
    console.log("\nDry run only. Re-run with --yes to actually delete objects and the bucket.");
    return;
  }

  // 2. Delete objects first — storage.buckets has a foreign key from
  //    storage.objects, so the bucket can't be dropped while it still holds files.
  if (paths.length) {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths);
    if (rmErr) throw rmErr;
    console.log(`Deleted ${paths.length} object(s).`);
  }

  // 3. Drop the bucket itself.
  const { error: delErr } = await supabase.storage.deleteBucket(BUCKET);
  if (delErr) throw delErr;
  console.log(`Deleted bucket "${BUCKET}".`);
  console.log("\nDone. See 0023_remove_avatars.sql for why this isn't a migration.");
}

main().catch((err) => {
  console.error("\nFailed:", err.message || err);
  process.exit(1);
});
