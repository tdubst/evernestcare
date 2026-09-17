import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import {
  hasExactProjectConfirmation,
  loadProductionProjectRegistry,
  validateStagingProjectTarget,
} from "./production-project-registry.mjs";
import { isFullGitSha, releaseProofIdForSha } from "./production-release-proof.mjs";

const requiredEnvironment = [
  "STAGING_EXPECTED_PROJECT_REF",
  "STAGING_PROTECTED_PROJECT_REFS",
  "STAGING_RELEASE_SHA",
  "STAGING_VERIFIER_DATABASE_URL",
  "STAGING_SENTINEL_EVENT_ID",
  "STAGING_SUPABASE_URL",
  "STAGING_SUPABASE_PUBLISHABLE_KEY",
  "STAGING_OWNER_EMAIL",
  "STAGING_OWNER_PASSWORD",
  "STAGING_REVOKED_EMAIL",
  "STAGING_REVOKED_PASSWORD",
  "STAGING_VERIFY_CONFIRMATION",
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]?.trim());

if (missingEnvironment.length > 0) {
  fail(`missing required environment: ${missingEnvironment.join(", ")}`);
}

const stagingUrl = process.env.STAGING_SUPABASE_URL.trim();
const stagingDatabaseUrl = process.env.STAGING_VERIFIER_DATABASE_URL.trim();
const parsedStagingUrl = parseUrl(stagingUrl, ["https:"]);
const projectRef = parsedStagingUrl?.hostname.split(".")[0];
const verifierRole = "evernest_staging_verifier";
const expectedProjectRef = process.env.STAGING_EXPECTED_PROJECT_REF.trim();
const projectRegistry = loadProductionProjectRegistry();
const protectedProjectRefs = new Set(
  process.env.STAGING_PROTECTED_PROJECT_REFS.split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

if (!parsedStagingUrl || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsedStagingUrl.hostname)) {
  fail("STAGING_SUPABASE_URL must be an HTTPS Supabase project URL");
}

const parsedDatabaseUrl = parseDatabaseUrl(stagingDatabaseUrl);
if (parsedDatabaseUrl?.searchParams.get("sslmode") !== "verify-full") {
  fail("STAGING_VERIFIER_DATABASE_URL must require verify-full TLS");
}
const directDatabaseMatch = parsedDatabaseUrl?.hostname === `db.${projectRef}.supabase.co`;
const poolerDatabaseMatch =
  parsedDatabaseUrl?.hostname.endsWith(".pooler.supabase.com") === true &&
  decodeURIComponent(parsedDatabaseUrl.username) === `${verifierRole}.${projectRef}`;
const verifierRoleMatch = directDatabaseMatch
  ? decodeURIComponent(parsedDatabaseUrl?.username ?? "") === verifierRole
  : poolerDatabaseMatch;

if (
  !/^[a-z0-9]{20}$/i.test(expectedProjectRef) ||
  projectRef !== expectedProjectRef ||
  !verifierRoleMatch
) {
  fail("the staging API and database URLs do not identify the same project");
}

if (
  !validateStagingProjectTarget({
    expectedProjectRef,
    suppliedProtectedProjectRefs: protectedProjectRefs,
    registry: projectRegistry,
  })
) {
  fail("the expected staging project must match the reviewed project registry");
}

if (
  !hasExactProjectConfirmation(
    process.env.STAGING_VERIFY_CONFIRMATION,
    "VERIFY",
    expectedProjectRef,
  )
) {
  fail("STAGING_VERIFY_CONFIRMATION must bind to the expected staging project reference");
}

if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    process.env.STAGING_SENTINEL_EVENT_ID,
  )
) {
  fail("STAGING_SENTINEL_EVENT_ID must be a UUID");
}

const releaseSha = process.env.STAGING_RELEASE_SHA.trim().toLowerCase();
if (!isFullGitSha(releaseSha)) {
  fail("STAGING_RELEASE_SHA must be a full Git commit SHA");
}
const releaseProofId = releaseProofIdForSha(releaseSha);

const productTables = [
  "users",
  "care_recipients",
  "care_teams",
  "roles",
  "care_team_members",
  "permission_grants",
  "invitations",
  "appointments",
  "medications",
  "tasks",
  "conversations",
  "conversation_participants",
  "messages",
  "documents",
  "imaging_studies",
  "notifications",
  "audit_events",
  "care_events",
];
const zeroUuid = "00000000-0000-0000-0000-000000000000";
const database = postgres(stagingDatabaseUrl, {
  connect_timeout: 10,
  idle_timeout: 5,
  max: 1,
  prepare: false,
  ssl: "verify-full",
});
const client = createClient(stagingUrl, process.env.STAGING_SUPABASE_PUBLISHABLE_KEY.trim(), {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
  global: { fetch: stagingFetch },
});

let failures = 0;
let ownerHydration = null;
let revokedAuthUserId = zeroUuid;
const initialDatabaseState = await inspectDatabase(revokedAuthUserId);

check(initialDatabaseState?.environment === "staging", "server-side staging sentinel");
check(initialDatabaseState?.verifier_least_privilege === true, "least-privilege verifier role");
check(initialDatabaseState?.acl_locked === true, "database mutation privileges locked");
check(initialDatabaseState?.sentinel_ready === true, "sentinel care event provisioned");
if (failures > 0) {
  await database.end({ timeout: 5 });
  finish();
}

try {
  const signIn = await execute(
    client.auth.signInWithPassword({
      email: process.env.STAGING_OWNER_EMAIL.trim(),
      password: process.env.STAGING_OWNER_PASSWORD,
    }),
  );

  check(!signIn.error && Boolean(signIn.data?.session), "owner sign-in");
  if (signIn.error || !signIn.data?.session) finish();

  const userCheck = await execute(client.auth.getUser());
  check(!userCheck.error && Boolean(userCheck.data?.user), "server user validation");

  ownerHydration = await hydrateBoundary();
  check(ownerHydration !== null, "read-only workspace hydration");
  if (!ownerHydration) finish();

  await expectRpcDenied("ensure_care_boundary", {
    p_recipient_display_name: null,
    p_relationship_context: null,
    p_requested_care_recipient_id: null,
  });
  await expectRpcDenied("create_care_circle_invitation", { p_request: {} });
  await expectRpcDenied("team_has_no_members", { p_care_team_id: zeroUuid });
  await expectRpcDenied("write_audit_event", {
    p_action: "staging_denial_probe",
    p_actor_user_id: null,
    p_care_recipient_id: null,
    p_care_team_id: null,
    p_metadata: {},
    p_resource_id: null,
    p_resource_type: "staging_probe",
    p_target_user_id: null,
  });

  const careCircle = await execute(
    client.rpc("get_care_circle_summary", { p_request: {} }).maybeSingle(),
  );
  check(!careCircle.error && careCircle.data?.status === "ready", "Care Circle projection");

  const vault = await execute(
    client.rpc("get_vault_artifact_summary", { p_request: {} }).maybeSingle(),
  );
  check(
    !vault.error && ["empty", "ready"].includes(vault.data?.status),
    "Vault placeholder projection",
  );

  const sentinelRead = await execute(
    client
      .from("care_events")
      .select("id")
      .eq("id", process.env.STAGING_SENTINEL_EVENT_ID)
      .eq("care_team_id", ownerHydration.active_care_team_id)
      .eq("care_recipient_id", ownerHydration.active_care_recipient_id)
      .maybeSingle(),
  );
  check(
    !sentinelRead.error && sentinelRead.data?.id === process.env.STAGING_SENTINEL_EVENT_ID,
    "authorized sentinel care event read",
  );

  const noteClientEventId = `staging-note-${releaseProofId}`;
  const existingNote = await execute(
    client
      .from("care_events")
      .select("id,occurred_at")
      .eq("care_team_id", ownerHydration.active_care_team_id)
      .eq("client_event_id", noteClientEventId)
      .maybeSingle(),
  );
  check(!existingNote.error, "durable care note baseline");
  const noteOccurredAt = existingNote.data?.occurred_at ?? new Date().toISOString();
  const noteWrite = await execute(
    client
      .rpc("append_care_event", {
        p_care_recipient_id: ownerHydration.active_care_recipient_id,
        p_care_team_id: ownerHydration.active_care_team_id,
        p_causation_id: null,
        p_client_event_id: noteClientEventId,
        p_correlation_id: noteClientEventId,
        p_event_source: "manual",
        p_event_type: "CareNoteAddedEvent",
        p_occurred_at: noteOccurredAt,
        p_operational_context: "caregiver-note",
        p_payload: { note: "Staging continuity check", noteType: "caregiver-context" },
        p_schema_version: 1,
      })
      .maybeSingle(),
  );
  check(
    !noteWrite.error &&
      ["inserted", "duplicate"].includes(noteWrite.data?.status) &&
      noteWrite.data?.read_back === true,
    "durable care note create and read-back",
  );

  const noteEventId = noteWrite.data?.care_event_id;
  const noteRead = await readCareNote(noteEventId, ownerHydration);
  check(noteRead, "durable care note projection read");

  await execute(client.auth.signOut());
  const reloadSignIn = await signIn(
    process.env.STAGING_OWNER_EMAIL,
    process.env.STAGING_OWNER_PASSWORD,
  );
  check(reloadSignIn, "owner reload sign-in");
  const reloadHydration = reloadSignIn ? await hydrateBoundary() : null;
  check(
    reloadHydration !== null && sameBoundary(ownerHydration, reloadHydration),
    "workspace reload hydration",
  );
  check(
    reloadHydration !== null && (await readCareNote(noteEventId, reloadHydration)),
    "durable care note reload",
  );

  for (const table of productTables) {
    await expectDirectWriteDenied(table, "insert", client.from(table).insert({}));
    await expectDirectWriteDenied(
      table,
      "update",
      client.from(table).update({}).eq("id", zeroUuid),
    );
    await expectDirectWriteDenied(table, "delete", client.from(table).delete().eq("id", zeroUuid));
  }

  const finalHydration = await hydrateBoundary();
  check(
    finalHydration !== null && sameBoundary(ownerHydration, finalHydration),
    "workspace boundary remained stable",
  );
} finally {
  await execute(client.auth.signOut());
}

const revokedSignIn = await signIn(
  process.env.STAGING_REVOKED_EMAIL,
  process.env.STAGING_REVOKED_PASSWORD,
);
check(revokedSignIn, "revoked user sign-in");
if (revokedSignIn) {
  const revokedUserCheck = await execute(client.auth.getUser());
  revokedAuthUserId = revokedUserCheck.data?.user?.id ?? zeroUuid;
  check(
    !revokedUserCheck.error && revokedAuthUserId !== zeroUuid,
    "revoked user server validation",
  );
  const revokedFixtureState = await inspectDatabase(revokedAuthUserId);
  check(
    revokedFixtureState?.revoked_fixture_ready === true,
    "revoked membership fixture provisioned",
  );
  const revokedHydration = await execute(client.rpc("hydrate_permission_context").maybeSingle());
  check(
    !revokedHydration.error && revokedHydration.data?.status === "boundary_unavailable",
    "revoked user workspace denied",
  );
  const revokedSentinelRead = await execute(
    client.from("care_events").select("id").eq("id", process.env.STAGING_SENTINEL_EVENT_ID),
  );
  check(
    !revokedSentinelRead.error && revokedSentinelRead.data?.length === 0,
    "revoked user sentinel event hidden",
  );
  const revokedAppend = await execute(
    client.rpc("append_care_event", {
      p_care_recipient_id: ownerHydration.active_care_recipient_id,
      p_care_team_id: ownerHydration.active_care_team_id,
      p_causation_id: null,
      p_client_event_id: "staging-revoked-denial",
      p_correlation_id: "staging-revoked-denial",
      p_event_source: "manual",
      p_event_type: "CareNoteAddedEvent",
      p_occurred_at: new Date().toISOString(),
      p_operational_context: "caregiver-note",
      p_payload: { note: "Staging denial check", noteType: "caregiver-context" },
      p_schema_version: 1,
    }),
  );
  check(
    !revokedAppend.error && revokedAppend.data?.[0]?.status === "permission_denied",
    "revoked user approved mutation denied",
  );
}
await execute(client.auth.signOut());

const finalDatabaseState = await inspectDatabase(revokedAuthUserId);
check(finalDatabaseState?.environment === "staging", "staging sentinel remained active");
check(finalDatabaseState?.acl_locked === true, "database privileges remained locked");
check(Number(finalDatabaseState?.durable_note_count) === 1, "durable care note remained singular");
check(
  initialDatabaseState?.boundary_fingerprint === finalDatabaseState?.boundary_fingerprint,
  "workspace records remained unchanged",
);
check(finalDatabaseState?.sentinel_ready === true, "sentinel care event remained intact");

await database.end({ timeout: 5 });
finish();

async function hydrateBoundary() {
  const result = await execute(client.rpc("hydrate_permission_context").maybeSingle());
  const row = result.data;

  if (
    result.error ||
    row?.status !== "ready" ||
    !row.app_user_id ||
    !row.active_care_team_id ||
    !row.active_care_recipient_id ||
    !row.membership_id ||
    !row.permission_version ||
    row.membership_status !== "active" ||
    row.role_key !== "owner"
  ) {
    return null;
  }

  return row;
}

async function readCareNote(eventId, boundary) {
  if (!eventId || !boundary) return false;

  const result = await execute(
    client
      .from("care_events")
      .select("id,event_type,payload")
      .eq("id", eventId)
      .eq("care_team_id", boundary.active_care_team_id)
      .eq("care_recipient_id", boundary.active_care_recipient_id)
      .maybeSingle(),
  );

  return (
    !result.error &&
    result.data?.id === eventId &&
    result.data?.event_type === "CareNoteAddedEvent" &&
    result.data?.payload?.note === "Staging continuity check" &&
    result.data?.payload?.noteType === "caregiver-context"
  );
}

async function signIn(email, password) {
  const result = await execute(
    client.auth.signInWithPassword({
      email: email.trim(),
      password,
    }),
  );
  return !result.error && Boolean(result.data?.session);
}

async function expectRpcDenied(name, args) {
  const result = await execute(client.rpc(name, args));
  check(isPrivilegeDenied(result), `${name} execution denied`);
}

async function expectDirectWriteDenied(table, operation, query) {
  const result = await execute(query);
  check(isPrivilegeDenied(result), `${table} direct ${operation} denied`);
}

async function inspectDatabase(revokedUserId) {
  try {
    const roleRows = await database.unsafe(verifierRoleInspectionSql());
    const rows = await database.unsafe(
      "select * from staging_verification.production_staging_inspect($1::uuid, $2::uuid, $3::uuid)",
      [process.env.STAGING_SENTINEL_EVENT_ID, revokedUserId, releaseProofId],
    );
    return rows[0]
      ? { ...rows[0], verifier_least_privilege: roleRows[0]?.verifier_least_privilege === true }
      : null;
  } catch {
    return null;
  }
}

function verifierRoleInspectionSql() {
  return `
with table_privileges(privilege_name) as (values
  ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
),
sequence_privileges(privilege_name) as (values ('SELECT'), ('UPDATE'), ('USAGE'))
select
  current_user = '${verifierRole}'
    and not coalesce((
      select rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls or rolinherit
      from pg_roles
      where rolname = current_user
    ), true)
    and has_schema_privilege(current_user, 'staging_verification', 'USAGE')
    and not has_schema_privilege(current_user, 'staging_verification', 'CREATE')
    and has_function_privilege(
      current_user,
      'staging_verification.production_staging_inspect(uuid,uuid,uuid)',
      'EXECUTE'
    )
    and not exists (
      select 1
      from pg_auth_members
      where member = (select oid from pg_roles where rolname = current_user)
    )
    and not exists (
      select 1
      from pg_namespace n
      where n.nspname <> 'staging_verification'
        and n.nspname <> 'information_schema'
        and n.nspname !~ '^pg_'
        and has_schema_privilege(current_user, n.oid, 'USAGE')
    )
    and not exists (
      select 1
      from pg_namespace n
      where n.nspname <> 'information_schema'
        and n.nspname !~ '^pg_'
        and has_schema_privilege(current_user, n.oid, 'CREATE')
    )
    and has_database_privilege(current_user, current_database(), 'CONNECT')
    and not has_database_privilege(current_user, current_database(), 'CREATE')
    and has_database_privilege(current_user, current_database(), 'TEMPORARY')
    and not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join table_privileges
      where n.nspname <> 'information_schema'
        and n.nspname !~ '^pg_'
        and c.relkind in ('r', 'p', 'v', 'm', 'f')
        and has_schema_privilege(current_user, n.oid, 'USAGE')
        and has_table_privilege(current_user, c.oid, privilege_name)
    )
    and not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join sequence_privileges
      where n.nspname <> 'information_schema'
        and n.nspname !~ '^pg_'
        and c.relkind = 'S'
        and has_schema_privilege(current_user, n.oid, 'USAGE')
        and has_sequence_privilege(current_user, c.oid, privilege_name)
    )
    and not exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname <> 'information_schema'
        and n.nspname !~ '^pg_'
        and has_schema_privilege(current_user, n.oid, 'USAGE')
        and has_function_privilege(current_user, p.oid, 'EXECUTE')
        and p.oid <> 'staging_verification.production_staging_inspect(uuid,uuid,uuid)'::regprocedure
    )
    and current_setting('default_transaction_read_only') = 'on'
    as verifier_least_privilege
`;
}

function parseDatabaseUrl(value) {
  return parseUrl(value, ["postgres:", "postgresql:"]);
}

function parseUrl(value, protocols) {
  try {
    const parsed = new URL(value);
    return protocols.includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

function isPrivilegeDenied(result) {
  return result.status === 403 && result.error?.code === "42501";
}

function sameBoundary(before, after) {
  return (
    before.app_user_id === after.app_user_id &&
    before.active_care_team_id === after.active_care_team_id &&
    before.active_care_recipient_id === after.active_care_recipient_id &&
    before.membership_id === after.membership_id &&
    before.permission_version === after.permission_version &&
    before.membership_status === after.membership_status &&
    before.role_key === after.role_key
  );
}

async function stagingFetch(input, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const upstreamSignal = init.signal;
  const signal = upstreamSignal
    ? AbortSignal.any([upstreamSignal, controller.signal])
    : controller.signal;

  try {
    return await fetch(input, { ...init, signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function execute(operation) {
  try {
    return await operation;
  } catch {
    return { data: null, error: { code: "network_or_timeout" }, status: 0 };
  }
}

function check(condition, label) {
  if (condition) {
    console.log(`PASS ${label}`);
    return;
  }

  failures += 1;
  console.error(`FAIL ${label}`);
}

function finish() {
  if (failures > 0) {
    console.error(`Production staging verification failed (${failures} checks).`);
    process.exit(1);
  }

  console.log("Production staging verification passed.");
  process.exit(0);
}

function fail(message) {
  console.error(`Production staging verification blocked: ${message}.`);
  process.exit(1);
}
