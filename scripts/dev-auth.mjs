// scripts/dev-auth.mjs
//
// Sign in as anybody on STAGING, without email.
//
// WHY THIS EXISTS
//
// Resend has returned 403 on every send for a week (ix-dnszoho), so every path
// that ends in "check your inbox" is impassable: the employee invite, the
// password reset, and now the deliverability confirmation from migration 0029.
// Testing any of them by hand means reaching into GoTrue and minting the link
// that the email would have carried.
//
// 🔴 WHY A SCRIPT AND NOT A DEV-MODE ROUTE
//
// Because a route ships. A `devLink` in the invite routes was flagged for
// removal on 2026-06-18 and shipped anyway, and stayed in production for two
// months handing out working magic links in an API response. A script cannot
// leak, because it is not deployed. If you are tempted to "just add a
// ?dev=1 branch" to a route instead, that is the exact decision that produced
// the last one.
//
// 🔴 REFUSES TO RUN AGAINST PRODUCTION
//
// This mints login links and sets passwords. Pointed at PROD it is a credential
// factory against real paying customers. The project ref is checked against the
// URL actually loaded, hard-coded below, and anything that is not staging exits
// non-zero before a single call is made. Do not add a --force. Do not add a
// --project-ref override: the whole point is that it cannot be aimed.
//
// Usage (reads .env.local for NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
//
//   dotenv -e .env.local -- node scripts/dev-auth.mjs link <email> [--next /path]
//   dotenv -e .env.local -- node scripts/dev-auth.mjs password <email> <password>
//   dotenv -e .env.local -- node scripts/dev-auth.mjs users [--firm <name>]
//   dotenv -e .env.local -- node scripts/dev-auth.mjs verify-link <email>
//
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

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
      "  Run through dotenv:  dotenv -e .env.local -- node scripts/dev-auth.mjs …",
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
      `  This script mints login links and sets passwords. It runs against staging only.\n\n` +
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

const [command, ...rest] = process.argv.slice(2);

function flag(name) {
  const i = rest.indexOf(`--${name}`);
  return i !== -1 && i + 1 < rest.length ? rest[i + 1] : null;
}

const positional = rest.filter((arg, i) => {
  if (arg.startsWith("--")) return false;
  return !(i > 0 && rest[i - 1].startsWith("--"));
});

const USAGE = `
  dev-auth — staging only (${ALLOWED_PROJECT_REF})

  link <email> [--next /path]   Mint a magic link. Prints a pasteable
                                /auth/confirm?token_hash=… URL.
  password <email> <password>   Set a password and confirm the address.
  users [--firm <name>]         List users, newest first.
  verify-link <email>           Mint the email-deliverability link (0029).
`;

// ─── Lookup ─────────────────────────────────────────────────────────────────

/**
 * Resolve an address to a user, case-insensitively.
 *
 * Uses the same SQL function the app does (public.find_user_id_by_email, 0018)
 * rather than paginating listUsers, so this agrees with production behaviour
 * including the earliest-account-wins tiebreak on a duplicate address.
 */
async function userByEmail(email) {
  const { data: id, error } = await admin.rpc("find_user_id_by_email", { p_email: email });
  if (error) die(`Lookup failed: ${error.message}`);
  if (!id) die(`No user with address ${email} on staging.`);
  const { data, error: getErr } = await admin.auth.admin.getUserById(id);
  if (getErr) die(`Could not read user ${id}: ${getErr.message}`);
  return data.user;
}

// ─── Commands ───────────────────────────────────────────────────────────────

async function cmdLink() {
  const email = positional[0];
  if (!email) die(`link needs an email.\n${USAGE}`);
  const next = flag("next") ?? "/dashboard";

  await userByEmail(email); // fail fast with a clear message

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${APP_URL}/auth/callback?next=${next}` },
  });
  if (error) die(`generateLink failed: ${error.message}`);

  // Prefer the hashed token over action_link. action_link points at the Supabase
  // project's own verify endpoint, which redirects to whatever Site URL that
  // project has configured — often not the app you are running. The /auth/confirm
  // form goes straight into this app's own handler.
  const hashed = data?.properties?.hashed_token;
  const link = hashed
    ? `${APP_URL}/auth/confirm?token_hash=${hashed}&type=magiclink&next=${next}`
    : data?.properties?.action_link;

  console.log(`\n  ${email}\n\n  ${link}\n`);
}

async function cmdPassword() {
  const [email, password] = positional;
  if (!email || !password) die(`password needs an email and a password.\n${USAGE}`);
  if (password.length < 8) die("Password must be at least 8 characters (the app's own minimum).");

  const user = await userByEmail(email);

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (error) die(`Could not set password: ${error.message}`);

  console.log(`\n  ✓ Password set for ${email}\n    Sign in at ${APP_URL}/login\n`);
}

async function cmdUsers() {
  const firmName = flag("firm");

  let firmIds = null;
  if (firmName) {
    const { data: firms, error } = await admin
      .from("firms")
      .select("id, name")
      .ilike("name", `%${firmName}%`);
    if (error) die(`Firm lookup failed: ${error.message}`);
    if (!firms?.length) die(`No firm matching "${firmName}".`);
    firmIds = new Set(firms.map((f) => f.id));
    console.log(`\n  Firms matched: ${firms.map((f) => f.name).join(", ")}`);
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) die(`listUsers failed: ${error.message}`);

  const users = data.users
    .filter((u) => !firmIds || firmIds.has(u.app_metadata?.firm_id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  console.log(`\n  ${users.length} user(s)\n`);
  for (const u of users) {
    const name = u.user_metadata?.full_name ?? "—";
    const role = u.app_metadata?.role ?? "—";
    const firm = u.app_metadata?.firm_id ?? "—";
    console.log(
      `  ${u.created_at.slice(0, 10)}  ${u.email.padEnd(38)} ${String(role).padEnd(9)} ${String(name).padEnd(24)} ${firm}`,
    );
  }
  console.log("");
}

/**
 * The deliverability link from migration 0029.
 *
 * Writes the same columns POST /api/firm/verify-email writes, so a link minted
 * here is indistinguishable from one the app sent — which is what makes this a
 * real recovery path while Resend is down, rather than a test fixture.
 */
async function cmdVerifyLink() {
  const email = positional[0];
  if (!email) die(`verify-link needs an email.\n${USAGE}`);

  const user = await userByEmail(email);

  const { data: member, error } = await admin
    .from("firm_members")
    .select("id, firm_id, email_verified_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) die(`firm_members lookup failed: ${error.message}`);
  if (!member) die(`${email} exists but is not a member of any firm.`);

  if (member.email_verified_at) {
    console.log(`\n  ${email} is already confirmed (${member.email_verified_at}).`);
    console.log(`  Minting a fresh link anyway — opening it is harmless.\n`);
  }

  const token = `${randomUUID()}${randomUUID()}`.replace(/-/g, "");

  const { error: updateError } = await admin
    .from("firm_members")
    .update({
      email_verification_token: token,
      email_verification_sent_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  if (updateError) die(`Could not store token: ${updateError.message}`);

  console.log(`\n  ${email}\n\n  ${APP_URL}/verify-email?token=${token}\n`);
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

const COMMANDS = {
  link: cmdLink,
  password: cmdPassword,
  users: cmdUsers,
  "verify-link": cmdVerifyLink,
};

const run = COMMANDS[command];
if (!run) {
  console.error(USAGE);
  process.exit(1);
}

await run();
