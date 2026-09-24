import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import {
  loadProductionProjectRegistry,
  validateStagingProjectTarget,
} from "../production-project-registry.mjs";

process.on("uncaughtException", handleFatalError);
process.on("unhandledRejection", handleFatalError);

const requiredEnvironment = [
  "ACCOUNT_CLOSURE_APP_USER_ID",
  "ACCOUNT_CLOSURE_AUTH_USER_ID",
  "ACCOUNT_CLOSURE_CONFIRMATION",
  "ACCOUNT_CLOSURE_DATABASE_URL",
  "ACCOUNT_CLOSURE_EXPECTED_PROJECT_REF",
  "ACCOUNT_CLOSURE_MODE",
  "ACCOUNT_CLOSURE_PROTECTED_PROJECT_REFS",
  "ACCOUNT_CLOSURE_SUPABASE_SECRET_KEY",
  "ACCOUNT_CLOSURE_SUPABASE_URL",
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]?.trim());

if (missingEnvironment.length > 0) {
  fail(`missing required environment: ${missingEnvironment.join(", ")}`);
}

const operatorRole = "evernest_account_closure_operator";
const appUserId = process.env.ACCOUNT_CLOSURE_APP_USER_ID.trim();
const authUserId = process.env.ACCOUNT_CLOSURE_AUTH_USER_ID.trim();
const databaseUrl = process.env.ACCOUNT_CLOSURE_DATABASE_URL.trim();
const expectedProjectRef = process.env.ACCOUNT_CLOSURE_EXPECTED_PROJECT_REF.trim();
const mode = process.env.ACCOUNT_CLOSURE_MODE.trim();
const supabaseUrl = process.env.ACCOUNT_CLOSURE_SUPABASE_URL.trim();
const suppliedProtectedProjectRefs = new Set(
  process.env.ACCOUNT_CLOSURE_PROTECTED_PROJECT_REFS.split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const projectRegistry = loadProductionProjectRegistry();

if (!isUuid(appUserId) || !isUuid(authUserId)) {
  fail("application and Auth user identifiers must be UUIDs");
}
if (!new Set(["user_only", "sole_owner_team"]).has(mode)) {
  fail("closure mode must be user_only or sole_owner_team");
}
if (projectRegistry.protectedProjectRefs.has(expectedProjectRef)) {
  fail("account closure cannot target a protected or production project");
}
if (!projectRegistry.stagingProjectRefs.has(expectedProjectRef)) {
  fail("account closure target is not a registered staging project");
}
if (
  !validateStagingProjectTarget({
    expectedProjectRef,
    suppliedProtectedProjectRefs,
    registry: projectRegistry,
  })
) {
  fail("account closure protected-project list is incomplete or invalid");
}
if (process.env.ACCOUNT_CLOSURE_CONFIRMATION !== `CLOSE ${expectedProjectRef} ${appUserId}`) {
  fail("closure confirmation must bind to the staging project and application user");
}

const parsedApiUrl = parseUrl(supabaseUrl, ["https:"]);
const parsedDatabaseUrl = parseUrl(databaseUrl, ["postgres:", "postgresql:"]);
const apiProjectRef = parsedApiUrl?.hostname.split(".")[0];
const decodedDatabaseUser = parsedDatabaseUrl
  ? decodeURIComponent(parsedDatabaseUrl.username)
  : null;
const directDatabaseMatch =
  parsedDatabaseUrl?.hostname === `db.${expectedProjectRef}.supabase.co` &&
  decodedDatabaseUser === operatorRole;
const poolerDatabaseMatch =
  parsedDatabaseUrl?.hostname.endsWith(".pooler.supabase.com") === true &&
  decodedDatabaseUser === `${operatorRole}.${expectedProjectRef}`;

if (
  !parsedApiUrl ||
  !/^[a-z0-9-]+\.supabase\.co$/i.test(parsedApiUrl.hostname) ||
  apiProjectRef !== expectedProjectRef ||
  (!directDatabaseMatch && !poolerDatabaseMatch)
) {
  fail("the API and operator database URLs do not identify the registered staging project");
}
if (parsedDatabaseUrl.searchParams.get("sslmode") !== "verify-full") {
  fail("ACCOUNT_CLOSURE_DATABASE_URL must require verify-full TLS");
}

const database = postgres(databaseUrl, {
  connect_timeout: 10,
  idle_timeout: 5,
  max: 1,
  prepare: false,
  ssl: "verify-full",
});
const admin = createClient(supabaseUrl, process.env.ACCOUNT_CLOSURE_SUPABASE_SECRET_KEY.trim(), {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

try {
  const prepared = await database`
    select *
    from private.close_synthetic_staging_account(
      ${appUserId}::uuid,
      ${authUserId}::uuid,
      ${mode}::text
    )
  `;
  if (prepared.length !== 1 || prepared[0].status !== "ready_for_auth_deletion") {
    fail("application closure function did not return the required status");
  }

  if (prepared[0].auth_deletion_required) {
    const deletion = await admin.auth.admin.deleteUser(authUserId, false);
    if (deletion.error) fail("Auth account deletion failed");
  }

  const verified = await database`
    select *
    from private.verify_synthetic_staging_account_closure(
      ${appUserId}::uuid,
      ${authUserId}::uuid,
      ${mode}::text
    )
  `;
  if (verified.length !== 1 || verified[0].status !== "closed") {
    fail("closure postconditions were not satisfied");
  }

  console.log("PASS application access removed");
  console.log("PASS mutable account data closed");
  console.log("PASS Auth account deleted");
  console.log("PASS immutable event and audit exceptions retained");
  console.log(`INFO closure completed at ${new Date(verified[0].closed_at).toISOString()}`);
  console.log(`INFO retained event bucket ${verified[0].retained_event_bucket}`);
  console.log(`INFO retained audit bucket ${verified[0].retained_audit_bucket}`);
  console.log("PENDING backup expiry evidence");
} catch (error) {
  if (error?.message?.startsWith("Synthetic staging account closure blocked:")) throw error;
  fail("administrative closure failed");
} finally {
  await database.end({ timeout: 5 });
}

function parseUrl(value, protocols) {
  try {
    const parsed = new URL(value);
    return protocols.includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function fail(message) {
  throw new Error(`Synthetic staging account closure blocked: ${message}.`);
}

function handleFatalError(error) {
  const message =
    error instanceof Error && error.message.startsWith("Synthetic staging account closure blocked:")
      ? error.message
      : "Synthetic staging account closure blocked: administrative closure failed.";
  console.error(message);
  process.exit(1);
}
