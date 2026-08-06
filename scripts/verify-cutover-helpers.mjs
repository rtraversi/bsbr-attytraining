export const PROD_PROJECT_REF = "ttqthtzdjacrhjtrcmmy";
export const STAGING_PROJECT_REF = "ndmzvtuywcufvkxtkjhg";

export const ResultStatus = Object.freeze({
  PASS: "PASS",
  FAIL: "FAIL",
  INCONCLUSIVE: "INCONCLUSIVE",
});

export function extractNextChunkUrls(html, pageUrl) {
  const urls = new Set();
  const pattern = /(?:src|href)=["']([^"']*\/_next\/static\/chunks\/[^"']+?\.js(?:\?[^"']*)?)["']/g;

  for (const match of html.matchAll(pattern)) {
    urls.add(new URL(match[1], pageUrl).href);
  }

  return [...urls];
}

export function extractSupabaseProjectRefs(assetText) {
  const refs = new Set();
  if (assetText.includes(PROD_PROJECT_REF)) refs.add(PROD_PROJECT_REF);
  if (assetText.includes(STAGING_PROJECT_REF)) refs.add(STAGING_PROJECT_REF);
  return [...refs];
}

export function classifyBundleRefs(refs) {
  const found = new Set(refs);
  const hasProd = found.has(PROD_PROJECT_REF);
  const hasStaging = found.has(STAGING_PROJECT_REF);

  if (hasProd && !hasStaging) {
    return {
      status: ResultStatus.PASS,
      evidence: `Found only PROD ref ${PROD_PROJECT_REF} in fetched browser chunks.`,
    };
  }

  if (hasStaging && !hasProd) {
    return {
      status: ResultStatus.FAIL,
      evidence: `Found STAGING ref ${STAGING_PROJECT_REF} in fetched browser chunks.`,
    };
  }

  if (hasProd && hasStaging) {
    return {
      status: ResultStatus.FAIL,
      evidence: `Found both PROD (${PROD_PROJECT_REF}) and STAGING (${STAGING_PROJECT_REF}) refs in fetched browser chunks.`,
    };
  }

  return {
    status: ResultStatus.INCONCLUSIVE,
    evidence: "Neither known Supabase project ref appeared in fetched browser chunks; the bundle check cannot prove the cutover.",
  };
}

export function extractProjectRef(supabaseUrl) {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    const match = hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function classifyResults(results) {
  if (results.some((result) => result.status === ResultStatus.FAIL)) {
    return { status: ResultStatus.FAIL, exitCode: 1 };
  }

  if (results.some((result) => result.status === ResultStatus.INCONCLUSIVE)) {
    return { status: ResultStatus.INCONCLUSIVE, exitCode: 2 };
  }

  return { status: ResultStatus.PASS, exitCode: 0 };
}
