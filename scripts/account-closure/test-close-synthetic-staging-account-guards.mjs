import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateStagingProjectTarget } from "../production-project-registry.mjs";

const safeEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(([name]) => !name.startsWith("ACCOUNT_CLOSURE_")),
);
const script = fileURLToPath(new URL("./close-synthetic-staging-account.mjs", import.meta.url));
const migration = fileURLToPath(
  new URL(
    "../../supabase/migrations/20260917193454_production_account_closure_boundary.sql",
    import.meta.url,
  ),
);
const environmentMigration = fileURLToPath(
  new URL(
    "../../supabase/migrations/20260923213812_production_environment_sentinel.sql",
    import.meta.url,
  ),
);
const functionAclMigration = fileURLToPath(
  new URL(
    "../../supabase/migrations/20260923215029_production_function_acl_lockdown.sql",
    import.meta.url,
  ),
);
const protectedRef = "ncbzkjwwvfguivrkgvus";
const unregisteredRef = "abcdefghijklmnopqrst";
const productionRef = "zyxwvutsrqponmlkjihg";
const appUserId = "00000000-0000-4000-8000-000000000001";
const authUserId = "00000000-0000-4000-8000-000000000002";

assertBlocked({}, "missing required environment");
assertBlocked(fixtureEnvironment(), "not a registered staging project");
assertBlocked(
  fixtureEnvironment({ expectedRef: protectedRef, databaseRef: protectedRef }),
  "protected or production project",
);

const syntheticRegistry = {
  stagingProjectRefs: new Set([unregisteredRef]),
  protectedProjectRefs: new Set([protectedRef, productionRef]),
};
assert(
  validateStagingProjectTarget({
    expectedProjectRef: unregisteredRef,
    suppliedProtectedProjectRefs: new Set([protectedRef, productionRef]),
    registry: syntheticRegistry,
  }),
  "registered staging target with all protected refs should pass",
);
assert(
  !validateStagingProjectTarget({
    expectedProjectRef: unregisteredRef,
    suppliedProtectedProjectRefs: new Set([protectedRef]),
    registry: syntheticRegistry,
  }),
  "missing production ref should fail",
);
assert(
  !validateStagingProjectTarget({
    expectedProjectRef: productionRef,
    suppliedProtectedProjectRefs: new Set([protectedRef, productionRef]),
    registry: syntheticRegistry,
  }),
  "production target should fail",
);

const scriptSource = readFileSync(script, "utf8");
const migrationSource = readFileSync(migration, "utf8").toLowerCase();
const environmentMigrationSource = readFileSync(environmentMigration, "utf8").toLowerCase();
const functionAclMigrationSource = readFileSync(functionAclMigration, "utf8").toLowerCase();

for (const requiredControl of [
  'from "../production-project-registry.mjs"',
  "loadProductionProjectRegistry",
  "validateStagingProjectTarget",
  'const operatorRole = "evernest_account_closure_operator"',
  'searchParams.get("sslmode") !== "verify-full"',
  'ssl: "verify-full"',
  "private.close_synthetic_staging_account",
  "private.verify_synthetic_staging_account_closure",
  "admin.auth.admin.deleteUser(authUserId, false)",
  "PENDING backup expiry evidence",
]) {
  assertSourceContains(scriptSource, requiredControl);
}

for (const forbiddenDirectDatabaseAccess of [
  "delete from public.",
  "update public.",
  "insert into private.account_closure_receipts",
  "from public.users",
  "from auth.users",
  "from storage.objects",
]) {
  assert(
    !scriptSource.toLowerCase().includes(forbiddenDirectDatabaseAccess),
    `executor contains forbidden direct database access: ${forbiddenDirectDatabaseAccess}`,
  );
}

for (const requiredBoundary of [
  "alter column auth_user_id drop not null",
  "on delete set null",
  "users_closed_auth_boundary_check",
  "create role evernest_account_closure_operator",
  "nosuperuser",
  "nocreatedb",
  "nocreaterole",
  "noreplication",
  "nobypassrls",
  "noinherit",
  "password null",
  "rolsuper or rolreplication or rolbypassrls",
  "has elevated attributes that require platform administrator remediation",
  "security definer",
  "set search_path = ''",
  "set row_security = off",
  "session_user <> 'evernest_account_closure_operator'",
  "has_table_privilege(",
  "has_any_column_privilege(",
  "has_sequence_privilege(",
  "has_function_privilege(",
  "current_setting('app.environment', true)",
  "production-staging-v1",
  "ownership transfer is required",
  "storage.objects",
  "account closure is blocked by non-placeholder documents",
  "account closure cannot orphan a workspace without an active owner",
  "private.account_closure_authorizations",
  "requester_auth_user_id <> approver_auth_user_id",
  "auth.mfa_factors",
  "evernest_operator_role",
  "requester.banned_until is null",
  "approver.banned_until is null",
  "legal_hold_status <> 'clear'",
  "expires_at <= pg_catalog.now()",
  "consumed_at is not null",
  "private.account_closure_receipts",
  "revoke all on all tables in schema public from evernest_account_closure_operator",
  "revoke all on all sequences in schema public from evernest_account_closure_operator",
  "revoke all on all functions in schema public from evernest_account_closure_operator",
  "grant usage on schema private to evernest_account_closure_operator",
  "grant execute on function private.close_synthetic_staging_account(uuid, uuid, text)",
  "grant execute on function private.verify_synthetic_staging_account_closure(uuid, uuid, text)",
]) {
  assertSourceContains(migrationSource, requiredBoundary);
}

for (const requiredEnvironmentBoundary of [
  "create table if not exists private.environment_sentinel",
  "environment in ('staging', 'production')",
  "revoke all on table private.environment_sentinel from service_role",
  "create or replace function private.environment_is_staging()",
  "security invoker",
  "revoke all on function private.environment_is_staging() from evernest_account_closure_operator",
  "private.close_synthetic_staging_account(uuid,uuid,text)",
  "private.verify_synthetic_staging_account_closure(uuid,uuid,text)",
  "not private.environment_is_staging()",
]) {
  assertSourceContains(environmentMigrationSource, requiredEnvironmentBoundary);
}

for (const requiredRoleMembershipBoundary of [
  "pg_catalog.pg_auth_members",
  "member_role.rolname = 'postgres'",
  "grantor_role.rolname = 'supabase_admin'",
  "and not memberships.inherit_option",
  "and not memberships.set_option",
  "pg_catalog.acldefault(''d'', databases.datdba)",
  "pg_catalog.acldefault(''n'', namespaces.nspowner)",
  "evernest_account_closure_operator posture remains invalid",
]) {
  assertSourceContains(functionAclMigrationSource, requiredRoleMembershipBoundary);
}

const managedRoleAlteration = migrationSource.match(
  /alter role evernest_account_closure_operator[\s\S]*?password null;/,
)?.[0];
assert(managedRoleAlteration, "managed role alteration is missing");
for (const platformAdminOnlyAttribute of ["nosuperuser", "noreplication", "nobypassrls"]) {
  assert(
    !managedRoleAlteration.includes(platformAdminOnlyAttribute),
    `managed role alteration must not request ${platformAdminOnlyAttribute}`,
  );
}

assert(
  !migrationSource.includes(
    "grant execute on function private.account_closure_operator_posture_is_valid()\n  to evernest_account_closure_operator",
  ),
  "operator must not execute the posture helper directly",
);
assert(
  !migrationSource.includes("revoke temporary on database"),
  "closure migration must not change PUBLIC database privileges",
);

console.log("Synthetic staging account closure guard tests passed.");

function fixtureEnvironment({
  expectedRef = unregisteredRef,
  databaseRef = unregisteredRef,
  confirmation = `CLOSE ${unregisteredRef} ${appUserId}`,
  mode = "user_only",
} = {}) {
  return {
    ACCOUNT_CLOSURE_APP_USER_ID: appUserId,
    ACCOUNT_CLOSURE_AUTH_USER_ID: authUserId,
    ACCOUNT_CLOSURE_CONFIRMATION: confirmation,
    ACCOUNT_CLOSURE_DATABASE_URL: `postgresql://evernest_account_closure_operator:unused@db.${databaseRef}.supabase.co/postgres?sslmode=verify-full`,
    ACCOUNT_CLOSURE_EXPECTED_PROJECT_REF: expectedRef,
    ACCOUNT_CLOSURE_MODE: mode,
    ACCOUNT_CLOSURE_PROTECTED_PROJECT_REFS: `${protectedRef},${productionRef}`,
    ACCOUNT_CLOSURE_SUPABASE_SECRET_KEY: "unused",
    ACCOUNT_CLOSURE_SUPABASE_URL: `https://${expectedRef}.supabase.co`,
  };
}

function assertBlocked(environment, expectedMessage) {
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: { ...safeEnvironment, ...environment },
    timeout: 5_000,
  });
  const output = `${result.stdout}${result.stderr}`;
  assert(result.status === 1 && output.includes(expectedMessage), expectedMessage);
}

function assertSourceContains(source, expected) {
  assert(source.includes(expected), `missing safeguard: ${expected}`);
}

function assert(condition, message) {
  if (!condition)
    throw new Error(`Synthetic staging account closure guard test failed: ${message}`);
}
