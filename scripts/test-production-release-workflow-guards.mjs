import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const bootstrap = readFileSync(
  new URL("../.github/workflows/bootstrap-production-baseline.yml", import.meta.url),
  "utf8",
);
const release = readFileSync(
  new URL("../.github/workflows/release-production.yml", import.meta.url),
  "utf8",
);
const quality = readFileSync(new URL("../.github/workflows/quality.yml", import.meta.url), "utf8");
const operationsRunbook = readFileSync(
  new URL("../docs/architecture/production-operations-runbook.md", import.meta.url),
  "utf8",
);
const browserVerifier = readFileSync(
  new URL("./verify-production-browser.mjs", import.meta.url),
  "utf8",
);
const supabaseDatabaseCa = readFileSync(
  new URL("../config/supabase-prod-ca-2021.crt", import.meta.url),
);

for (const [name, workflow] of [
  ["bootstrap", bootstrap],
  ["release", release],
]) {
  assertIncludes(workflow, "fetch-depth: 0", `${name} must fetch trusted Git history`);
  assertIncludes(workflow, ".projectId", `${name} must verify the Vercel project`);
  assertIncludes(workflow, ".gitSource.repoId", `${name} must verify repository identity`);
  assertIncludes(workflow, ".gitSource.ref", `${name} must verify the Git ref`);
  assertIncludes(workflow, ".gitSource.sha", `${name} must verify deployment Git identity`);
  assertIncludes(workflow, "git merge-base --is-ancestor", `${name} must verify main ancestry`);
}

assertIncludes(
  bootstrap,
  "deployments/$EXPECTED_DEPLOYMENT_ID",
  "bootstrap must inspect the current deployment",
);
assertIncludes(
  bootstrap,
  'test "$CONFIRMATION" = "BOOTSTRAP LEGACY"',
  "legacy bootstrap must require an explicit one-time confirmation",
);
assertIncludes(
  bootstrap,
  'kind: "legacy-no-manifest"',
  "legacy bootstrap must archive a typed baseline",
);
assertIncludes(
  bootstrap,
  "sourceRef: $sourceRef",
  "legacy bootstrap must archive the deployment's original source ref",
);
assertIncludes(
  bootstrap,
  "production-legacy-baseline.json",
  "legacy bootstrap must archive its verified identity",
);
assertIncludes(
  bootstrap,
  "text/html",
  "legacy bootstrap must only accept the known HTML manifest fallback",
);
assertIncludes(
  bootstrap,
  "PRODUCTION_BROWSER_EXPECTATION: legacy-rollback",
  "legacy bootstrap must use the explicitly degraded browser expectation",
);
assertIncludes(
  release,
  ".github/workflows/bootstrap-production-baseline.yml",
  "release must verify the source bootstrap workflow",
);
assertIncludes(
  release,
  ".repository.id | tostring",
  "release must bind the bootstrap run to the current repository",
);
assertIncludes(
  release,
  'git merge-base --is-ancestor "$bootstrap_run_sha" HEAD',
  "release must bind the bootstrap run to trusted main ancestry",
);
assertIncludes(
  release,
  'test "$LEGACY_BASELINE_CONFIRMATION" = "USE VERIFIED LEGACY BASELINE"',
  "first manifest release must require explicit legacy-baseline confirmation",
);
assertIncludes(
  release,
  'test -z "$LEGACY_BASELINE_RUN_ID"',
  "manifest-bearing releases must reject the legacy baseline path",
);
assertIncludes(
  release,
  'test "$previous_source_ref" = "main"',
  "manifest-bearing rollback targets must originate from main",
);
assertIncludes(
  release,
  "(.sourceRef == $sourceRef)",
  "legacy release transition must match the archived source ref",
);
assertIncludes(
  release,
  "Refusing legacy baseline fallback for a JSON release response.",
  "legacy fallback must reject malformed or mismatched JSON manifests",
);
assertIncludes(
  release,
  "steps.deploy.outputs.previous_has_release_manifest == 'true'",
  "legacy rollback must not require metadata the legacy deployment never emitted",
);
assertIncludes(
  release,
  "steps.deploy.outputs.previous_has_release_manifest == 'true' && 'rollback' || 'legacy-rollback'",
  "rollback browser verification must distinguish manifest and legacy baselines",
);
assertIncludes(
  browserVerifier,
  'new Set(["production", "rollback", "legacy-rollback"])',
  "browser verifier must name the legacy rollback exception explicitly",
);
assertIncludes(
  browserVerifier,
  'expectation !== "legacy-rollback"',
  "only the legacy rollback exception may omit modern response headers",
);
assertIncludes(
  release,
  "deployments/$previous_production_id",
  "release must inspect its rollback deployment",
);
assertIncludes(
  release,
  "Inspect production target for recovery",
  "release must inspect the actual target after failure",
);
assertIncludes(
  release,
  "steps.recovery.outputs.rollback_required == 'true'",
  "rollback must use inspected target state",
);
assertIncludes(
  release,
  "DEPLOYMENT_VERIFY_INTERVAL_MS: 2000",
  "rollback identity verification must use a valid retry interval",
);
assertIncludes(
  quality,
  "npm run verify",
  "pull-request CI must run the consolidated verification gate",
);
assertIncludes(
  quality,
  "npm audit --omit=dev --audit-level=high",
  "pull-request CI must enforce the production dependency threshold",
);
assertIncludes(
  release,
  "npm run verify:launch-approval",
  "production release must require completed launch approval",
);
assertIncludes(
  release,
  "NODE_EXTRA_CA_CERTS: ${{ github.workspace }}/config/supabase-prod-ca-2021.crt",
  "staging proof must use the pinned Supabase database CA",
);
if (
  createHash("sha256").update(supabaseDatabaseCa).digest("hex") !==
  "700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7"
) {
  throw new Error("Pinned Supabase database CA does not match the reviewed certificate.");
}
assertBefore(
  release,
  "npm run verify:launch-approval",
  "Verify isolated staging database boundary",
  "launch approval must be verified before the isolated staging proof",
);
assertIncludes(
  browserVerifier,
  "parsePublicResourceUrl",
  "production browser verification must enforce the public-resource allowlist",
);
assertIncludes(
  browserVerifier,
  "publicResourceUrls",
  "production browser verification must enforce exact public-resource URLs",
);
assertIncludes(
  browserVerifier,
  "maxRedirects: 0",
  "production browser verification must reject public-resource redirects",
);
assertIncludes(
  browserVerifier,
  "resource page heading",
  "production browser verification must inspect public-resource page content",
);
assertIncludes(
  browserVerifier,
  "hostedRouteReadinessBudgetMs = 15_000",
  "production browser verification must enforce a hosted route-readiness budget",
);
assertIncludes(
  browserVerifier,
  'expectReadinessBudget(protectedStartedAt, "protected route")',
  "production browser verification must budget the protected signed-out boundary",
);
assertIncludes(
  operationsRunbook,
  "BOOTSTRAP LEGACY",
  "operations runbook must document the explicit legacy bootstrap confirmation",
);
assertIncludes(
  operationsRunbook,
  "USE VERIFIED LEGACY BASELINE",
  "operations runbook must document the first-release legacy confirmation",
);
assertIncludes(
  operationsRunbook,
  "HTML non-JSON manifest fallback",
  "operations runbook must not claim the legacy baseline has a release manifest",
);
assertIncludes(
  operationsRunbook,
  "Leave both legacy inputs empty after the first successful manifest-bearing release.",
  "operations runbook must retire the legacy path after transition",
);

console.log("Production release workflow guard tests passed.");

function assertIncludes(value, expected, message) {
  if (!value.includes(expected)) throw new Error(message);
}

function assertBefore(value, first, second, message) {
  const firstIndex = value.indexOf(first);
  const secondIndex = value.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) throw new Error(message);
}
