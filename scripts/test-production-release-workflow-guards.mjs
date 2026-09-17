import { readFileSync } from "node:fs";

const bootstrap = readFileSync(
  new URL("../.github/workflows/bootstrap-production-baseline.yml", import.meta.url),
  "utf8",
);
const release = readFileSync(
  new URL("../.github/workflows/release-production.yml", import.meta.url),
  "utf8",
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

console.log("Production release workflow guard tests passed.");

function assertIncludes(value, expected, message) {
  if (!value.includes(expected)) throw new Error(message);
}
