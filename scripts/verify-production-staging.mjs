import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const requiredEnvironment = [
  "STAGING_DATABASE_URL",
  "STAGING_SENTINEL_EVENT_ID",
  "STAGING_SUPABASE_URL",
  "STAGING_SUPABASE_PUBLISHABLE_KEY",
  "STAGING_OWNER_EMAIL",
  "STAGING_OWNER_PASSWORD",
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]?.trim());

if (missingEnvironment.length > 0) {
  fail(`missing required environment: ${missingEnvironment.join(", ")}`);
}

const stagingUrl = process.env.STAGING_SUPABASE_URL.trim();
const stagingDatabaseUrl = process.env.STAGING_DATABASE_URL.trim();
const parsedStagingUrl = parseUrl(stagingUrl, ["https:"]);
const projectRef = parsedStagingUrl?.hostname.split(".")[0];

if (!parsedStagingUrl || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsedStagingUrl.hostname)) {
  fail("STAGING_SUPABASE_URL must be an HTTPS Supabase project URL");
}

const parsedDatabaseUrl = parseDatabaseUrl(stagingDatabaseUrl);
const directDatabaseMatch = parsedDatabaseUrl?.hostname === `db.${projectRef}.supabase.co`;
const poolerDatabaseMatch =
  parsedDatabaseUrl?.hostname.endsWith(".pooler.supabase.com") === true &&
  decodeURIComponent(parsedDatabaseUrl.username) === `postgres.${projectRef}`;

if (!projectRef || (!directDatabaseMatch && !poolerDatabaseMatch)) {
  fail("the staging API and database URLs do not identify the same project");
}

if (
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    process.env.STAGING_SENTINEL_EVENT_ID,
  )
) {
  fail("STAGING_SENTINEL_EVENT_ID must be a UUID");
}

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
const initialDatabaseState = await inspectDatabase();

check(initialDatabaseState?.environment === "staging", "server-side staging sentinel");
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

  const initialHydration = await hydrateBoundary();
  check(initialHydration !== null, "read-only workspace hydration");
  if (!initialHydration) finish();

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
    client
      .rpc("get_vault_artifact_summary", {
        p_request: { permission_version: initialHydration.permission_version },
      })
      .maybeSingle(),
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
      .eq("care_team_id", initialHydration.active_care_team_id)
      .eq("care_recipient_id", initialHydration.active_care_recipient_id)
      .maybeSingle(),
  );
  check(
    !sentinelRead.error && sentinelRead.data?.id === process.env.STAGING_SENTINEL_EVENT_ID,
    "authorized sentinel care event read",
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
    finalHydration !== null && sameBoundary(initialHydration, finalHydration),
    "workspace boundary remained stable",
  );
} finally {
  await execute(client.auth.signOut());
}

const finalDatabaseState = await inspectDatabase();
check(finalDatabaseState?.environment === "staging", "staging sentinel remained active");
check(finalDatabaseState?.acl_locked === true, "database privileges remained locked");
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
    !row.permission_version
  ) {
    return null;
  }

  return row;
}

async function expectRpcDenied(name, args) {
  const result = await execute(client.rpc(name, args));
  check(isPrivilegeDenied(result), `${name} execution denied`);
}

async function expectDirectWriteDenied(table, operation, query) {
  const result = await execute(query);
  check(isPrivilegeDenied(result), `${table} direct ${operation} denied`);
}

async function inspectDatabase() {
  try {
    const rows = await database.unsafe(databaseInspectionSql(), [
      process.env.STAGING_SENTINEL_EVENT_ID,
    ]);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

function databaseInspectionSql() {
  const tableValues = productTables.map((table) => `('${table}')`).join(",");

  return `
with product_tables(table_name) as (values ${tableValues}),
api_roles(role_name) as (values ('anon'), ('authenticated')),
closed_functions(signature) as (values
  ('public.ensure_care_boundary(text,text,uuid)'),
  ('public.create_care_circle_invitation(jsonb)'),
  ('public.team_has_no_members(uuid)'),
  ('public.write_audit_event(uuid,uuid,uuid,uuid,text,text,uuid,jsonb)')
)
select
  current_setting('app.environment', true) as environment,
  not exists (
    select 1 from product_tables cross join api_roles
    where has_table_privilege(
      role_name,
      format('public.%I', table_name),
      'INSERT,UPDATE,DELETE'
    )
  ) and not exists (
    select 1 from closed_functions cross join api_roles
    where to_regprocedure(signature) is null
       or has_function_privilege(role_name, to_regprocedure(signature), 'EXECUTE')
  ) as acl_locked,
  exists (select 1 from public.care_events where id = $1::uuid) as sentinel_ready,
  md5(concat_ws('|',
    (select coalesce(string_agg(to_jsonb(t)::text, ',' order by t.id), '') from public.users t),
    (select coalesce(string_agg(to_jsonb(t)::text, ',' order by t.id), '') from public.care_recipients t),
    (select coalesce(string_agg(to_jsonb(t)::text, ',' order by t.id), '') from public.care_teams t),
    (select coalesce(string_agg(to_jsonb(t)::text, ',' order by t.id), '') from public.care_team_members t)
  )) as boundary_fingerprint
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
    before.permission_version === after.permission_version
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
