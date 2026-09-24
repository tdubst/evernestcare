import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  requiredEvidenceKeys,
  requiredOwnerKeys,
  validateLaunchApproval,
} from "./production-launch-approval.mjs";

const migrationsDirectory = fileURLToPath(new URL("../supabase/migrations", import.meta.url));
const migrationFiles = readdirSync(migrationsDirectory).sort();
const firstMigration = migrationFiles.find((name) => /^\d{14}_.+\.sql$/.test(name));
const lastMigration = migrationFiles.findLast((name) => /^\d{14}_.+\.sql$/.test(name));
const releaseSha = "a".repeat(40);
const evidenceEntry = {
  status: "pass",
  reference: "restricted:evidence/example",
  date: "2026-09-17",
};
const ownerEntry = { decision: "go", reference: "restricted:approval/example", date: "2026-09-17" };
const validApproval = {
  schemaVersion: 1,
  releaseVersion: "0.1.0",
  releaseSha,
  status: "approved_for_promotion",
  migrationRange: { first: firstMigration, last: lastMigration },
  requiredEvidence: Object.fromEntries(requiredEvidenceKeys.map((key) => [key, evidenceEntry])),
  ownerDecisions: Object.fromEntries(requiredOwnerKeys.map((key) => [key, ownerEntry])),
};

assertValid(validApproval);
assertBlocked({ ...validApproval, notes: "do not store evidence here" }, "keys");
assertBlocked({ ...validApproval, releaseSha: "b".repeat(40) }, "releaseSha");
assertBlocked({ ...validApproval, releaseSha: null }, "releaseSha");
assertBlocked({ ...validApproval, status: "not_approved" }, "status");
assertBlocked(
  {
    ...validApproval,
    requiredEvidence: {
      ...validApproval.requiredEvidence,
      isolatedStagingProof: { status: "pending", reference: null, date: null },
    },
  },
  "requiredEvidence.isolatedStagingProof",
);
assertBlocked(
  {
    ...validApproval,
    ownerDecisions: {
      ...validApproval.ownerDecisions,
      legal: { decision: "pending", reference: null, date: null },
    },
  },
  "ownerDecisions.legal",
);
assertBlocked(
  { ...validApproval, migrationRange: { first: lastMigration, last: firstMigration } },
  "migrationRange",
);
assertBlocked(
  { ...validApproval, migrationRange: { ...validApproval.migrationRange, note: "unexpected" } },
  "migrationRange.keys",
);
if (migrationFiles.length > 2) {
  assertBlocked(
    { ...validApproval, migrationRange: { first: migrationFiles[1], last: lastMigration } },
    "migrationRange",
  );
  assertBlocked(
    {
      ...validApproval,
      migrationRange: { first: firstMigration, last: migrationFiles.at(-2) },
    },
    "migrationRange",
  );
}
assertBlocked(
  {
    ...validApproval,
    requiredEvidence: { ...validApproval.requiredEvidence, unexpected: evidenceEntry },
  },
  "requiredEvidence.keys",
);
assertBlocked(
  {
    ...validApproval,
    requiredEvidence: {
      ...validApproval.requiredEvidence,
      performance: { ...evidenceEntry, details: "unexpected" },
    },
  },
  "requiredEvidence.performance",
);
assertBlocked(
  {
    ...validApproval,
    ownerDecisions: {
      ...validApproval.ownerDecisions,
      product: { ...ownerEntry, notes: "unexpected" },
    },
  },
  "ownerDecisions.product",
);

const temporaryDirectory = mkdtempSync(join(tmpdir(), "evernest-launch-approval-"));
try {
  const approvalPath = join(temporaryDirectory, "approval.json");
  writeFileSync(approvalPath, JSON.stringify(validApproval));
  const parsed = JSON.parse(readFileSync(approvalPath, "utf8"));
  assertValid(parsed);
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}

console.log("Production launch approval guard tests passed.");

function assertValid(approval) {
  const failures = validateLaunchApproval(approval, {
    expectedReleaseSha: releaseSha,
    migrationsDirectory,
    packageVersion: "0.1.0",
  });
  if (failures.length > 0) throw new Error(`expected approval to pass: ${failures.join(", ")}`);
}

function assertBlocked(approval, expectedFailure) {
  const failures = validateLaunchApproval(approval, {
    migrationsDirectory,
    packageVersion: "0.1.0",
  });
  if (!failures.includes(expectedFailure)) {
    throw new Error(`expected ${expectedFailure} to block launch approval`);
  }
}
