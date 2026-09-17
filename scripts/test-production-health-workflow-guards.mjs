import { readFileSync } from "node:fs";

const workflow = readFileSync(
  new URL("../.github/workflows/production-health.yml", import.meta.url),
  "utf8",
);

assertIncludes(workflow, 'cron: "*/15 * * * *"', "production health must run every 15 minutes");
assertIncludes(
  workflow,
  "vars.PRODUCTION_MONITOR_ENABLED == 'true'",
  "production health must remain explicitly launch-gated",
);
assertIncludes(
  workflow,
  "EXPECTED_DEPLOYMENT_ID: ${{ vars.PRODUCTION_EXPECTED_DEPLOYMENT_ID }}",
  "production health must pin the deployment identity",
);
assertIncludes(
  workflow,
  "EXPECTED_RELEASE_SHA: ${{ vars.PRODUCTION_EXPECTED_RELEASE_SHA }}",
  "production health must pin the release SHA",
);
assertIncludes(
  workflow,
  "PRODUCTION_HEALTHCHECK_URL: ${{ vars.PRODUCTION_HEALTHCHECK_URL }}",
  "production health must use the canonical public origin",
);
assertIncludes(
  workflow,
  "EXPECTED_APP_MODE: production",
  "production health must reject beta mode",
);
assertIncludes(
  workflow,
  "DEPLOYMENT_VERIFY_ATTEMPTS: 1",
  "production health must fail quickly for alerting",
);
assertIncludes(
  workflow,
  "node scripts/verify-production-deployment.mjs",
  "production health must use the reviewed deployment verifier",
);

if (workflow.includes("${{ secrets.")) {
  throw new Error("production health must not require credentials or provider secrets");
}

console.log("Production health workflow guard tests passed.");

function assertIncludes(value, expected, message) {
  if (!value.includes(expected)) throw new Error(message);
}
