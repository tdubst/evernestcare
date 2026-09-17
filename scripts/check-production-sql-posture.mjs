import { readFile } from "node:fs/promises";

const auditMigration = await readFile(
  new URL(
    "../supabase/migrations/20260915165351_production_audit_helper_lockdown.sql",
    import.meta.url,
  ),
  "utf8",
);
const publicLockdownMigration = await readFile(
  new URL(
    "../supabase/migrations/20260915172849_production_public_dml_lockdown.sql",
    import.meta.url,
  ),
  "utf8",
);
const schemaUsageLockdownMigration = await readFile(
  new URL(
    "../supabase/migrations/20260915190000_production_public_schema_usage_lockdown.sql",
    import.meta.url,
  ),
  "utf8",
);

const requiredAuditPosture = [
  "write_audit_event",
  "from public, anon, authenticated",
  "public.care_events",
];
const requiredProductionPosture = [
  "ensure_care_boundary",
  "create_care_circle_invitation",
  "team_has_no_members",
  "from public, anon, authenticated",
  "public.care_events",
];
const requiredSchemaUsagePosture = [
  "revoke usage on schema public from public",
  "grant usage on schema public to anon",
  "grant usage on schema public to authenticated",
  "grant usage on schema public to service_role",
];

for (const expected of requiredAuditPosture) {
  if (!auditMigration.includes(expected)) {
    throw new Error(`Production audit posture is missing: ${expected}`);
  }
}

for (const expected of requiredProductionPosture) {
  if (!publicLockdownMigration.includes(expected)) {
    throw new Error(`Production SQL posture is missing: ${expected}`);
  }
}

for (const expected of requiredSchemaUsagePosture) {
  if (!schemaUsageLockdownMigration.includes(expected)) {
    throw new Error(`Production schema usage posture is missing: ${expected}`);
  }
}

console.log("Production SQL posture checks passed.");
