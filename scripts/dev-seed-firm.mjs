// scripts/dev-seed-firm.mjs
//
// Create a complete fake firm on STAGING, without Stripe and without email.
//
// WHY THIS EXISTS
//
// Getting a firm into the database today means a real sandbox Stripe checkout:
// open the pricing page, accept the terms, pay with a test card, wait for the
// webhook, then set a password through a magic link that Resend has been
// refusing to send for a week (ix-dnszoho). That is a five-minute round trip to
// look at a dashboard, and it is the reason so much of the intake has been
// verified against tests and a mockup rather than against a running firm.
//
// This does the same provisioning directly and hands back a sign-in link.
//
// 🔴 WHY A SCRIPT AND NOT A DEV-MODE ROUTE
//
// Because a route ships. A `devLink` in the invite routes was flagged for
// removal on 2026-06-18 and shipped anyway, and stayed in production for two
// months handing out working magic links in an API response. A script cannot
// leak, because it is not deployed. This one is strictly worse to ship than
// that one was — it mints firms and users — so the same rule applies harder.
//
// 🔴 REFUSES TO RUN AGAINST PRODUCTION
//
// This creates auth users and firms. Pointed at PROD it writes fake customers
// into the database the reconciliation job and every revenue number read. The
// project ref is checked against the URL actually loaded, hard-coded below, and
// anything that is not staging exits non-zero before a single call is made. Do
// not add a --force. Do not add a --project-ref override: the whole point is
// that it cannot be aimed.
//
// Usage (reads .env.local for NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
//
//   dotenv -e .env.local -- node scripts/dev-seed-firm.mjs <firm-name> <admin-email> \
//     [--seats N] [--staff N] [--attorneys N]
//
// ─── What this mirrors ──────────────────────────────────────────────────────
//
// The firm, the seats row and the admin member are copied from
// handleCheckoutCompleted → provisionFirm in app/api/webhooks/stripe/route.ts,
// read rather than remembered, so a seeded firm and a bought firm are the same
// shape:
//
//   firms         name · owner_id · tier from deriveTier(seats) · max_seats ·
//                 status 'active'
//   seats         max_seats, used_seats 0 — the trigger takes it from there
//   auth user     createUser({ email, email_confirm: true }), no password
//   app_metadata  { firm_id, role: 'admin' }
//   firm_members  role 'admin', status 'invited', occupies_seat FALSE
//
// Two of those look wrong and are not. `status: 'invited'` is what the webhook
// writes; /api/onboarding/complete is what flips it to 'active'. And the admin
// does NOT occupy a seat, because at this point they have not said whether they
// are taking the training — defaulting it to true would spend a paid seat the
// firm never agreed to.
//
// Staff and attorneys are copied from lib/intake/promote.ts rather than from
// /api/invite, on one point: promote writes user_metadata.full_name and the
// invite route silently discards it (the batch-4 gap recorded in
// intake-spec.md under "The roster wins on names"). Seeded people are fixtures
// whose whole job is to be legible in the team table, so they get names.
// Everything else — role 'employee', status 'invited', is_attorney, and
// occupies_seat as its inverse — matches both paths.
//
// ─── What this deliberately does NOT replicate ──────────────────────────────
//
// 1. NO INTAKE SESSION. This is the point of the script, not an oversight. A
//    seeded firm has never touched the intake, so IntakeIntro renders and every
//    question is blank; getOrCreateOpenSession creates the row on first visit,
//    which is also the code path worth exercising. Writing one here would seed
//    the firm straight past the thing you seeded it to look at.
//
// 2. NO STRIPE OBJECTS. stripe_customer_id and stripe_subscription_id are left
//    NULL — both columns are nullable, and Postgres allows many nulls under a
//    unique index. Writing a plausible-looking `cus_seed_…` would be worse: it
//    is a fake identifier in the column every billing path keys on. Two
//    consequences to know about:
//      · /api/onboarding/status finds a firm BY stripe_customer_id, so a seeded
//        admin cannot use the /onboarding page at all. They sign in with the
//        link printed below instead.
//      · The cert-worker's daily reconciliation matches firms against live
//        Stripe subscriptions. On staging that job is inert — [env.staging] in
//        workers/cert-worker/wrangler.toml has SUPABASE_URL = "", and a sandbox
//        key leaves `subs` empty, which suppresses directions 2 and 3 — so a
//        firm with no subscription raises nothing. On PROD it would raise a real
//        "access without payment" alert, which is one more reason this refuses
//        to run there.
//
// 3. NO current_period_end. Nothing renews. The 09:00 expiry and renewal crons
//    read that column and will skip a seeded firm, which is correct: there is no
//    subscription behind it to expire.
//
// 4. NO TERMS ACCEPTANCE. The webhook stamps terms_accepted_at and terms_version
//    from metadata that app/api/checkout put on the session BEFORE payment
//    (ix-termsaccept, 0027) — it is the buyer's own act. Nobody accepted
//    anything here, so both stay null. firms_terms_pair_ck pairs them, so this
//    is also the only valid way to leave them. Writing a timestamp would put a
//    false record of consent in the database, which is the one field in this
//    table worth being pedantic about.
//
// 5. NO processed_stripe_events ROW. No event happened, so there is no
//    idempotency ledger entry to write.
//
// 6. NONE OF THE COLLISION MACHINERY. resolveBuyer, provisioning_failures, the
//    duplicate / email_in_use / returning branches and the non-US billing
//    refusal all exist to answer "who is this buyer". A seed is always the
//    plain provision path; if the admin address is already taken this stops
//    rather than guessing, which is the same answer with none of the ambiguity.
//
// 7. NO EMAIL, and no course, enrollment, quiz attempt or certificate. The
//    `courses` row is global and already on staging; the rest is what the
//    employee flow creates, and seeding it would fake progress nobody made.
//
// ─── One thing that surprises people ────────────────────────────────────────
//
// SEEDED STAFF DO NOT APPEAR IN THE INTAKE ROSTER. The roster is an intake
// ANSWER, not a read of firm_members: it opens with one row, the admin,
// pre-filled from their own account. That is the app's own behaviour and not
// something the seed breaks — a firm that invites people and then does the
// intake sees exactly the same thing, and lib/intake/promote.ts reconciles the
// two at submit by matching on the resolved auth user id, updating an existing
// member in place rather than duplicating them.
//
// So --staff and --attorneys populate the DASHBOARD (the team table, the seat
// count, the deliverability chip). If what you want is a populated roster, type
// it into the intake; the members will match up on submit.
//
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

// ─── The guard ──────────────────────────────────────────────────────────────

/** Staging. The ONLY project this script will talk to. */
const ALLOWED_PROJECT_REF = "ndmzvtuywcufvkxtkjhg";
/** Named only so the refusal message can be specific about what it just stopped. */
const PROD_PROJECT_REF = "ttqthtzdjacrhjtrcmmy";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function die(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  die(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Run through dotenv:  dotenv -e .env.local -- node scripts/dev-seed-firm.mjs …",
  );
}

// The ref is the first label of the Supabase hostname:
//   https://ndmzvtuywcufvkxtkjhg.supabase.co  →  ndmzvtuywcufvkxtkjhg
//
// Parsed from the URL rather than taken as an argument on purpose. An argument
// states an INTENTION; this reads what the environment will actually connect to,
// which is the thing that can be wrong.
const projectRef = (() => {
  try {
    return new URL(SUPABASE_URL).hostname.split(".")[0];
  } catch {
    return null;
  }
})();

if (projectRef !== ALLOWED_PROJECT_REF) {
  die(
    `REFUSING TO RUN.\n\n` +
      `  This script creates auth users and firms. It runs against staging only.\n\n` +
      `  Loaded URL:  ${SUPABASE_URL}\n` +
      `  Project ref: ${projectRef ?? "(unparseable)"}\n` +
      `  Allowed:     ${ALLOWED_PROJECT_REF} (staging)\n` +
      (projectRef === PROD_PROJECT_REF
        ? `\n  🔴 That is PRODUCTION. Nothing was done. Check which env file you loaded.\n`
        : `\n  Nothing was done. Check which env file you loaded.\n`),
  );
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Arguments ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);

function flag(name) {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : null;
}

const positional = argv.filter((arg, i) => {
  if (arg.startsWith("--")) return false;
  return !(i > 0 && argv[i - 1].startsWith("--"));
});

const USAGE = `
  dev-seed-firm — staging only (${ALLOWED_PROJECT_REF})

    dev-seed-firm <firm-name> <admin-email> [--seats N] [--staff N] [--attorneys N]

  --seats N       Seats purchased. Default 5 — enough room to add people in the
                  intake roster without hitting the cap on the first click.
  --staff N       Non-attorney members. Each occupies a seat. Default 0.
  --attorneys N   Attorney members. Occupy no seat, get no certificate. Default 0.

  Staff and attorneys are given generated @example.com addresses, which RFC 2606
  reserves and nothing can deliver to.

  Example:
    dotenv -e .env.local -- node scripts/dev-seed-firm.mjs \\
      "Byron LLP" ada@example.com --seats 9 --staff 3 --attorneys 2
`;

const [firmName, adminEmail] = positional;
if (!firmName || !adminEmail) die(`Needs a firm name and an admin email.\n${USAGE}`);

function count(name, fallback) {
  const raw = flag(name);
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) die(`--${name} must be a whole number, got "${raw}".`);
  return n;
}

const seats = count("seats", 5);
const staffCount = count("staff", 0);
const attorneyCount = count("attorneys", 0);

// firms.max_seats and seats.max_seats both carry `check (max_seats > 0)`.
if (seats < 1) die("--seats must be at least 1 (both max_seats columns check > 0).");

// Refused rather than warned. Only non-attorneys consume a seat, so this is the
// one arithmetic the app itself enforces — POST /api/intake/submit caps the
// roster at the seats purchased. A seeded firm already over its cap is a shape
// no bought firm can reach through the product, which defeats the point of
// mirroring the webhook at all.
if (staffCount > seats) {
  die(
    `--staff ${staffCount} exceeds --seats ${seats}.\n\n` +
      `  Only non-attorney staff consume a seat, so this firm would be over its\n` +
      `  cap the moment it existed — a state the app cannot produce. Raise\n` +
      `  --seats, or move some of them to --attorneys, who consume none.`,
  );
}

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) die(`"${adminEmail}" is not an email address.`);

// ─── Shapes copied from the app ─────────────────────────────────────────────

/** Verbatim from app/api/webhooks/stripe/route.ts:22. */
function deriveTier(n) {
  if (n >= 25) return "pro";
  if (n >= 10) return "standard";
  return "basic";
}

/** "Byron LLP" → "byron-llp". Only ever used to build example.com addresses. */
const slug =
  firmName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "firm";

// A short random tail so seeding the same firm name twice does not collide on
// an address that already exists. createUser fails on a duplicate, and the
// failure would arrive halfway through the roster rather than up front.
const runTag = randomBytes(2).toString("hex");

// ─── Rollback ───────────────────────────────────────────────────────────────
//
// A half-seeded firm is worse than none: it looks real in the dashboard and is
// wrong in a way nobody thinks to check. Every created id is tracked so a
// failure anywhere can unwind the whole thing.
//
// Order is forced by the schema. firms.owner_id is ON DELETE RESTRICT, so the
// owner cannot be deleted while the firm exists; the firm cascades to seats and
// firm_members, so it goes first and the auth users follow.
const createdUserIds = [];
let createdFirmId = null;

async function rollback(reason) {
  console.error(`\n✗ ${reason}`);
  console.error("  Rolling back…");

  if (createdFirmId) {
    const { error } = await admin.from("firms").delete().eq("id", createdFirmId);
    if (error) console.error(`  ! could not delete firm ${createdFirmId}: ${error.message}`);
    else console.error(`  · firm ${createdFirmId} deleted (seats and members cascaded)`);
  }

  for (const id of createdUserIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.error(`  ! could not delete auth user ${id}: ${error.message}`);
  }
  if (createdUserIds.length) console.error(`  · ${createdUserIds.length} auth user(s) deleted`);

  console.error("");
  process.exit(1);
}

/** createUser + remember the id for rollback. */
async function createAuthUser(email, fullName) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    // Mirrors both the webhook and /api/invite. NOT a deliverability signal —
    // that is firm_members.email_verified_at (0029), and every creation path in
    // the app passes email_confirm: true, so it is true for everybody and means
    // something else entirely.
    email_confirm: true,
    ...(fullName ? { user_metadata: { full_name: fullName } } : {}),
  });

  if (error) {
    await rollback(
      `Could not create ${email}: ${error.message}` +
        (/already/i.test(error.message)
          ? `\n\n  That address already exists on staging. Pick another, or remove the\n` +
            `  existing user first — this script will not adopt an account it did not\n` +
            `  create, because the webhook's collision handling is deliberately not\n` +
            `  replicated here (see the header).`
          : ""),
    );
  }

  createdUserIds.push(data.user.id);
  return data.user.id;
}

// ─── Seed ───────────────────────────────────────────────────────────────────

console.log(`\n  Seeding "${firmName}" on staging (${ALLOWED_PROJECT_REF})…\n`);

// 1 — the admin auth user. Created first because firms.owner_id needs it, and
// it is the write most likely to fail (a taken address), so failing here leaves
// nothing to unwind.
const adminUserId = await createAuthUser(adminEmail, null);
console.log(`  · admin auth user      ${adminEmail}`);

// 2 — the firm. Field for field from provisionFirm; see the header for the four
// columns deliberately left null.
const { data: firm, error: firmError } = await admin
  .from("firms")
  .insert({
    name: firmName,
    owner_id: adminUserId,
    tier: deriveTier(seats),
    max_seats: seats,
    status: "active",
  })
  .select("id")
  .single();

if (firmError || !firm) await rollback(`Could not create the firm: ${firmError?.message}`);
createdFirmId = firm.id;
console.log(`  · firms row            ${firm.id}  tier ${deriveTier(seats)}, ${seats} seats`);

// 3 — app_metadata. This is what every gate reads: authorizeIntake wants
// role === 'admin' and a firm_id, and RLS reads the same two claims. A firm
// whose owner is missing these is invisible to its own admin.
const { error: metaError } = await admin.auth.admin.updateUserById(adminUserId, {
  app_metadata: { firm_id: firm.id, role: "admin" },
});
if (metaError) await rollback(`Could not stamp app_metadata: ${metaError.message}`);
console.log(`  · app_metadata         { firm_id, role: 'admin' }`);

// 4 — the seats row.
//
// 🔴 THIS MUST COME BEFORE ANY firm_members INSERT. The sync_used_seats trigger
// (0015) maintains used_seats with `update public.seats set used_seats = … where
// firm_id = …`. With no seats row that UPDATE matches zero rows and raises
// NOTHING — the members would insert cleanly and used_seats would stay absent,
// which reads downstream as a firm that bought nothing.
const { error: seatsError } = await admin
  .from("seats")
  .insert({ firm_id: firm.id, max_seats: seats, used_seats: 0 });
if (seatsError) await rollback(`Could not create the seats row: ${seatsError.message}`);
console.log(`  · seats row            max_seats ${seats}, used_seats 0`);

// 5 — the admin's own membership. status 'invited' and occupies_seat false are
// both the webhook's values, not oversights — see the header.
const { error: adminMemberError } = await admin.from("firm_members").insert({
  firm_id: firm.id,
  user_id: adminUserId,
  role: "admin",
  status: "invited",
  occupies_seat: false,
});
if (adminMemberError) await rollback(`Could not create the admin member: ${adminMemberError.message}`);
console.log(`  · firm_members         admin, invited, occupies_seat false`);

// 6 — staff and attorneys.
const people = [
  ...Array.from({ length: attorneyCount }, (_, i) => ({
    email: `${slug}-attorney-${i + 1}-${runTag}@example.com`,
    name: `Attorney ${i + 1}`,
    isAttorney: true,
  })),
  ...Array.from({ length: staffCount }, (_, i) => ({
    email: `${slug}-staff-${i + 1}-${runTag}@example.com`,
    name: `Staff ${i + 1}`,
    isAttorney: false,
  })),
];

for (const person of people) {
  const userId = await createAuthUser(person.email, person.name);

  const { error: metaErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { firm_id: firm.id, role: "employee" },
  });
  if (metaErr) await rollback(`Could not stamp app_metadata for ${person.email}: ${metaErr.message}`);

  const { error: memberErr } = await admin.from("firm_members").insert({
    firm_id: firm.id,
    user_id: userId,
    role: "employee",
    status: "invited",
    is_attorney: person.isAttorney,
    // The inverse, always. lib/seats.ts and the 0015 trigger derive access and
    // billing from one predicate on purpose; two rules that can drift is exactly
    // how the original seat double-count happened.
    occupies_seat: !person.isAttorney,
  });
  if (memberErr) await rollback(`Could not add ${person.email}: ${memberErr.message}`);

  console.log(
    `  · ${person.isAttorney ? "attorney" : "staff   "}             ${person.email}`,
  );
}

// ─── Verify, rather than assume ─────────────────────────────────────────────
//
// Read used_seats back instead of predicting it. The trigger is the thing doing
// the counting, and a seeded firm whose seat count is wrong is the one defect
// that would quietly invalidate every cap test run against it.
const { data: seatRow } = await admin
  .from("seats")
  .select("max_seats, used_seats")
  .eq("firm_id", firm.id)
  .maybeSingle();

const expectedUsed = staffCount;
const seatsAgree = seatRow?.used_seats === expectedUsed;

// ─── The sign-in link ───────────────────────────────────────────────────────
//
// Minted the same way dev-auth's `link` does, and for the same reason: prefer
// the hashed token over action_link, which points at the Supabase project's own
// verify endpoint and redirects to whatever Site URL that project has
// configured — often not the app you are running.
//
// Lands on /intake rather than /dashboard because that is what this firm was
// seeded to show: never touched, so IntakeIntro renders on arrival.
const { data: link, error: linkError } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: adminEmail,
  options: { redirectTo: `${APP_URL}/auth/callback?next=/intake` },
});

const hashed = link?.properties?.hashed_token;
const signIn = hashed
  ? `${APP_URL}/auth/confirm?token_hash=${hashed}&type=magiclink&next=/intake`
  : link?.properties?.action_link;

// ─── Report ─────────────────────────────────────────────────────────────────

console.log(`
  ✓ ${firmName}

    firm_id     ${firm.id}
    seats       ${seatRow?.used_seats ?? "?"} of ${seatRow?.max_seats ?? seats} used${
      seatsAgree ? "" : `   ⚠ expected ${expectedUsed} — the 0015 trigger disagrees`
    }
    members     1 admin · ${attorneyCount} attorney(s) · ${staffCount} staff
    stripe      none — customer and subscription are null, by design
    intake      none — IntakeIntro will render on first visit
`);

if (linkError || !signIn) {
  console.log(
    `  ⚠ The firm is seeded but the sign-in link failed: ${linkError?.message ?? "no link returned"}\n` +
      `    Mint one with:  dotenv -e .env.local -- node scripts/dev-auth.mjs link ${adminEmail} --next /intake\n`,
  );
} else {
  console.log(`  Sign in as ${adminEmail}:\n\n  ${signIn}\n`);
}

if (!seatsAgree) {
  console.log(
    `  ⚠ used_seats is ${seatRow?.used_seats}, expected ${expectedUsed} (one per non-attorney).\n` +
      `    Attorneys must not consume seats. Check trg_sync_used_seats before\n` +
      `    trusting any cap behaviour tested against this firm.\n`,
  );
}
