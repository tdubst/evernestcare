import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  requiredEvidenceKeys,
  requiredOwnerKeys,
  validateApprovalCommitBoundary,
  validateLaunchApproval,
} from "./production-launch-approval.mjs";

const migrationsDirectory = fileURLToPath(new URL("../supabase/migrations", import.meta.url));
const verifierPath = fileURLToPath(
  new URL("./verify-production-launch-approval.mjs", import.meta.url),
);
const migrationFiles = readdirSync(migrationsDirectory).sort();
const firstMigration = migrationFiles.find((name) => /^\d{14}_.+\.sql$/.test(name));
const lastMigration = migrationFiles.findLast((name) => /^\d{14}_.+\.sql$/.test(name));
const candidateSha = "a".repeat(40);
const releaseSha = "b".repeat(40);
const evidenceEntry = {
  status: "pass",
  reference: "restricted:evidence/example",
  date: "2026-09-17",
};
const ownerEntry = { decision: "go", reference: "restricted:approval/example", date: "2026-09-17" };
const validApproval = {
  schemaVersion: 1,
  releaseVersion: "0.1.0",
  approvedCandidateSha: candidateSha,
  status: "approved_for_promotion",
  migrationRange: { first: firstMigration, last: lastMigration },
  requiredEvidence: Object.fromEntries(requiredEvidenceKeys.map((key) => [key, evidenceEntry])),
  ownerDecisions: Object.fromEntries(requiredOwnerKeys.map((key) => [key, ownerEntry])),
};

assertValid(validApproval);
assertBlocked({ ...validApproval, notes: "do not store evidence here" }, "keys");
assertBlocked({ ...validApproval, approvedCandidateSha: null }, "approvedCandidateSha");
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
assertBoundaryValid(validApproval, {
  candidateIsAncestor: true,
  changedPaths: [
    "config/production-launch-approval.json",
    "docs/architecture/production-launch-packet.md",
  ],
  releaseSha,
});
assertBoundaryBlocked(
  validApproval,
  {
    candidateIsAncestor: false,
    changedPaths: ["config/production-launch-approval.json"],
    releaseSha,
  },
  "non-ancestor candidate",
);
assertBoundaryBlocked(
  validApproval,
  {
    candidateIsAncestor: true,
    changedPaths: ["config/production-launch-approval.json", "src/routes/index.tsx"],
    releaseSha,
  },
  "runtime changes after approval",
);
assertBoundaryBlocked(
  validApproval,
  {
    candidateIsAncestor: true,
    changedPaths: ["docs/architecture/production-launch-packet.md"],
    releaseSha,
  },
  "missing approval record change",
);
assertBoundaryBlocked(
  validApproval,
  {
    candidateIsAncestor: true,
    changedPaths: ["config/production-launch-approval.json"],
    releaseSha: candidateSha,
  },
  "self-referential release SHA",
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

const repositoryDirectory = mkdtempSync(join(tmpdir(), "evernest-launch-approval-git-"));
try {
  mkdirSync(join(repositoryDirectory, "config"), { recursive: true });
  mkdirSync(join(repositoryDirectory, "supabase", "migrations"), { recursive: true });
  writeFileSync(join(repositoryDirectory, "supabase", "migrations", firstMigration), "-- first\n");
  writeFileSync(join(repositoryDirectory, "supabase", "migrations", lastMigration), "-- last\n");
  writeFileSync(
    join(repositoryDirectory, "config", "production-launch-approval.json"),
    JSON.stringify({ ...validApproval, approvedCandidateSha: null }),
  );
  runGit(repositoryDirectory, ["init"]);
  runGit(repositoryDirectory, ["add", "."]);
  runGit(repositoryDirectory, ["commit", "-m", "candidate"]);
  const approvedCandidateSha = runGit(repositoryDirectory, ["rev-parse", "HEAD"]).trim();

  writeFileSync(
    join(repositoryDirectory, "config", "production-launch-approval.json"),
    JSON.stringify({ ...validApproval, approvedCandidateSha }),
  );
  runGit(repositoryDirectory, ["add", "config/production-launch-approval.json"]);
  runGit(repositoryDirectory, ["commit", "-m", "approval"]);
  const approvedReleaseSha = runGit(repositoryDirectory, ["rev-parse", "HEAD"]).trim();
  runVerifier(repositoryDirectory, approvedReleaseSha);

  mkdirSync(join(repositoryDirectory, "src"), { recursive: true });
  writeFileSync(join(repositoryDirectory, "src", "runtime.ts"), "export const changed = true;\n");
  runGit(repositoryDirectory, ["add", "src/runtime.ts"]);
  runGit(repositoryDirectory, ["commit", "-m", "runtime change"]);
  const changedReleaseSha = runGit(repositoryDirectory, ["rev-parse", "HEAD"]).trim();
  assertVerifierBlocked(repositoryDirectory, changedReleaseSha);
} finally {
  rmSync(repositoryDirectory, { force: true, recursive: true });
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

function assertBoundaryValid(approval, options) {
  const failures = validateApprovalCommitBoundary(approval, options);
  if (failures.length > 0) {
    throw new Error(`expected approval commit boundary to pass: ${failures.join(", ")}`);
  }
}

function assertBoundaryBlocked(approval, options, scenario) {
  const failures = validateApprovalCommitBoundary(approval, options);
  if (!failures.includes("approvalCommitBoundary")) {
    throw new Error(`expected approval commit boundary to block ${scenario}`);
  }
}

function runGit(cwd, args) {
  return execFileSync(
    "git",
    ["-c", "user.name=Evernest Release Guard", "-c", "user.email=release@example.invalid", ...args],
    { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
}

function runVerifier(cwd, releaseShaValue) {
  execFileSync(process.execPath, [verifierPath], {
    cwd,
    env: {
      ...process.env,
      PRODUCTION_LAUNCH_APPROVAL_PATH: join(cwd, "config", "production-launch-approval.json"),
      PRODUCTION_RELEASE_SHA: releaseShaValue,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertVerifierBlocked(cwd, releaseShaValue) {
  try {
    runVerifier(cwd, releaseShaValue);
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    if (output.includes("approvalCommitBoundary")) return;
    throw new Error(`expected runtime change to fail the approval boundary, received: ${output}`);
  }
  throw new Error("expected runtime change to fail the approval boundary");
}
