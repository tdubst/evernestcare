import postgres from "postgres";
import {
  hasExactProjectConfirmation,
  loadProductionProjectRegistry,
  validateStagingProjectTarget,
} from "./production-project-registry.mjs";

process.on("uncaughtException", handleFatalError);
process.on("unhandledRejection", handleFatalError);

const requiredEnvironment = [
  "STAGING_EXPECTED_PROJECT_REF",
  "STAGING_OWNER_EMAIL",
  "STAGING_PROTECTED_PROJECT_REFS",
  "STAGING_PROVISION_DATABASE_URL",
  "STAGING_PROVISION_CONFIRMATION",
  "STAGING_REVOKED_EMAIL",
  "STAGING_SENTINEL_EVENT_ID",
  "STAGING_SUPABASE_URL",
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]?.trim());

if (missingEnvironment.length > 0) {
  fail(`missing required environment: ${missingEnvironment.join(", ")}`);
}

const stagingDatabaseUrl = process.env.STAGING_PROVISION_DATABASE_URL.trim();
const stagingUrl = process.env.STAGING_SUPABASE_URL.trim();
const expectedProjectRef = process.env.STAGING_EXPECTED_PROJECT_REF.trim();
const protectedProjectRefs = new Set(
  process.env.STAGING_PROTECTED_PROJECT_REFS.split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const ownerEmail = process.env.STAGING_OWNER_EMAIL.trim().toLowerCase();
const revokedEmail = process.env.STAGING_REVOKED_EMAIL.trim().toLowerCase();
const sentinelEventId = process.env.STAGING_SENTINEL_EVENT_ID.trim();
const projectRegistry = loadProductionProjectRegistry();
const verifierRole = "evernest_staging_verifier";

const parsedDatabaseUrl = parseUrl(stagingDatabaseUrl, ["postgres:", "postgresql:"]);
const parsedStagingUrl = parseUrl(stagingUrl, ["https:"]);
const projectRef = parsedStagingUrl?.hostname.split(".")[0];
const directDatabaseMatch = parsedDatabaseUrl?.hostname === `db.${projectRef}.supabase.co`;
const poolerDatabaseMatch =
  parsedDatabaseUrl?.hostname.endsWith(".pooler.supabase.com") === true &&
  decodeURIComponent(parsedDatabaseUrl.username) === `postgres.${projectRef}`;

if (!parsedDatabaseUrl) {
  fail("STAGING_PROVISION_DATABASE_URL must be a PostgreSQL URL");
}

if (parsedDatabaseUrl.searchParams.get("sslmode") !== "verify-full") {
  fail("STAGING_PROVISION_DATABASE_URL must require verify-full TLS");
}

if (!parsedStagingUrl || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsedStagingUrl.hostname)) {
  fail("STAGING_SUPABASE_URL must be an HTTPS Supabase project URL");
}

if (
  !/^[a-z0-9]{20}$/i.test(expectedProjectRef) ||
  projectRef !== expectedProjectRef ||
  (!directDatabaseMatch && !poolerDatabaseMatch)
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
    process.env.STAGING_PROVISION_CONFIRMATION,
    "PROVISION",
    expectedProjectRef,
  )
) {
  fail("STAGING_PROVISION_CONFIRMATION must bind to the expected staging project reference");
}

if (!ownerEmail.includes("@") || ownerEmail.length > 320) {
  fail("STAGING_OWNER_EMAIL must be a valid administrative fixture email");
}

if (!revokedEmail.includes("@") || revokedEmail.length > 320 || revokedEmail === ownerEmail) {
  fail("STAGING_REVOKED_EMAIL must identify a separate administrative fixture account");
}

if (!isUuid(sentinelEventId)) {
  fail("STAGING_SENTINEL_EVENT_ID must be a UUID");
}

const database = postgres(stagingDatabaseUrl, {
  connect_timeout: 10,
  idle_timeout: 5,
  max: 1,
  prepare: false,
  ssl: "verify-full",
});

try {
  const environment = await database`
    select environment as value
    from private.environment_sentinel
    where singleton
  `;
  if (environment[0]?.value !== "staging") {
    fail("database does not report the staging sentinel");
  }

  await database.begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtextextended('evernest-production-staging-fixture-v1', 0))`;

    await sql`revoke usage on schema public from public`;
    await sql`grant usage on schema public to anon, authenticated, service_role`;
    await sql`create schema if not exists staging_verification authorization postgres`;
    await sql`revoke all on schema staging_verification from public, anon, authenticated, service_role`;

    const verifierRoles = await sql`
      select
        rolcanlogin,
        rolinherit,
        rolsuper,
        rolcreatedb,
        rolcreaterole,
        rolreplication,
        rolbypassrls,
        coalesce('default_transaction_read_only=on' = any(rolconfig), false) as read_only_default
      from pg_roles
      where rolname = ${verifierRole}
    `;
    if (
      verifierRoles.length !== 1 ||
      verifierRoles[0].rolcanlogin !== true ||
      verifierRoles[0].rolinherit !== false ||
      verifierRoles[0].rolsuper !== false ||
      verifierRoles[0].rolcreatedb !== false ||
      verifierRoles[0].rolcreaterole !== false ||
      verifierRoles[0].rolreplication !== false ||
      verifierRoles[0].rolbypassrls !== false ||
      verifierRoles[0].read_only_default !== true
    ) {
      fail("the staging verifier role is missing or over-privileged");
    }

    const verifierMemberships = await sql`
      select 1
      from pg_auth_members
      where member = (select oid from pg_roles where rolname = ${verifierRole})
    `;
    if (verifierMemberships.length !== 0) {
      fail("the staging verifier role must not belong to another database role");
    }

    const verifierPrivileges = await sql`
      with product_tables(table_name) as (values
        ('users'),
        ('care_recipients'),
        ('care_teams'),
        ('roles'),
        ('care_team_members'),
        ('permission_grants'),
        ('invitations'),
        ('appointments'),
        ('medications'),
        ('tasks'),
        ('conversations'),
        ('conversation_participants'),
        ('messages'),
        ('documents'),
        ('imaging_studies'),
        ('notifications'),
        ('audit_events'),
        ('care_events')
      ),
      table_privileges(privilege_name) as (values
        ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
      ),
      sequence_privileges(privilege_name) as (values ('SELECT'), ('UPDATE'), ('USAGE')),
      closed_functions(signature) as (values
        ('public.ensure_care_boundary(text,text,uuid)'),
        ('public.create_care_circle_invitation(jsonb)'),
        ('public.team_has_no_members(uuid)'),
        ('public.write_audit_event(uuid,uuid,uuid,uuid,text,text,uuid,jsonb)')
      )
      select
        not exists (
          select 1
          from pg_namespace n
          where n.nspname <> 'staging_verification'
            and n.nspname <> 'information_schema'
            and n.nspname !~ '^pg_'
            and has_schema_privilege(${verifierRole}, n.oid, 'USAGE')
        )
        and not has_schema_privilege(${verifierRole}, 'staging_verification', 'CREATE')
        and not exists (
          select 1
          from pg_namespace n
          where n.nspname <> 'information_schema'
            and n.nspname !~ '^pg_'
            and has_schema_privilege(${verifierRole}, n.oid, 'CREATE')
        )
        and has_database_privilege(${verifierRole}, current_database(), 'CONNECT')
        and not has_database_privilege(${verifierRole}, current_database(), 'CREATE')
        and has_database_privilege(${verifierRole}, current_database(), 'TEMPORARY')
        and not exists (
          select 1
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          cross join table_privileges
          where n.nspname <> 'information_schema'
            and n.nspname !~ '^pg_'
            and c.relkind in ('r', 'p', 'v', 'm', 'f')
            and has_schema_privilege(${verifierRole}, n.oid, 'USAGE')
            and has_table_privilege(${verifierRole}, c.oid, privilege_name)
        )
        and not exists (
          select 1
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          cross join sequence_privileges
          where n.nspname <> 'information_schema'
            and n.nspname !~ '^pg_'
            and c.relkind = 'S'
            and has_schema_privilege(${verifierRole}, n.oid, 'USAGE')
            and has_sequence_privilege(${verifierRole}, c.oid, privilege_name)
        )
        and not exists (
          select 1
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          where n.nspname <> 'information_schema'
            and n.nspname !~ '^pg_'
            and has_schema_privilege(${verifierRole}, n.oid, 'USAGE')
            and has_function_privilege(${verifierRole}, p.oid, 'EXECUTE')
            and not (
              n.nspname = 'staging_verification'
              and p.oid = to_regprocedure(
                'staging_verification.production_staging_inspect(uuid,uuid,uuid)'
              )
            )
        )
        and not exists (
          select 1 from closed_functions
          where to_regprocedure(signature) is null
            or has_function_privilege(${verifierRole}, to_regprocedure(signature), 'EXECUTE')
        ) as least_privilege
    `;
    if (verifierPrivileges[0]?.least_privilege !== true) {
      fail("the staging verifier role has unapproved data or function privileges");
    }

    const authUsers = await sql`
      select id
      from auth.users
      where lower(email) = ${ownerEmail}
        and deleted_at is null
        and email_confirmed_at is not null
        and raw_app_meta_data ->> 'evernest_fixture' = 'production-staging-v1'
    `;

    if (authUsers.length !== 1) {
      fail("exactly one administratively provisioned staging owner is required");
    }

    const ownerAuthUserId = authUsers[0].id;
    const existingOwnerRows = await sql`
      select id, email, display_name, avatar_url, status, deleted_at
      from public.users
      where auth_user_id = ${ownerAuthUserId}
      for update
    `;
    if (
      existingOwnerRows.length === 1 &&
      (existingOwnerRows[0].email.toLowerCase() !== ownerEmail ||
        existingOwnerRows[0].display_name !== "Staging owner" ||
        existingOwnerRows[0].avatar_url !== null ||
        existingOwnerRows[0].status !== "active" ||
        existingOwnerRows[0].deleted_at !== null)
    ) {
      fail("existing staging owner app user is not an intact fixture account");
    }
    const ownerRows =
      existingOwnerRows.length === 1
        ? existingOwnerRows
        : await sql`
            insert into public.users (auth_user_id, email, display_name, status, deleted_at)
            values (${ownerAuthUserId}, ${ownerEmail}, 'Staging owner', 'active', null)
            returning id
          `;
    const ownerUserId = ownerRows[0].id;

    const revokedAuthUsers = await sql`
      select id
      from auth.users
      where lower(email) = ${revokedEmail}
        and deleted_at is null
        and email_confirmed_at is not null
        and raw_app_meta_data ->> 'evernest_fixture' = 'production-staging-v1'
    `;

    if (revokedAuthUsers.length !== 1) {
      fail("exactly one administratively provisioned revoked fixture user is required");
    }

    const existingRevokedRows = await sql`
      select id, email, display_name, avatar_url, status, deleted_at
      from public.users
      where auth_user_id = ${revokedAuthUsers[0].id}
      for update
    `;
    if (
      existingRevokedRows.length === 1 &&
      (existingRevokedRows[0].email.toLowerCase() !== revokedEmail ||
        existingRevokedRows[0].display_name !== "Revoked staging user" ||
        existingRevokedRows[0].avatar_url !== null ||
        existingRevokedRows[0].status !== "active" ||
        existingRevokedRows[0].deleted_at !== null)
    ) {
      fail("existing revoked app user is not an intact fixture account");
    }
    const revokedRows =
      existingRevokedRows.length === 1
        ? existingRevokedRows
        : await sql`
            insert into public.users (auth_user_id, email, display_name, status, deleted_at)
            values (${revokedAuthUsers[0].id}, ${revokedEmail}, 'Revoked staging user', 'active', null)
            returning id
          `;
    const revokedUserId = revokedRows[0].id;

    const recipientRows = await sql`
      select
        id,
        display_name,
        preferred_name,
        relationship_context,
        status,
        onboarding_state,
        archived_by,
        archived_at,
        deleted_at
      from public.care_recipients
      where created_by = ${ownerUserId}
        and onboarding_state ->> 'fixture' = 'production-staging-v1'
      for update
    `;

    if (recipientRows.length > 1) {
      fail("staging owner has more than one production fixture recipient");
    }

    let recipientId = recipientRows[0]?.id;
    if (!recipientId) {
      const inserted = await sql`
        insert into public.care_recipients (
          display_name,
          preferred_name,
          relationship_context,
          status,
          onboarding_state,
          created_by
        ) values (
          'Staging recipient',
          'Staging recipient',
          'production-readiness',
          'active',
          ${sql.json({ fixture: "production-staging-v1" })},
          ${ownerUserId}
        )
        returning id
      `;
      recipientId = inserted[0].id;
    } else {
      const recipient = recipientRows[0];
      if (
        recipient.display_name !== "Staging recipient" ||
        recipient.preferred_name !== "Staging recipient" ||
        recipient.relationship_context !== "production-readiness" ||
        recipient.status !== "active" ||
        Object.keys(recipient.onboarding_state ?? {}).join(",") !== "fixture" ||
        recipient.onboarding_state?.fixture !== "production-staging-v1" ||
        recipient.archived_by !== null ||
        recipient.archived_at !== null ||
        recipient.deleted_at !== null
      ) {
        fail("existing staging recipient is not an intact fixture record");
      }
    }

    const teamRows = await sql`
      select id, name, status, archived_by, archived_at, dissolved_at, deleted_at
      from public.care_teams
      where care_recipient_id = ${recipientId}
        and created_by = ${ownerUserId}
      for update
    `;

    if (teamRows.length > 1) {
      fail("staging fixture has more than one workspace");
    }

    let teamId = teamRows[0]?.id;
    if (!teamId) {
      const inserted = await sql`
        insert into public.care_teams (care_recipient_id, name, status, created_by)
        values (${recipientId}, 'Staging workspace', 'active', ${ownerUserId})
        returning id
      `;
      teamId = inserted[0].id;
    } else {
      const team = teamRows[0];
      if (
        team.name !== "Staging workspace" ||
        team.status !== "active" ||
        team.archived_by !== null ||
        team.archived_at !== null ||
        team.dissolved_at !== null ||
        team.deleted_at !== null
      ) {
        fail("existing staging workspace is not an intact fixture record");
      }
    }

    const recipientBoundaries = await sql`
      select primary_care_team_id
      from public.care_recipients
      where id = ${recipientId}
      for update
    `;
    if (recipientBoundaries[0].primary_care_team_id === null) {
      await sql`
        update public.care_recipients
        set primary_care_team_id = ${teamId}
        where id = ${recipientId}
      `;
    } else if (recipientBoundaries[0].primary_care_team_id !== teamId) {
      fail("staging recipient is already bound to a different workspace");
    }

    const ownerRoles = await sql`
      select id
      from public.roles
      where role_key = 'owner' and status = 'active'
    `;
    if (ownerRoles.length !== 1) {
      fail("exactly one active owner role is required");
    }

    const viewerRoles = await sql`
      select id
      from public.roles
      where role_key = 'viewer' and status = 'active'
    `;
    if (viewerRoles.length !== 1) {
      fail("exactly one active viewer role is required");
    }

    const existingOwnerMemberships = await sql`
      select role_id, status, invited_by, joined_at, revoked_by, revoked_at
      from public.care_team_members
      where care_team_id = ${teamId} and user_id = ${ownerUserId}
      for update
    `;
    if (
      existingOwnerMemberships.length > 1 ||
      (existingOwnerMemberships.length === 1 &&
        (existingOwnerMemberships[0].role_id !== ownerRoles[0].id ||
          existingOwnerMemberships[0].status !== "active" ||
          existingOwnerMemberships[0].invited_by !== ownerUserId ||
          existingOwnerMemberships[0].joined_at === null ||
          existingOwnerMemberships[0].revoked_by !== null ||
          existingOwnerMemberships[0].revoked_at !== null))
    ) {
      fail("existing owner membership is not an intact fixture record");
    }
    if (existingOwnerMemberships.length === 0)
      await sql`
      insert into public.care_team_members (
        care_team_id,
        user_id,
        role_id,
        status,
        invited_by,
        joined_at,
        revoked_by,
        revoked_at
      ) values (
        ${teamId},
        ${ownerUserId},
        ${ownerRoles[0].id},
        'active',
        ${ownerUserId},
        now(),
        null,
        null
      )
    `;

    const existingRevokedMemberships = await sql`
      select role_id, status, invited_by, joined_at, revoked_by, revoked_at
      from public.care_team_members
      where care_team_id = ${teamId} and user_id = ${revokedUserId}
      for update
    `;
    if (
      existingRevokedMemberships.length > 1 ||
      (existingRevokedMemberships.length === 1 &&
        (existingRevokedMemberships[0].role_id !== viewerRoles[0].id ||
          existingRevokedMemberships[0].status !== "revoked" ||
          existingRevokedMemberships[0].invited_by !== ownerUserId ||
          existingRevokedMemberships[0].joined_at === null ||
          existingRevokedMemberships[0].revoked_by !== ownerUserId ||
          existingRevokedMemberships[0].revoked_at === null))
    ) {
      fail("existing revoked membership is not an intact fixture record");
    }
    if (existingRevokedMemberships.length === 0)
      await sql`
      insert into public.care_team_members (
        care_team_id,
        user_id,
        role_id,
        status,
        invited_by,
        joined_at,
        revoked_by,
        revoked_at
      ) values (
        ${teamId},
        ${revokedUserId},
        ${viewerRoles[0].id},
        'revoked',
        ${ownerUserId},
        now(),
        ${ownerUserId},
        now()
      )
    `;

    const existingEvents = await sql`
      select
        id,
        client_event_id,
        care_team_id,
        care_recipient_id,
        actor_user_id,
        actor_display_name,
        actor_role,
        event_type,
        event_source,
        display_timestamp,
        operational_context,
        correlation_id,
        causation_id,
        schema_version,
        occurred_at = timestamptz '2026-01-01 00:00:00+00' as occurred_at_valid,
        payload
      from public.care_events
      where id = ${sentinelEventId}
      for update
    `;

    if (existingEvents.length === 0) {
      await sql`
        insert into public.care_events (
          id,
          client_event_id,
          care_team_id,
          care_recipient_id,
          actor_user_id,
          actor_display_name,
          actor_role,
          event_type,
          event_source,
          occurred_at,
          display_timestamp,
          operational_context,
          correlation_id,
          schema_version,
          payload
        ) values (
          ${sentinelEventId},
          ${`staging-sentinel-${sentinelEventId}`},
          ${teamId},
          ${recipientId},
          ${ownerUserId},
          'Staging caregiver',
          'primary-caregiver',
          'CareNoteAddedEvent',
          'manual',
          timestamptz '2026-01-01 00:00:00+00',
          null,
          'caregiver-note',
          ${`staging-sentinel-${sentinelEventId}`},
          1,
          ${sql.json({ note: "Staging continuity check", noteType: "caregiver-context" })}
        )
      `;
    } else {
      const sentinel = existingEvents[0];
      const sentinelKey = `staging-sentinel-${sentinelEventId}`;
      if (
        sentinel.client_event_id !== sentinelKey ||
        sentinel.care_team_id !== teamId ||
        sentinel.care_recipient_id !== recipientId ||
        sentinel.actor_user_id !== ownerUserId ||
        sentinel.actor_display_name !== "Staging caregiver" ||
        sentinel.actor_role !== "primary-caregiver" ||
        sentinel.event_type !== "CareNoteAddedEvent" ||
        sentinel.event_source !== "manual" ||
        sentinel.display_timestamp !== null ||
        sentinel.operational_context !== "caregiver-note" ||
        sentinel.correlation_id !== sentinelKey ||
        sentinel.causation_id !== null ||
        sentinel.schema_version !== 1 ||
        sentinel.occurred_at_valid !== true ||
        Object.keys(sentinel.payload ?? {})
          .sort()
          .join(",") !== "note,noteType" ||
        sentinel.payload?.note !== "Staging continuity check" ||
        sentinel.payload?.noteType !== "caregiver-context"
      ) {
        fail("existing sentinel event is not the intact staging fixture");
      }
    }

    const activeMemberships = await sql`
      select count(*)::integer as count
      from public.care_team_members
      where user_id = ${ownerUserId}
        and status = 'active'
        and revoked_at is null
    `;
    if (activeMemberships[0]?.count !== 1) {
      fail("staging owner must have exactly one active workspace membership");
    }

    const revokedMemberships = await sql`
      select count(*)::integer as count
      from public.care_team_members
      where user_id = ${revokedUserId}
        and status = 'active'
        and revoked_at is null
    `;
    if (revokedMemberships[0]?.count !== 0) {
      fail("revoked staging user must have no active workspace membership");
    }

    await sql`drop function if exists public.production_staging_inspect(uuid, text)`;
    await sql`drop function if exists public.production_staging_inspect(uuid, uuid, uuid)`;
    await sql`drop function if exists staging_verification.production_staging_inspect(uuid, uuid, uuid)`;
    await sql`
      create function staging_verification.production_staging_inspect(
        p_sentinel_event_id uuid,
        p_revoked_auth_user_id uuid,
        p_release_proof_id uuid
      )
      returns table (
        environment text,
        acl_locked boolean,
        sentinel_ready boolean,
        durable_note_count bigint,
        revoked_fixture_ready boolean,
        boundary_fingerprint text
      )
      language sql
      stable
      security definer
      set search_path = pg_catalog, public
      as $function$
        with product_tables(table_name) as (values
          ('users'),
          ('care_recipients'),
          ('care_teams'),
          ('roles'),
          ('care_team_members'),
          ('permission_grants'),
          ('invitations'),
          ('appointments'),
          ('medications'),
          ('tasks'),
          ('conversations'),
          ('conversation_participants'),
          ('messages'),
          ('documents'),
          ('imaging_studies'),
          ('notifications'),
          ('audit_events'),
          ('care_events')
        ),
        api_roles(role_name) as (values ('anon'), ('authenticated')),
        closed_functions(signature) as (values
          ('public.ensure_care_boundary(text,text,uuid)'),
          ('public.create_care_circle_invitation(jsonb)'),
          ('public.team_has_no_members(uuid)'),
          ('public.write_audit_event(uuid,uuid,uuid,uuid,text,text,uuid,jsonb)')
        )
        select
          (
            select environment
            from private.environment_sentinel
            where singleton
          ),
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
          ),
          exists (
            select 1
            from public.care_events se
            join public.care_team_members owner_ctm
              on owner_ctm.care_team_id = se.care_team_id
              and owner_ctm.user_id = se.actor_user_id
            join public.roles owner_role on owner_role.id = owner_ctm.role_id
            where se.id = p_sentinel_event_id
              and se.client_event_id = 'staging-sentinel-' || p_sentinel_event_id::text
              and se.actor_display_name = 'Staging caregiver'
              and se.actor_role = 'primary-caregiver'
              and se.event_type = 'CareNoteAddedEvent'
              and se.event_source = 'manual'
              and se.display_timestamp is null
              and se.operational_context = 'caregiver-note'
              and se.correlation_id = 'staging-sentinel-' || p_sentinel_event_id::text
              and se.causation_id is null
              and se.schema_version = 1
              and se.occurred_at = timestamptz '2026-01-01 00:00:00+00'
              and se.payload = '{"note":"Staging continuity check","noteType":"caregiver-context"}'::jsonb
              and owner_ctm.status = 'active'
              and owner_ctm.revoked_at is null
              and owner_role.role_key = 'owner'
          ),
          (
            select count(*)
            from public.care_events
            where client_event_id = 'staging-note-' || p_release_proof_id::text
          ),
          exists (
            select 1
            from public.care_events se
            join public.care_team_members ctm on ctm.care_team_id = se.care_team_id
            join public.users u on u.id = ctm.user_id
            where se.id = p_sentinel_event_id
              and u.auth_user_id = p_revoked_auth_user_id
              and ctm.status = 'revoked'
              and ctm.revoked_at is not null
              and not exists (
                select 1
                from public.care_team_members active_ctm
                where active_ctm.user_id = u.id
                  and active_ctm.status = 'active'
                  and active_ctm.revoked_at is null
              )
          ),
          md5(concat_ws('|',
            (select coalesce(string_agg(to_jsonb(t)::text, ',' order by t.id), '') from public.users t),
            (select coalesce(string_agg(to_jsonb(t)::text, ',' order by t.id), '') from public.care_recipients t),
            (select coalesce(string_agg(to_jsonb(t)::text, ',' order by t.id), '') from public.care_teams t),
            (select coalesce(string_agg(to_jsonb(t)::text, ',' order by t.id), '') from public.care_team_members t)
          ))
      $function$
    `;
    await sql`revoke all on function staging_verification.production_staging_inspect(uuid, uuid, uuid) from public`;
    await sql`revoke all on function staging_verification.production_staging_inspect(uuid, uuid, uuid) from anon`;
    await sql`revoke all on function staging_verification.production_staging_inspect(uuid, uuid, uuid) from authenticated`;
    await sql`revoke all on function staging_verification.production_staging_inspect(uuid, uuid, uuid) from service_role`;
    await sql`grant usage on schema staging_verification to ${sql(verifierRole)}`;
    await sql`grant execute on function staging_verification.production_staging_inspect(uuid, uuid, uuid) to ${sql(verifierRole)}`;
  });

  console.log("Production staging fixture provisioned.");
} catch (error) {
  if (error?.message?.startsWith("Production staging provisioning blocked:")) {
    throw error;
  }
  fail("database provisioning failed");
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
  throw new Error(`Production staging provisioning blocked: ${message}.`);
}

function handleFatalError(error) {
  const message =
    error instanceof Error && error.message.startsWith("Production staging provisioning blocked:")
      ? error.message
      : "Production staging provisioning blocked: database provisioning failed.";

  console.error(message);
  process.exit(1);
}
