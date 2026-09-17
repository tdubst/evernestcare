import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  hasExactProjectConfirmation,
  validateStagingProjectTarget,
} from "./production-project-registry.mjs";
import { isFullGitSha, releaseProofIdForSha } from "./production-release-proof.mjs";

const safeEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("STAGING_")),
);
const provisionScript = fileURLToPath(
  new URL("./provision-production-staging.mjs", import.meta.url),
);
const verifyScript = fileURLToPath(new URL("./verify-production-staging.mjs", import.meta.url));
const acceptedBetaRef = "ncbzkjwwvfguivrkgvus";
const isolatedRef = "abcdefghijklmnopqrst";

assertBlocked(provisionScript, {}, "missing required environment");

assertBlocked(
  provisionScript,
  fixtureEnvironment({
    expectedRef: isolatedRef,
    apiRef: isolatedRef,
    databaseRef: acceptedBetaRef,
    confirmation: `PROVISION ${isolatedRef}`,
  }),
  "do not identify the same project",
);

assertBlocked(
  provisionScript,
  fixtureEnvironment({
    expectedRef: acceptedBetaRef,
    apiRef: acceptedBetaRef,
    databaseRef: acceptedBetaRef,
    confirmation: `PROVISION ${acceptedBetaRef}`,
  }),
  "match the reviewed project registry",
);

assertBlocked(
  provisionScript,
  {
    ...fixtureEnvironment({
      expectedRef: isolatedRef,
      apiRef: isolatedRef,
      databaseRef: isolatedRef,
      confirmation: `PROVISION ${isolatedRef}`,
    }),
    STAGING_PROVISION_DATABASE_URL: `postgresql://postgres:unused@db.${isolatedRef}.supabase.co/postgres`,
  },
  "must require verify-full TLS",
);

const syntheticRegistry = {
  stagingProjectRefs: new Set([isolatedRef]),
  protectedProjectRefs: new Set([acceptedBetaRef, "gqxnphwszyudcncewnra"]),
};
if (
  validateStagingProjectTarget({
    expectedProjectRef: isolatedRef,
    suppliedProtectedProjectRefs: new Set([acceptedBetaRef]),
    registry: syntheticRegistry,
  }) ||
  !validateStagingProjectTarget({
    expectedProjectRef: isolatedRef,
    suppliedProtectedProjectRefs: syntheticRegistry.protectedProjectRefs,
    registry: syntheticRegistry,
  }) ||
  hasExactProjectConfirmation("PROVISION WRONG PROJECT", "PROVISION", isolatedRef) ||
  !hasExactProjectConfirmation(`VERIFY ${isolatedRef}`, "VERIFY", isolatedRef)
) {
  throw new Error("Production staging trust-anchor guard test failed.");
}

const firstSha = "0123456789abcdef0123456789abcdef01234567";
const secondSha = "1123456789abcdef0123456789abcdef01234567";
if (
  isFullGitSha("not-a-sha") ||
  !isFullGitSha(firstSha) ||
  releaseProofIdForSha(firstSha) !== releaseProofIdForSha(firstSha) ||
  releaseProofIdForSha(firstSha) === releaseProofIdForSha(secondSha)
) {
  throw new Error("Production release proof derivation guard test failed.");
}

assertBlocked(verifyScript, {}, "missing required environment");

assertBlocked(
  verifyScript,
  verificationEnvironment({
    expectedRef: isolatedRef,
    apiRef: isolatedRef,
    databaseRef: acceptedBetaRef,
    confirmation: `VERIFY ${isolatedRef}`,
  }),
  "do not identify the same project",
);

assertBlocked(
  verifyScript,
  {
    ...verificationEnvironment({
      expectedRef: isolatedRef,
      apiRef: isolatedRef,
      databaseRef: isolatedRef,
      confirmation: `VERIFY ${isolatedRef}`,
    }),
    STAGING_VERIFIER_DATABASE_URL: `postgresql://evernest_staging_verifier.${isolatedRef}:unused@aws-0-us-east-2.pooler.supabase.com/postgres`,
  },
  "must require verify-full TLS",
);

assertBlocked(
  verifyScript,
  verificationEnvironment({
    expectedRef: acceptedBetaRef,
    apiRef: acceptedBetaRef,
    databaseRef: acceptedBetaRef,
    confirmation: `VERIFY ${acceptedBetaRef}`,
  }),
  "match the reviewed project registry",
);

console.log("Production staging guard tests passed.");

function fixtureEnvironment({ expectedRef, apiRef, databaseRef, confirmation }) {
  return {
    STAGING_EXPECTED_PROJECT_REF: expectedRef,
    STAGING_OWNER_EMAIL: "owner@example.test",
    STAGING_PROTECTED_PROJECT_REFS: acceptedBetaRef,
    STAGING_PROVISION_CONFIRMATION: confirmation,
    STAGING_PROVISION_DATABASE_URL: `postgresql://postgres:unused@db.${databaseRef}.supabase.co/postgres?sslmode=verify-full`,
    STAGING_REVOKED_EMAIL: "revoked@example.test",
    STAGING_SENTINEL_EVENT_ID: "00000000-0000-4000-8000-000000000001",
    STAGING_SUPABASE_URL: `https://${apiRef}.supabase.co`,
  };
}

function verificationEnvironment({ expectedRef, apiRef, databaseRef, confirmation }) {
  return {
    STAGING_EXPECTED_PROJECT_REF: expectedRef,
    STAGING_OWNER_EMAIL: "owner@example.test",
    STAGING_OWNER_PASSWORD: "unused-owner-password",
    STAGING_PROTECTED_PROJECT_REFS: acceptedBetaRef,
    STAGING_RELEASE_SHA: "0123456789abcdef0123456789abcdef01234567",
    STAGING_REVOKED_EMAIL: "revoked@example.test",
    STAGING_REVOKED_PASSWORD: "unused-revoked-password",
    STAGING_SENTINEL_EVENT_ID: "00000000-0000-4000-8000-000000000001",
    STAGING_SUPABASE_PUBLISHABLE_KEY: "unused-publishable-key",
    STAGING_SUPABASE_URL: `https://${apiRef}.supabase.co`,
    STAGING_VERIFIER_DATABASE_URL: `postgresql://evernest_staging_verifier.${databaseRef}:unused@aws-0-us-east-2.pooler.supabase.com/postgres?sslmode=verify-full`,
    STAGING_VERIFY_CONFIRMATION: confirmation,
  };
}

function assertBlocked(script, environment, expectedMessage) {
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...safeEnvironment, ...environment },
    timeout: 5_000,
  });
  const output = `${result.stdout}${result.stderr}`;

  if (result.status !== 1 || !output.includes(expectedMessage)) {
    throw new Error("Production staging guard test failed.");
  }
}
