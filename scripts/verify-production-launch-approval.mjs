import { execFileSync } from "node:child_process";
import {
  defaultApprovalPath,
  defaultPackageVersion,
  readLaunchApproval,
  validateApprovalCommitBoundary,
  validateLaunchApproval,
} from "./production-launch-approval.mjs";

try {
  const approval = readLaunchApproval(defaultApprovalPath());
  const releaseSha = process.env.PRODUCTION_RELEASE_SHA;
  const failures = validateLaunchApproval(approval, {
    expectedReleaseSha: releaseSha,
    packageVersion: defaultPackageVersion(),
  });
  failures.push(...approvalCommitBoundaryFailures(approval, releaseSha));

  if (failures.length > 0) {
    fail(`unresolved controls: ${failures.join(", ")}`);
  }

  console.log("Production launch approval verification passed.");
} catch (error) {
  fail(error instanceof Error ? error.message : "verification failed");
}

function approvalCommitBoundaryFailures(approval, releaseSha) {
  const candidateSha = approval?.approvedCandidateSha;
  const fullShaPattern = /^[0-9a-f]{40}$/;
  if (!fullShaPattern.test(candidateSha ?? "") || !fullShaPattern.test(releaseSha ?? "")) {
    return ["approvalCommitBoundary"];
  }

  let candidateIsAncestor = false;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", candidateSha, releaseSha], {
      stdio: "ignore",
    });
    candidateIsAncestor = true;
  } catch {
    candidateIsAncestor = false;
  }

  let changedPaths = [];
  try {
    changedPaths = execFileSync(
      "git",
      ["diff", "--name-only", `${candidateSha}..${releaseSha}`, "--"],
      {
        encoding: "utf8",
      },
    )
      .split("\n")
      .filter(Boolean);
  } catch {
    return ["approvalCommitBoundary"];
  }

  return validateApprovalCommitBoundary(approval, {
    candidateIsAncestor,
    changedPaths,
    releaseSha,
  });
}

function fail(message) {
  console.error(`Production launch approval blocked: ${message}.`);
  process.exit(1);
}
