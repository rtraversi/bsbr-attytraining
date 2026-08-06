// scripts/verify-cutover.mjs
//
// Read-only proof for the IURIX Supabase cutover. Each check targets a failure
// mode that otherwise looks healthy: a browser can keep the old public project
// ref, a missing webhook secret can be accepted, health can hide a DB error,
// and a valid-looking local env can still point at staging.
//
// Usage:
//   npx dotenv -e .env.local -- node scripts/verify-cutover.mjs
//   npx dotenv -e .env.local -- node scripts/verify-cutover.mjs --check bundle
//   npx dotenv -e .env.local -- node scripts/verify-cutover.mjs --json
//
// Exit convention: 0 means every selected check PASSed; 1 means at least one
// selected check FAILed; 2 means none failed but at least one was INCONCLUSIVE.
// INCONCLUSIVE is never a pass — it means the observable evidence was absent.

import { createClient } from "@supabase/supabase-js";
import {
  PROD_PROJECT_REF,
  STAGING_PROJECT_REF,
  ResultStatus,
  classifyBundleRefs,
  classifyResults,
  extractNextChunkUrls,
  extractProjectRef,
  extractSupabaseProjectRefs,
} from "./verify-cutover-helpers.mjs";

const LIVE_LOGIN_URL = "https://iurixaccreditation.com/login";
const CERT_GENERATE_URL = "https://iurixaccreditation.com/api/certs/generate";
const HEALTH_URL = "https://iurixaccreditation.com/api/health";
const CERTIFICATES_BUCKET = "certificates";

const CHECKS = {
  bundle: {
    label: "Live browser bundle ref",
    run: checkBrowserBundleRef,
  },
  secret: {
    label: "Secret rejection",
    run: checkSecretRejection,
  },
  health: {
    label: "Health + DB reachability",
    run: checkHealth,
  },
  prod: {
    label: "Direct PROD reachability",
    run: checkDirectProdReachability,
  },
};

function result(id, status, evidence, details = {}) {
  return { id, label: CHECKS[id].label, status, evidence, details };
}

function failure(id, error) {
  const message = error instanceof Error ? error.message : String(error);
  return result(id, ResultStatus.FAIL, `Check could not establish its required fact: ${message}`);
}

async function checkBrowserBundleRef() {
  const loginResponse = await fetch(LIVE_LOGIN_URL);
  if (!loginResponse.ok) {
    return result(
      "bundle",
      ResultStatus.FAIL,
      `GET ${LIVE_LOGIN_URL} returned HTTP ${loginResponse.status}; no live bundle can be verified.`,
      { loginStatus: loginResponse.status }
    );
  }

  const chunkUrls = extractNextChunkUrls(await loginResponse.text(), LIVE_LOGIN_URL);
  if (chunkUrls.length === 0) {
    return result(
      "bundle",
      ResultStatus.INCONCLUSIVE,
      "The live login HTML referenced no /_next/static/chunks/*.js assets, so no fetched browser asset could be inspected.",
      { loginStatus: loginResponse.status, chunkCount: 0 }
    );
  }

  const refs = new Set();
  for (const chunkUrl of chunkUrls) {
    const response = await fetch(chunkUrl);
    if (!response.ok) {
      return result(
        "bundle",
        ResultStatus.FAIL,
        `Referenced browser chunk ${chunkUrl} returned HTTP ${response.status}.`,
        { loginStatus: loginResponse.status, chunkCount: chunkUrls.length, failedChunk: chunkUrl }
      );
    }
    for (const ref of extractSupabaseProjectRefs(await response.text())) refs.add(ref);
  }

  // An earlier ad-hoc grep found neither ref and was inconclusive. Treat that
  // absence as INCONCLUSIVE here too; it cannot honestly establish a cutover.
  const classification = classifyBundleRefs([...refs]);
  return result("bundle", classification.status, classification.evidence, {
    loginStatus: loginResponse.status,
    chunkCount: chunkUrls.length,
    projectRefs: [...refs],
  });
}

async function checkSecretRejection() {
  const response = await fetch(CERT_GENERATE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-secret": "cutover-verifier-deliberately-wrong",
    },
    body: "{}",
  });

  if (response.status === 401) {
    return result(
      "secret",
      ResultStatus.PASS,
      `POST ${CERT_GENERATE_URL} with a deliberately wrong secret returned HTTP 401.`,
      { statusCode: response.status }
    );
  }

  return result(
    "secret",
    ResultStatus.FAIL,
    `POST ${CERT_GENERATE_URL} with a deliberately wrong secret returned HTTP ${response.status}, expected 401.`,
    { statusCode: response.status }
  );
}

async function checkHealth() {
  const response = await fetch(HEALTH_URL);
  let body;
  try {
    body = await response.json();
  } catch {
    return result(
      "health",
      ResultStatus.FAIL,
      `GET ${HEALTH_URL} returned HTTP ${response.status} with a non-JSON body; expected status and db evidence.`,
      { statusCode: response.status }
    );
  }

  if (response.ok && body?.status === "ok" && body?.db === "ok") {
    return result(
      "health",
      ResultStatus.PASS,
      `GET ${HEALTH_URL} returned HTTP ${response.status} with status=${JSON.stringify(body.status)} and db=${JSON.stringify(body.db)}.`,
      { statusCode: response.status, health: body }
    );
  }

  return result(
    "health",
    ResultStatus.FAIL,
    `GET ${HEALTH_URL} returned HTTP ${response.status} with status=${JSON.stringify(body?.status)} and db=${JSON.stringify(body?.db)}; expected both to be \"ok\".`,
    { statusCode: response.status, health: body }
  );
}

async function checkDirectProdReachability() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return result(
      "prod",
      ResultStatus.INCONCLUSIVE,
      "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing, so direct PROD reachability cannot be checked."
    );
  }

  const ref = extractProjectRef(url);
  if (!ref) {
    return result(
      "prod",
      ResultStatus.INCONCLUSIVE,
      `NEXT_PUBLIC_SUPABASE_URL does not expose a standard Supabase project ref: ${new URL(url).host}.`
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    return result(
      "prod",
      ResultStatus.FAIL,
      `Service-role listBuckets() against project ${ref} failed: ${error.message}.`,
      { projectRef: ref }
    );
  }

  const hasCertificatesBucket = buckets.some((bucket) => bucket.id === CERTIFICATES_BUCKET);
  if (ref !== PROD_PROJECT_REF) {
    const environment = ref === STAGING_PROJECT_REF ? "STAGING" : "an unknown project";
    return result(
      "prod",
      ResultStatus.FAIL,
      `Loaded credentials connected to ${environment} ref ${ref}; expected PROD ref ${PROD_PROJECT_REF}. certificates bucket present=${hasCertificatesBucket}.`,
      { projectRef: ref, certificatesBucketPresent: hasCertificatesBucket }
    );
  }

  if (!hasCertificatesBucket) {
    return result(
      "prod",
      ResultStatus.FAIL,
      `Loaded credentials connected to PROD ref ${ref}, but listBuckets() did not include ${CERTIFICATES_BUCKET}.`,
      { projectRef: ref, certificatesBucketPresent: false }
    );
  }

  return result(
    "prod",
    ResultStatus.PASS,
    `Loaded credentials connected to PROD ref ${ref}; listBuckets() included ${CERTIFICATES_BUCKET}.`,
    { projectRef: ref, certificatesBucketPresent: true }
  );
}

function parseArgs(argv) {
  const options = { json: false, checks: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--json") {
      options.json = true;
    } else if (argv[i] === "--check") {
      const id = argv[++i];
      if (!id || !CHECKS[id]) throw new Error(`--check must be one of: ${Object.keys(CHECKS).join(", ")}`);
      options.checks.push(id);
    } else {
      throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  return options;
}

function printHuman(results, summary) {
  for (const check of results) {
    console.log(`${check.status} | ${check.label}`);
    console.log(`  Evidence: ${check.evidence}`);
  }
  console.log(`\n${summary.status} | ${results.length} selected check(s); exit ${summary.exitCode}.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const selectedIds = options.checks.length ? [...new Set(options.checks)] : Object.keys(CHECKS);
  const results = [];

  for (const id of selectedIds) {
    try {
      results.push(await CHECKS[id].run());
    } catch (error) {
      // A failed endpoint must not prevent the later checks from exposing their
      // own evidence; cutover faults are independent and often silent together.
      results.push(failure(id, error));
    }
  }

  const summary = classifyResults(results);
  if (options.json) {
    console.log(JSON.stringify({ status: summary.status, exitCode: summary.exitCode, checks: results }, null, 2));
  } else {
    printHuman(results, summary);
  }
  process.exitCode = summary.exitCode;
}

main().catch((error) => {
  console.error(`FAIL | Verifier invocation\n  Evidence: ${error.message || error}`);
  process.exitCode = 1;
});
