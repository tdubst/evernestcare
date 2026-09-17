import {
  defaultApprovalPath,
  defaultPackageVersion,
  readLaunchApproval,
  validateLaunchApproval,
} from "./production-launch-approval.mjs";

try {
  const failures = validateLaunchApproval(readLaunchApproval(defaultApprovalPath()), {
    packageVersion: defaultPackageVersion(),
  });

  if (failures.length > 0) {
    fail(`unresolved controls: ${failures.join(", ")}`);
  }

  console.log("Production launch approval verification passed.");
} catch (error) {
  fail(error instanceof Error ? error.message : "verification failed");
}

function fail(message) {
  console.error(`Production launch approval blocked: ${message}.`);
  process.exit(1);
}
