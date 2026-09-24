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
const functionAclLockdownMigration = await readFile(
  new URL(
    "../supabase/migrations/20260923215029_production_function_acl_lockdown.sql",
    import.meta.url,
  ),
  "utf8",
);
const productionScopeApiLockdownMigration = await readFile(
  new URL(
    "../supabase/migrations/20260923220240_production_scope_api_lockdown.sql",
    import.meta.url,
  ),
  "utf8",
);
const policyAndIndexHardeningMigration = await readFile(
  new URL(
    "../supabase/migrations/20260923220633_production_policy_and_fk_index_hardening.sql",
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
const requiredFunctionAclPosture = [
  "revoke all on all functions in schema public from public",
  "revoke all on all functions in schema public from anon",
  "revoke all on all functions in schema public from authenticated",
  "reviewed_authenticated_signatures",
  "anon can execute public function",
  "authenticated function allowlist mismatch",
  "security-definer function has mutable search_path",
  "member_role.rolname = 'postgres'",
  "grantor_role.rolname = 'supabase_admin'",
  "and not memberships.inherit_option",
  "and not memberships.set_option",
  "pg_catalog.acldefault(''d'', databases.datdba)",
  "pg_catalog.acldefault(''n'', namespaces.nspowner)",
  "evernest_account_closure_operator posture remains invalid",
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

for (const expected of requiredFunctionAclPosture) {
  if (!functionAclLockdownMigration.includes(expected)) {
    throw new Error(`Production function ACL posture is missing: ${expected}`);
  }
}

if (/grant execute[\s\S]*?\bto\s+anon\b/i.test(functionAclLockdownMigration)) {
  throw new Error("Production function ACL posture must not grant function execution to anon.");
}

for (const expected of [
  "alter default privileges for role postgres",
  "revoke select on all tables in schema public from anon",
  "public.accept_care_circle_invitation(jsonb)",
  "public.preview_care_circle_invitation(jsonb)",
  "from public, anon, authenticated, service_role",
  "drop policy if exists appointments_write_permitted",
  "drop policy if exists documents_write_permitted",
  "production function allowlist mismatch",
  "anon can select public relation",
]) {
  if (!productionScopeApiLockdownMigration.includes(expected)) {
    throw new Error(`Production scope API posture is missing: ${expected}`);
  }
}

for (const expected of [
  "drop policy if exists users_insert_self",
  "drop policy if exists permission_grants_update_admins",
  "for select to authenticated",
  "using ((select auth.uid()) = auth_user_id)",
  "direct-write RLS policy remains in production posture",
  "public foreign key remains without a covering index",
  "appointments_care_team_id_idx",
  "tasks_created_by_idx",
]) {
  if (!policyAndIndexHardeningMigration.includes(expected)) {
    throw new Error(`Production policy/index posture is missing: ${expected}`);
  }
}

console.log("Production SQL posture checks passed.");
