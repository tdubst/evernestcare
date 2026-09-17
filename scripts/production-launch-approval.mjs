import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const requiredEvidenceKeys = [
  "pullRequestQuality",
  "architectureReview",
  "securityPrivacyReview",
  "backendReview",
  "uxReview",
  "isolatedStagingProof",
  "authRecoveryDrill",
  "authenticatedBrowserMatrix",
  "databaseAdvisors",
  "directMutationMatrix",
  "backupRestoreDrill",
  "accountClosureDrill",
  "credentialRevocationDrill",
  "incidentEvidenceDrill",
  "alertDeliveryDrill",
  "accessibilityCrossBrowser",
  "performance",
  "privacyPolicyTerms",
  "consentRetention",
  "hipaaVendorReview",
  "supportReadiness",
  "productionBaseline",
  "productionEnvironment",
];

export const requiredOwnerKeys = [
  "product",
  "architecture",
  "backend",
  "webApp",
  "securityPrivacy",
  "ux",
  "qaRelease",
  "legal",
  "operations",
];

const migrationPattern = /^\d{14}_[a-z0-9_]+\.sql$/;
const referencePattern = /^restricted:[a-z0-9][a-z0-9._/-]{4,}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function readLaunchApproval(path) {
  if (!existsSync(path)) throw new Error("launch approval file is missing");

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error("launch approval file is invalid JSON");
  }
}

export function validateLaunchApproval(approval, options = {}) {
  const packageVersion = options.packageVersion ?? "0.1.0";
  const migrationsDirectory = resolve(options.migrationsDirectory ?? "supabase/migrations");
  const failures = [];

  if (approval?.schemaVersion !== 1) failures.push("schemaVersion");
  if (approval?.releaseVersion !== packageVersion) failures.push("releaseVersion");
  if (approval?.status !== "approved_for_promotion") failures.push("status");

  const migrationFiles = readdirSync(migrationsDirectory)
    .filter((name) => migrationPattern.test(name))
    .sort();
  const firstMigration = approval?.migrationRange?.first;
  const lastMigration = approval?.migrationRange?.last;
  const firstIndex = migrationFiles.indexOf(firstMigration);
  const lastIndex = migrationFiles.indexOf(lastMigration);

  if (
    typeof firstMigration !== "string" ||
    typeof lastMigration !== "string" ||
    firstIndex < 0 ||
    lastIndex < firstIndex
  ) {
    failures.push("migrationRange");
  }

  validateExactKeys(
    approval?.requiredEvidence,
    requiredEvidenceKeys,
    "requiredEvidence",
    failures,
    (entry) =>
      ["pass", "approved"].includes(entry?.status) &&
      referencePattern.test(entry?.reference ?? "") &&
      isValidDate(entry?.date),
  );
  validateExactKeys(
    approval?.ownerDecisions,
    requiredOwnerKeys,
    "ownerDecisions",
    failures,
    (entry) =>
      entry?.decision === "go" &&
      referencePattern.test(entry?.reference ?? "") &&
      isValidDate(entry?.date),
  );

  return [...new Set(failures)].sort();
}

export function defaultApprovalPath() {
  return resolve(
    process.env.PRODUCTION_LAUNCH_APPROVAL_PATH ??
      fileURLToPath(new URL("../config/production-launch-approval.json", import.meta.url)),
  );
}

export function defaultPackageVersion() {
  const packagePath = new URL("../package.json", import.meta.url);
  return JSON.parse(readFileSync(packagePath, "utf8")).version;
}

function validateExactKeys(value, expectedKeys, label, failures, validator) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push(label);
    return;
  }

  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expected)) failures.push(`${label}.keys`);

  for (const key of expectedKeys) {
    if (!validator(value[key])) failures.push(`${label}.${key}`);
  }
}

function isValidDate(value) {
  if (!datePattern.test(value ?? "")) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}
