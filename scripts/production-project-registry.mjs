import { readFileSync } from "node:fs";

const projectRefPattern = /^[a-z0-9]{20}$/i;

export function loadProductionProjectRegistry() {
  const registry = JSON.parse(
    readFileSync(new URL("../config/production-project-registry.json", import.meta.url), "utf8"),
  );

  for (const key of ["stagingProjectRefs", "protectedProjectRefs", "productionProjectRefs"]) {
    if (
      !Array.isArray(registry[key]) ||
      registry[key].some((value) => typeof value !== "string" || !projectRefPattern.test(value)) ||
      new Set(registry[key]).size !== registry[key].length
    ) {
      throw new Error("production project registry is invalid");
    }
  }

  const protectedRefs = new Set([
    ...registry.protectedProjectRefs,
    ...registry.productionProjectRefs,
  ]);
  if (registry.stagingProjectRefs.some((value) => protectedRefs.has(value))) {
    throw new Error("production project registry contains overlapping trust boundaries");
  }

  return {
    stagingProjectRefs: new Set(registry.stagingProjectRefs),
    protectedProjectRefs: protectedRefs,
  };
}

export function validateStagingProjectTarget({
  expectedProjectRef,
  suppliedProtectedProjectRefs,
  registry,
}) {
  return (
    registry.stagingProjectRefs.has(expectedProjectRef) &&
    !registry.protectedProjectRefs.has(expectedProjectRef) &&
    [...registry.protectedProjectRefs].every((projectRef) =>
      suppliedProtectedProjectRefs.has(projectRef),
    ) &&
    !suppliedProtectedProjectRefs.has(expectedProjectRef)
  );
}

export function hasExactProjectConfirmation(value, action, expectedProjectRef) {
  return value === `${action} ${expectedProjectRef}`;
}
