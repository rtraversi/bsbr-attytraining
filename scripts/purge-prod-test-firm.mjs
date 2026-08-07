// scripts/purge-prod-test-firm.mjs
//
// Removes ONE firm and everything hanging off it, by explicit firm id.
//
// WHY THIS EXISTS (ix-prodseed)
//
// The Tier 1 end-to-end certificate proof cannot be done with a dashboard
// click. A firm only comes into existence through Stripe checkout into the
// provisioning webhook, so proving the PROD Database Webhooks are wired means
// making a real sandbox purchase against PROD, setting a password, sending an
// invite, passing the quiz, and getting a PDF into the private bucket. That
// writes real rows to the database that was deliberately kept clean.
//
// Decision, Max, 2026-08-07: those rows get PURGED after the proof, not kept
// and documented. Stale test data destroys the daily reconciliation report's
// credibility on the day of the first real sale — the same trap the 17 staging
// test firms represent, and the entire reason PROD was kept clean. See
// .planning/PROD-CUTOVER.md ("Staging keeps 17 test firms").
//
// DESTRUCTIVE AND IRREVERSIBLE. There is no undo and no soft delete. Run once,
// by hand, watched — never from a pipeline. Modelled on
// scripts/remove-avatars-bucket.mjs, with two extra guards that script does not
// need: an explicit target firm, and an explicit project ref that must agree
// with the environment actually loaded.
//
// Usage:
//   # dry run — prints what it WOULD delete, touches nothing
//   dotenv -e .env.prod -- node scripts/purge-prod-test-firm.mjs \
//     --project-ref ttqthtzdjacrhjtrcmmy --firm <firm-uuid>
//
//   # actually delete
//   dotenv -e .env.prod -- node scripts/purge-prod-test-firm.mjs \
//     --project-ref ttqthtzdjacrhjtrcmmy --firm <firm-uuid> --confirm
//
// ---------------------------------------------------------------------------
// DELETION ORDER — derived from the migrations, not from memory
//
// Everything below reads `references public.firms (id) on delete cascade`, so
// deleting the firm removes them all in one statement:
//
//   seats                 0001   firm_id → firms      CASCADE
//   firm_members          0001   firm_id → firms      CASCADE
//   enrollments           0001   firm_id → firms      CASCADE
//   quiz_attempts         0001   firm_id → firms      CASCADE
//   certificates          0001   firm_id → firms      CASCADE
//   training_events       0002   firm_id → firms      CASCADE
//   cert_generation_queue 0002   firm_id → firms      CASCADE
//   quiz_sessions         0024   firm_id → firms      CASCADE
//
// Two RESTRICT edges break that, and they are the whole reason the order below
// is not simply "delete the firm":
//
//   training_events.firm_member_id → firm_members(id)  ON DELETE RESTRICT (0002)
//     The firms cascade tries to remove firm_members, and this blocks it. So
//     training_events must be deleted FIRST, explicitly.
//
//   firms.owner_id → auth.users(id)                    ON DELETE RESTRICT (0001)
//     So the auth users go LAST, after the firm is gone.
//
// A third RESTRICT edge exists but is not in the path:
//
//   enrollments.course_id → courses(id)                ON DELETE RESTRICT (0001)
//     Only matters if you were deleting the COURSE. This script never does —
//     the course row is real seeded content, not test data.
//
// Giving the order as "training_events → firms → auth.users" is correct but
// hides why, which is how someone later "simplifies" it back into a failure.
//
// NOT handled by any cascade, and therefore done explicitly here:
//   • Certificate PDFs in the private `certificates` Storage bucket. Storage
//     objects have no FK to firms; deleting the rows orphans the files.
//
// NOT touched, deliberately — see the closing report the script prints:
//   • processed_stripe_events — event-id ledger. Removing an id would let a
//     replayed webhook re-provision the firm you just deleted.
//   • provisioning_failures  — only written when a firm was NOT provisioned.
//   • courses / quiz_questions — real content.
//   • The Stripe subscription itself. Cancel it in Stripe; this script has no
//     Stripe credentials and must not acquire any.
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

// --- Arguments -------------------------------------------------------------

function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}

const CONFIRM = process.argv.includes("--confirm");
const FIRM_ID = flag("firm");
const PROJECT_REF = flag("project-ref");

const USAGE = `
Usage:
  dotenv -e <env-file> -- node scripts/purge-prod-test-firm.mjs \\
    --project-ref <ref> --firm <firm-uuid> [--confirm]

  --project-ref  Supabase project ref this run is INTENDED for. Must match the
                 project the loaded environment actually points at. No default.
  --firm         The firm id to purge. No default, no discovery, no "latest".
  --confirm      Actually delete. Without it this is a dry run.
`;

function die(message) {
  console.error(`\n${message}`);
  console.error(USAGE);
  process.exit(1);
}

if (!PROJECT_REF) die("Missing --project-ref. It is required, and deliberately has no default.");
if (!FIRM_ID) die("Missing --firm. This script never discovers its own target.");

// A firm id is a uuid. Rejecting anything else early stops a typo'd or shell-
// mangled argument from becoming a `.eq('id', 'undefined')` that matches nothing
// and reports a cheerful success.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(FIRM_ID)) die(`--firm "${FIRM_ID}" is not a uuid.`);

// --- Environment -----------------------------------------------------------

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run this through dotenv, e.g.:");
  console.error("  dotenv -e .env.prod -- node scripts/purge-prod-test-firm.mjs ...");
  process.exit(1);
}

// The guard that matters. Which project this hits is decided entirely by which
// env file was loaded — exactly the property that makes remove-avatars-bucket
// dangerous. Requiring the operator to NAME the project, and refusing when the
// name disagrees with the loaded credentials, turns a silent wrong-database
// deletion into a refusal.
const host = new URL(url).host;
const envRef = host.split(".")[0];
if (envRef !== PROJECT_REF) {
  die(
    `Refusing to run.\n` +
      `  --project-ref says : ${PROJECT_REF}\n` +
      `  loaded env points  : ${envRef} (${host})\n` +
      `These must match. Check which env file you loaded.`
  );
}

console.log(`Target project : ${host}  (ref ${envRef})`);
console.log(`Target firm    : ${FIRM_ID}`);
console.log(CONFIRM ? "Mode           : LIVE — will delete\n" : "Mode           : dry run — nothing will be deleted\n");

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Tables carrying firm_id, in the order the report reads best. Deletion order
// is the block comment above; this list is for COUNTING.
const FIRM_SCOPED_TABLES = [
  "training_events",
  "cert_generation_queue",
  "certificates",
  "quiz_attempts",
  "quiz_sessions",
  "enrollments",
  "firm_members",
  "seats",
];

async function countFor(table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("firm_id", FIRM_ID);
  if (error) {
    // quiz_sessions only exists once migration 0024 is applied. A project
    // without it is a fact worth printing, not a crash.
    return { count: null, note: error.message };
  }
  return { count: count ?? 0, note: null };
}

async function main() {
  // 1. The firm must exist. Refusing on a missing firm is the difference
  //    between "already purged" and "you typed the wrong id".
  const { data: firm, error: firmErr } = await supabase
    .from("firms")
    .select("id, name, owner_id, status, stripe_customer_id, stripe_subscription_id, created_at")
    .eq("id", FIRM_ID)
    .maybeSingle();

  if (firmErr) throw firmErr;
  if (!firm) {
    console.log(`No firm with id ${FIRM_ID} on this project. Nothing to do.`);
    return;
  }

  console.log(`Firm           : "${firm.name}"  status=${firm.status}  created=${firm.created_at}`);
  console.log(`Stripe         : customer=${firm.stripe_customer_id ?? "—"} subscription=${firm.stripe_subscription_id ?? "—"}`);
  console.log("");

  // 2. Members and users. Collected before anything is deleted, because after
  //    the firm goes the membership rows go with it and the user ids become
  //    unrecoverable.
  const { data: members, error: memberErr } = await supabase
    .from("firm_members")
    .select("id, user_id, role, status")
    .eq("firm_id", FIRM_ID);
  if (memberErr) throw memberErr;

  const memberUserIds = (members ?? []).map((m) => m.user_id).filter(Boolean);
  const candidateUserIds = [...new Set([firm.owner_id, ...memberUserIds].filter(Boolean))];

  // A user who is also a member of ANOTHER firm must survive. On a clean PROD
  // this can only happen if the proof was run twice, but deleting a live
  // customer's login because they once helped test is not a recoverable
  // mistake.
  const usersToDelete = [];
  const usersKept = [];
  for (const userId of candidateUserIds) {
    const { count, error } = await supabase
      .from("firm_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("firm_id", FIRM_ID);
    if (error) throw error;
    if ((count ?? 0) > 0) usersKept.push({ userId, otherFirms: count });
    else usersToDelete.push(userId);
  }

  // 3. Certificate PDFs. No FK ties Storage to the database, so these have to
  //    be found through the path convention:
  //      firms/{firm_id}/employees/{user_id}/{enrollment_id}.pdf
  const storagePaths = [];
  for (const userId of candidateUserIds) {
    const prefix = `firms/${FIRM_ID}/employees/${userId}`;
    const { data: objects, error } = await supabase.storage
      .from("certificates")
      .list(prefix, { limit: 100 });
    if (error) {
      console.log(`  (storage) could not list ${prefix}: ${error.message}`);
      continue;
    }
    for (const o of objects ?? []) if (o.id) storagePaths.push(`${prefix}/${o.name}`);
  }

  // 4. The report. Printed in full BEFORE anything is deleted, whether or not
  //    --confirm was passed, so the dry run and the live run show the operator
  //    exactly the same numbers.
  console.log("Rows that will be deleted:");
  console.log("");
  let unknownTables = 0;
  for (const table of FIRM_SCOPED_TABLES) {
    const { count, note } = await countFor(table);
    if (note === null) {
      console.log(`  ${table.padEnd(24)} ${String(count).padStart(5)}`);
    } else {
      unknownTables++;
      console.log(`  ${table.padEnd(24)}     ?   (${note})`);
    }
  }
  console.log(`  ${"firms".padEnd(24)} ${String(1).padStart(5)}`);
  console.log(`  ${"auth.users".padEnd(24)} ${String(usersToDelete.length).padStart(5)}`);
  console.log(`  ${"storage objects".padEnd(24)} ${String(storagePaths.length).padStart(5)}`);
  console.log("");

  if (usersKept.length) {
    console.log("Users NOT deleted — they belong to another firm as well:");
    for (const u of usersKept) console.log(`  ${u.userId}  (${u.otherFirms} other membership(s))`);
    console.log("");
  }

  if (unknownTables) {
    console.log(
      `${unknownTables} table(s) could not be counted. Resolve that before running with --confirm —\n` +
        "an uncountable table is usually an unapplied migration, and its rows would be\n" +
        "deleted by the firms cascade without ever appearing in this report.\n"
    );
  }

  if (!CONFIRM) {
    console.log("Dry run only. Re-run with --confirm to actually delete.");
    return;
  }

  // 5. Delete, in the order the FKs dictate.

  // 5a. Storage first. If this fails the database rows still exist, so the
  //     operator can retry; the reverse leaves orphaned PDFs with no way left
  //     to find them.
  if (storagePaths.length) {
    const { error } = await supabase.storage.from("certificates").remove(storagePaths);
    if (error) throw error;
    console.log(`Deleted ${storagePaths.length} storage object(s).`);
  }

  // 5b. training_events — the RESTRICT edge onto firm_members.
  {
    const { error } = await supabase.from("training_events").delete().eq("firm_id", FIRM_ID);
    if (error) throw error;
    console.log("Deleted training_events.");
  }

  // 5c. The firm. Cascades to every table in FIRM_SCOPED_TABLES.
  {
    const { error } = await supabase.from("firms").delete().eq("id", FIRM_ID);
    if (error) throw error;
    console.log("Deleted firm (cascaded to seats, firm_members, enrollments, quiz_attempts, certificates, cert_generation_queue, quiz_sessions).");
  }

  // 5d. Auth users last — firms.owner_id was the RESTRICT holding them.
  for (const userId of usersToDelete) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw new Error(`deleteUser ${userId}: ${error.message}`);
    console.log(`Deleted auth user ${userId}.`);
  }

  console.log("\nDone.");
  console.log("");
  console.log("Still outstanding, deliberately NOT done by this script:");
  console.log("  • Cancel the Stripe subscription and delete the test customer in the Stripe dashboard.");
  console.log("  • processed_stripe_events still holds this checkout's event ids. Leave them — removing");
  console.log("    an id would let a replayed webhook re-provision the firm you just deleted.");
  console.log("  • Re-run the daily reconciliation and confirm it reports zero discrepancies.");
}

main().catch((err) => {
  console.error("\nFailed:", err.message || err);
  process.exit(1);
});
