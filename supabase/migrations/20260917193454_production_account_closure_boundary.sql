-- Synthetic staging account-closure boundary.
-- This migration does not authorize real-user or production deletion.

alter table public.users
  drop constraint if exists users_auth_user_id_fkey;

alter table public.users
  alter column auth_user_id drop not null;

alter table public.users
  add constraint users_auth_user_id_fkey
  foreign key (auth_user_id)
  references auth.users(id)
  on delete set null;

alter table public.users
  drop constraint if exists users_closed_auth_boundary_check;

alter table public.users
  add constraint users_closed_auth_boundary_check
  check (status = 'deleted' or auth_user_id is not null)
  not valid;

alter table public.users
  validate constraint users_closed_auth_boundary_check;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists private.account_closure_receipts (
  app_user_id uuid primary key references public.users(id) on delete restrict,
  auth_user_hash text not null check (auth_user_hash ~ '^[0-9a-f]{32}$'),
  closure_mode text not null check (closure_mode in ('user_only', 'sole_owner_team')),
  retained_event_count integer not null check (retained_event_count >= 0),
  retained_audit_count integer not null check (retained_audit_count >= 0),
  closed_at timestamptz not null default now()
);

revoke all on table private.account_closure_receipts from public;
revoke all on table private.account_closure_receipts from anon;
revoke all on table private.account_closure_receipts from authenticated;

create table if not exists private.account_closure_authorizations (
  app_user_id uuid primary key references public.users(id) on delete restrict,
  auth_user_hash text not null check (auth_user_hash ~ '^[0-9a-f]{32}$'),
  closure_mode text not null check (closure_mode in ('user_only', 'sole_owner_team')),
  requester_auth_user_id uuid not null,
  approver_auth_user_id uuid not null,
  legal_hold_status text not null default 'blocked'
    check (legal_hold_status in ('blocked', 'clear')),
  authorized_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  recorded_by_database_role text not null default session_user,
  check (requester_auth_user_id <> approver_auth_user_id),
  check (expires_at > authorized_at)
);

revoke all on table private.account_closure_authorizations from public;
revoke all on table private.account_closure_authorizations from anon;
revoke all on table private.account_closure_authorizations from authenticated;
revoke all on table private.account_closure_authorizations from service_role;

do $role_boundary$
declare
  membership record;
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'evernest_account_closure_operator') then
    create role evernest_account_closure_operator
      login
      nosuperuser
      nocreatedb
      nocreaterole
      noreplication
      nobypassrls
      noinherit;
  end if;

  alter role evernest_account_closure_operator
    login
    nosuperuser
    nocreatedb
    nocreaterole
    noreplication
    nobypassrls
    noinherit
    connection limit 1
    password null;

  for membership in
    select granted.rolname as granted_role
    from pg_catalog.pg_auth_members memberships
    join pg_catalog.pg_roles granted on granted.oid = memberships.roleid
    join pg_catalog.pg_roles member on member.oid = memberships.member
    where member.rolname = 'evernest_account_closure_operator'
  loop
    execute pg_catalog.format(
      'revoke %I from evernest_account_closure_operator',
      membership.granted_role
    );
  end loop;

  for membership in
    select member.rolname as member_role
    from pg_catalog.pg_auth_members memberships
    join pg_catalog.pg_roles granted on granted.oid = memberships.roleid
    join pg_catalog.pg_roles member on member.oid = memberships.member
    where granted.rolname = 'evernest_account_closure_operator'
  loop
    execute pg_catalog.format(
      'revoke evernest_account_closure_operator from %I',
      membership.member_role
    );
  end loop;

  execute pg_catalog.format(
    'revoke all privileges on database %I from evernest_account_closure_operator',
    pg_catalog.current_database()
  );
end
$role_boundary$;

revoke usage on schema public from public;
grant usage on schema public to anon, authenticated, service_role;

revoke all on schema public from evernest_account_closure_operator;
revoke all on schema auth from evernest_account_closure_operator;
revoke all on schema storage from evernest_account_closure_operator;
revoke all on schema private from evernest_account_closure_operator;

revoke all on all tables in schema public from evernest_account_closure_operator;
revoke all on all tables in schema auth from evernest_account_closure_operator;
revoke all on all tables in schema storage from evernest_account_closure_operator;
revoke all on all tables in schema private from evernest_account_closure_operator;

revoke all on all sequences in schema public from evernest_account_closure_operator;
revoke all on all sequences in schema auth from evernest_account_closure_operator;
revoke all on all sequences in schema storage from evernest_account_closure_operator;
revoke all on all sequences in schema private from evernest_account_closure_operator;

revoke all on all functions in schema public from evernest_account_closure_operator;
revoke all on all functions in schema auth from evernest_account_closure_operator;
revoke all on all functions in schema storage from evernest_account_closure_operator;
revoke all on all functions in schema private from evernest_account_closure_operator;

create or replace function private.account_closure_operator_posture_is_valid()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $function$
  with operator_role as (
    select oid, rolcanlogin, rolinherit, rolsuper, rolcreatedb, rolcreaterole,
      rolreplication, rolbypassrls
    from pg_catalog.pg_roles
    where rolname = 'evernest_account_closure_operator'
  ), direct_database_privileges as (
    select privileges.privilege_type
    from pg_catalog.pg_database databases
    cross join lateral pg_catalog.aclexplode(
      coalesce(databases.datacl, '{}'::aclitem[])
    ) privileges
    join operator_role on operator_role.oid = privileges.grantee
    where databases.datname = pg_catalog.current_database()
  ), direct_schema_privileges as (
    select namespaces.nspname, privileges.privilege_type
    from pg_catalog.pg_namespace namespaces
    cross join lateral pg_catalog.aclexplode(
      coalesce(namespaces.nspacl, '{}'::aclitem[])
    ) privileges
    join operator_role on operator_role.oid = privileges.grantee
  )
  select coalesce((
    select operator_role.rolcanlogin
      and not operator_role.rolinherit
      and not operator_role.rolsuper
      and not operator_role.rolcreatedb
      and not operator_role.rolcreaterole
      and not operator_role.rolreplication
      and not operator_role.rolbypassrls
      and not exists (
        select 1 from pg_catalog.pg_auth_members memberships
        where memberships.member = operator_role.oid
          or memberships.roleid = operator_role.oid
      )
      and pg_catalog.has_database_privilege(
        'evernest_account_closure_operator', pg_catalog.current_database(), 'CONNECT'
      )
      and not pg_catalog.has_database_privilege(
        'evernest_account_closure_operator', pg_catalog.current_database(), 'CREATE'
      )
      and not exists (
        select 1 from direct_database_privileges
        where privilege_type <> 'CONNECT'
      )
      and pg_catalog.has_schema_privilege(
        'evernest_account_closure_operator', 'private', 'USAGE'
      )
      and not pg_catalog.has_schema_privilege(
        'evernest_account_closure_operator', 'private', 'CREATE'
      )
      and not exists (
        select 1 from direct_schema_privileges
        where not (nspname = 'private' and privilege_type = 'USAGE')
      )
      and not exists (
        select 1
        from pg_catalog.pg_namespace namespaces
        where namespaces.nspname <> 'information_schema'
          and namespaces.nspname !~ '^pg_'
          and (
            (namespaces.nspname <> 'private' and pg_catalog.has_schema_privilege(
              'evernest_account_closure_operator', namespaces.oid, 'USAGE'
            ))
            or pg_catalog.has_schema_privilege(
              'evernest_account_closure_operator', namespaces.oid, 'CREATE'
            )
          )
      )
      and pg_catalog.has_function_privilege(
        'evernest_account_closure_operator',
        'private.close_synthetic_staging_account(uuid,uuid,text)',
        'EXECUTE'
      )
      and pg_catalog.has_function_privilege(
        'evernest_account_closure_operator',
        'private.verify_synthetic_staging_account_closure(uuid,uuid,text)',
        'EXECUTE'
      )
      and not exists (
        select 1
        from pg_catalog.pg_class relations
        join pg_catalog.pg_namespace namespaces on namespaces.oid = relations.relnamespace
        where namespaces.nspname <> 'information_schema'
          and namespaces.nspname !~ '^pg_'
          and pg_catalog.has_schema_privilege(
            'evernest_account_closure_operator', namespaces.oid, 'USAGE'
          )
          and relations.relkind in ('r', 'p', 'v', 'm', 'f')
          and (
            pg_catalog.has_table_privilege(
              'evernest_account_closure_operator', relations.oid, 'SELECT'
            )
            or pg_catalog.has_table_privilege(
              'evernest_account_closure_operator', relations.oid, 'INSERT'
            )
            or pg_catalog.has_table_privilege(
              'evernest_account_closure_operator', relations.oid, 'UPDATE'
            )
            or pg_catalog.has_table_privilege(
              'evernest_account_closure_operator', relations.oid, 'DELETE'
            )
            or pg_catalog.has_table_privilege(
              'evernest_account_closure_operator', relations.oid, 'TRUNCATE'
            )
            or pg_catalog.has_table_privilege(
              'evernest_account_closure_operator', relations.oid, 'REFERENCES'
            )
            or pg_catalog.has_table_privilege(
              'evernest_account_closure_operator', relations.oid, 'TRIGGER'
            )
          )
      )
      and not exists (
        select 1
        from pg_catalog.pg_class relations
        join pg_catalog.pg_namespace namespaces on namespaces.oid = relations.relnamespace
        where namespaces.nspname <> 'information_schema'
          and namespaces.nspname !~ '^pg_'
          and pg_catalog.has_schema_privilege(
            'evernest_account_closure_operator', namespaces.oid, 'USAGE'
          )
          and relations.relkind in ('r', 'p', 'v', 'm', 'f')
          and (
            pg_catalog.has_any_column_privilege(
              'evernest_account_closure_operator', relations.oid, 'SELECT'
            )
            or pg_catalog.has_any_column_privilege(
              'evernest_account_closure_operator', relations.oid, 'INSERT'
            )
            or pg_catalog.has_any_column_privilege(
              'evernest_account_closure_operator', relations.oid, 'UPDATE'
            )
            or pg_catalog.has_any_column_privilege(
              'evernest_account_closure_operator', relations.oid, 'REFERENCES'
            )
          )
      )
      and not exists (
        select 1
        from pg_catalog.pg_class sequences
        join pg_catalog.pg_namespace namespaces on namespaces.oid = sequences.relnamespace
        where namespaces.nspname <> 'information_schema'
          and namespaces.nspname !~ '^pg_'
          and pg_catalog.has_schema_privilege(
            'evernest_account_closure_operator', namespaces.oid, 'USAGE'
          )
          and sequences.relkind = 'S'
          and (
            pg_catalog.has_sequence_privilege(
              'evernest_account_closure_operator', sequences.oid, 'SELECT'
            )
            or pg_catalog.has_sequence_privilege(
              'evernest_account_closure_operator', sequences.oid, 'UPDATE'
            )
            or pg_catalog.has_sequence_privilege(
              'evernest_account_closure_operator', sequences.oid, 'USAGE'
            )
          )
      )
      and not exists (
        select 1
        from pg_catalog.pg_proc functions
        join pg_catalog.pg_namespace namespaces on namespaces.oid = functions.pronamespace
        where namespaces.nspname <> 'information_schema'
          and namespaces.nspname !~ '^pg_'
          and pg_catalog.has_schema_privilege(
            'evernest_account_closure_operator', namespaces.oid, 'USAGE'
          )
          and pg_catalog.has_function_privilege(
            'evernest_account_closure_operator', functions.oid, 'EXECUTE'
          )
          and not (
            namespaces.nspname = 'private'
            and (
              (functions.proname = 'close_synthetic_staging_account'
                and pg_catalog.pg_get_function_identity_arguments(functions.oid) =
                  'p_app_user_id uuid, p_auth_user_id uuid, p_mode text')
              or
              (functions.proname = 'verify_synthetic_staging_account_closure'
                and pg_catalog.pg_get_function_identity_arguments(functions.oid) =
                  'p_app_user_id uuid, p_auth_user_id uuid, p_mode text')
            )
          )
        )
    from operator_role
  ), false)
$function$;

create or replace function private.close_synthetic_staging_account(
  p_app_user_id uuid,
  p_auth_user_id uuid,
  p_mode text
)
returns table(status text, auth_deletion_required boolean)
language plpgsql
security definer
set search_path = ''
set row_security = off
as $function$
declare
  target_user record;
  target_auth record;
  closure_receipt record;
  closure_authorization record;
  team record;
  retained_events integer;
  retained_audits integer;
  auth_hash text := pg_catalog.md5('evernest-account-closure-v1:' || p_auth_user_id::text);
begin
  if session_user <> 'evernest_account_closure_operator' then
    raise exception 'account closure requires the dedicated operator' using errcode = '42501';
  end if;
  if not private.account_closure_operator_posture_is_valid() then
    raise exception 'account closure operator posture is invalid' using errcode = '42501';
  end if;
  if pg_catalog.current_setting('app.environment', true) is distinct from 'staging' then
    raise exception 'account closure is restricted to staging' using errcode = '42501';
  end if;
  if p_app_user_id is null or p_auth_user_id is null
    or p_mode not in ('user_only', 'sole_owner_team') then
    raise exception 'account closure arguments are invalid' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('evernest-account-closure:' || p_app_user_id::text, 0)
  );

  select * into closure_receipt
  from private.account_closure_receipts receipts
  where receipts.app_user_id = p_app_user_id;

  if found then
    if closure_receipt.auth_user_hash <> auth_hash
      or closure_receipt.closure_mode <> p_mode then
      raise exception 'account closure retry does not match the receipt' using errcode = '42501';
    end if;
    select * into target_user from public.users where id = p_app_user_id;
    if not found or target_user.status <> 'deleted' then
      raise exception 'account closure receipt is inconsistent' using errcode = '55000';
    end if;
    return query select 'ready_for_auth_deletion'::text, target_user.auth_user_id is not null;
    return;
  end if;

  select * into closure_authorization
  from private.account_closure_authorizations authorizations
  where authorizations.app_user_id = p_app_user_id
  for update;

  if not found
    or closure_authorization.auth_user_hash <> auth_hash
    or closure_authorization.closure_mode <> p_mode
    or closure_authorization.legal_hold_status <> 'clear'
    or closure_authorization.requester_auth_user_id = closure_authorization.approver_auth_user_id
    or closure_authorization.consumed_at is not null
    or closure_authorization.expires_at <= pg_catalog.now()
    or closure_authorization.recorded_by_database_role = 'evernest_account_closure_operator'
    or not exists (
      select 1
      from auth.users requester
      join auth.users approver
        on approver.id = closure_authorization.approver_auth_user_id
      where requester.id = closure_authorization.requester_auth_user_id
        and requester.deleted_at is null
        and (requester.banned_until is null or requester.banned_until <= pg_catalog.now())
        and requester.email_confirmed_at is not null
        and requester.raw_app_meta_data ->> 'evernest_operator_role' = 'closure_requester'
        and approver.deleted_at is null
        and (approver.banned_until is null or approver.banned_until <= pg_catalog.now())
        and approver.email_confirmed_at is not null
        and approver.raw_app_meta_data ->> 'evernest_operator_role' = 'closure_approver'
        and exists (
          select 1 from auth.mfa_factors requester_factor
          where requester_factor.user_id = requester.id
            and requester_factor.status = 'verified'
        )
        and exists (
          select 1 from auth.mfa_factors approver_factor
          where approver_factor.user_id = approver.id
            and approver_factor.status = 'verified'
        )
    ) then
    raise exception 'account closure authorization is missing, expired, held, or invalid'
      using errcode = '42501';
  end if;

  select * into target_user
  from public.users users
  where users.id = p_app_user_id
  for update;

  if not found or target_user.status <> 'active' or target_user.auth_user_id <> p_auth_user_id then
    raise exception 'account closure target is not an active mapped user' using errcode = '42501';
  end if;

  select users.email, users.raw_app_meta_data into target_auth
  from auth.users users
  where users.id = p_auth_user_id
  for update;

  if not found
    or target_auth.raw_app_meta_data ->> 'evernest_fixture' <> 'production-staging-v1'
    or pg_catalog.lower(target_auth.email) <> pg_catalog.lower(target_user.email) then
    raise exception 'account closure target is not an approved synthetic fixture' using errcode = '42501';
  end if;

  if exists (
    select 1 from storage.objects objects where objects.owner_id::text = p_auth_user_id::text
  ) then
    raise exception 'account closure is blocked by storage ownership' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.care_team_members memberships
    join public.care_teams teams
      on teams.id = memberships.care_team_id
      and teams.status = 'active'
      and teams.deleted_at is null
    join public.roles roles on roles.id = memberships.role_id and roles.role_key = 'owner'
    where memberships.user_id = p_app_user_id
      and memberships.status = 'active'
      and memberships.revoked_at is null
      and exists (
        select 1 from public.care_team_members others
        where others.care_team_id = memberships.care_team_id
          and others.user_id <> p_app_user_id
          and others.status = 'active'
          and others.revoked_at is null
      )
      and not exists (
        select 1
        from public.care_team_members successor
        join public.roles successor_role
          on successor_role.id = successor.role_id and successor_role.role_key = 'owner'
        where successor.care_team_id = memberships.care_team_id
          and successor.user_id <> p_app_user_id
          and successor.status = 'active'
          and successor.revoked_at is null
      )
  ) then
    raise exception 'account closure ownership transfer is required' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.care_teams teams
    where teams.created_by = p_app_user_id
      and teams.status = 'active'
      and teams.deleted_at is null
      and not exists (
        select 1 from public.care_team_members memberships
        where memberships.care_team_id = teams.id
          and memberships.user_id = p_app_user_id
          and memberships.status = 'active'
          and memberships.revoked_at is null
      )
  ) then
    raise exception 'account closure found an active workspace outside membership ownership'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.documents documents
    where coalesce(documents.is_vault_placeholder, false) = false
      and (
        documents.uploaded_by = p_app_user_id
        or exists (
          select 1
          from public.care_team_members memberships
          where memberships.care_team_id = documents.care_team_id
            and memberships.user_id = p_app_user_id
            and memberships.status = 'active'
            and memberships.revoked_at is null
        )
      )
  ) then
    raise exception 'account closure is blocked by non-placeholder documents'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.care_team_members memberships
    join public.care_teams teams
      on teams.id = memberships.care_team_id
      and teams.status = 'active'
      and teams.deleted_at is null
    join public.roles roles on roles.id = memberships.role_id
    where memberships.user_id = p_app_user_id
      and memberships.status = 'active'
      and memberships.revoked_at is null
      and roles.role_key <> 'owner'
      and not exists (
        select 1
        from public.care_team_members others
        where others.care_team_id = memberships.care_team_id
          and others.user_id <> p_app_user_id
          and others.status = 'active'
          and others.revoked_at is null
      )
  ) then
    raise exception 'account closure cannot orphan a workspace without an active owner'
      using errcode = '55000';
  end if;

  if p_mode = 'user_only' and exists (
    select 1
    from public.care_team_members memberships
    join public.care_teams teams
      on teams.id = memberships.care_team_id
      and teams.status = 'active'
      and teams.deleted_at is null
    join public.roles roles on roles.id = memberships.role_id and roles.role_key = 'owner'
    where memberships.user_id = p_app_user_id
      and memberships.status = 'active'
      and memberships.revoked_at is null
      and not exists (
        select 1 from public.care_team_members others
        where others.care_team_id = memberships.care_team_id
          and others.user_id <> p_app_user_id
          and others.status = 'active'
          and others.revoked_at is null
      )
  ) then
    raise exception 'user-only closure cannot close a sole-owner workspace' using errcode = '55000';
  end if;

  if p_mode = 'sole_owner_team' and not exists (
    select 1
    from public.care_team_members memberships
    join public.care_teams teams
      on teams.id = memberships.care_team_id
      and teams.status = 'active'
      and teams.deleted_at is null
    join public.roles roles on roles.id = memberships.role_id and roles.role_key = 'owner'
    where memberships.user_id = p_app_user_id
      and memberships.status = 'active'
      and memberships.revoked_at is null
      and not exists (
        select 1 from public.care_team_members others
        where others.care_team_id = memberships.care_team_id
          and others.user_id <> p_app_user_id
          and others.status = 'active'
          and others.revoked_at is null
      )
  ) then
    raise exception 'sole-owner closure has no eligible workspace' using errcode = '55000';
  end if;

  if p_mode = 'sole_owner_team' then
    for team in
      select teams.id, teams.care_recipient_id
      from public.care_teams teams
      join public.care_team_members memberships on memberships.care_team_id = teams.id
      join public.roles roles on roles.id = memberships.role_id and roles.role_key = 'owner'
      where teams.status = 'active'
        and teams.deleted_at is null
        and memberships.user_id = p_app_user_id
        and memberships.status = 'active'
        and memberships.revoked_at is null
        and not exists (
          select 1 from public.care_team_members others
          where others.care_team_id = teams.id
            and others.user_id <> p_app_user_id
            and others.status = 'active'
            and others.revoked_at is null
        )
    loop
      if exists (
        select 1 from public.care_teams sibling
        where sibling.care_recipient_id = team.care_recipient_id
          and sibling.id <> team.id
          and sibling.status = 'active'
          and sibling.deleted_at is null
      ) then
        raise exception 'recipient has another active workspace' using errcode = '55000';
      end if;
      if exists (
        select 1 from public.documents documents
        where documents.care_team_id = team.id
          and coalesce(documents.is_vault_placeholder, false) = false
      ) then
        raise exception 'workspace contains a non-placeholder document' using errcode = '55000';
      end if;

      delete from public.notifications where care_team_id = team.id;
      delete from public.imaging_studies where care_team_id = team.id;
      delete from public.documents where care_team_id = team.id;
      delete from public.messages where conversation_id in (
        select id from public.conversations where care_team_id = team.id
      );
      delete from public.conversations where care_team_id = team.id;
      delete from public.tasks where care_team_id = team.id;
      delete from public.medications where care_team_id = team.id;
      delete from public.appointments where care_team_id = team.id;
      delete from public.invitations where care_team_id = team.id;
      delete from public.permission_grants where care_team_id = team.id;
      delete from public.care_team_members where care_team_id = team.id;

      update public.care_teams
      set name = 'Closed workspace', status = 'dissolved', created_by = null,
        archived_by = null, archived_at = pg_catalog.now(), dissolved_at = pg_catalog.now(),
        deleted_at = pg_catalog.now(), updated_at = pg_catalog.now()
      where id = team.id;

      update public.care_recipients
      set display_name = 'Closed recipient', preferred_name = null,
        relationship_context = null, status = 'deleted', onboarding_state = '{}'::jsonb,
        primary_care_team_id = null, created_by = null, archived_by = null,
        archived_at = pg_catalog.now(), deleted_at = pg_catalog.now(), updated_at = pg_catalog.now()
      where id = team.care_recipient_id;
    end loop;
  end if;

  update public.invitations
  set email = 'closed+' || pg_catalog.md5(id::text) || '@invalid.example',
    token_hash = pg_catalog.md5('closed-invitation:' || id::text),
    message = null, invited_user_id = null, accepted_by = null,
    status = case when status = 'pending' then 'revoked' else status end,
    revoked_by = null,
    revoked_at = case when status = 'pending' then pg_catalog.now() else revoked_at end,
    updated_at = pg_catalog.now()
  where invited_user_id = p_app_user_id
     or accepted_by = p_app_user_id
     or revoked_by = p_app_user_id
     or pg_catalog.lower(email) = pg_catalog.lower(target_user.email);

  delete from public.invitations where invited_by = p_app_user_id;
  delete from public.permission_grants where subject_user_id = p_app_user_id;
  update public.permission_grants set created_by = null where created_by = p_app_user_id;
  update public.permission_grants set revoked_by = null where revoked_by = p_app_user_id;
  delete from public.notifications where user_id = p_app_user_id;
  update public.tasks set assigned_to = null where assigned_to = p_app_user_id;
  update public.tasks set created_by = null where created_by = p_app_user_id;
  update public.tasks set completed_by = null where completed_by = p_app_user_id;
  update public.appointments set created_by = null where created_by = p_app_user_id;
  update public.medications set created_by = null where created_by = p_app_user_id;
  update public.conversations set created_by = null where created_by = p_app_user_id;
  update public.conversation_participants set added_by = null where added_by = p_app_user_id;
  update public.conversation_participants set removed_by = null where removed_by = p_app_user_id;
  delete from public.conversation_participants where user_id = p_app_user_id;
  update public.messages
  set body = '[removed]', status = 'deleted', deleted_at = coalesce(deleted_at, pg_catalog.now()),
    updated_at = pg_catalog.now()
  where author_id = p_app_user_id;
  update public.documents set uploaded_by = null where uploaded_by = p_app_user_id;
  update public.imaging_studies set uploaded_by = null where uploaded_by = p_app_user_id;
  update public.care_recipients set created_by = null where created_by = p_app_user_id;
  update public.care_recipients set archived_by = null where archived_by = p_app_user_id;
  update public.care_teams set created_by = null where created_by = p_app_user_id;
  update public.care_teams set archived_by = null where archived_by = p_app_user_id;
  update public.care_team_members set invited_by = null where invited_by = p_app_user_id;
  update public.care_team_members set revoked_by = null where revoked_by = p_app_user_id;
  update public.care_team_members
  set status = case when status in ('active', 'invited') then 'revoked' else status end,
    revoked_at = coalesce(revoked_at, pg_catalog.now()), updated_at = pg_catalog.now()
  where user_id = p_app_user_id;
  delete from public.care_team_members where user_id = p_app_user_id;

  update public.users
  set email = 'closed+' || pg_catalog.md5(id::text) || '@invalid.example',
    display_name = 'Closed account', avatar_url = null, status = 'deleted',
    deleted_at = pg_catalog.now(), updated_at = pg_catalog.now()
  where id = p_app_user_id;

  if exists (select 1 from public.care_team_members where user_id = p_app_user_id)
    or exists (select 1 from public.permission_grants where subject_user_id = p_app_user_id)
    or exists (
      select 1 from public.permission_grants
      where created_by = p_app_user_id or revoked_by = p_app_user_id
    )
    or exists (select 1 from public.notifications where user_id = p_app_user_id)
    or exists (select 1 from public.conversation_participants where user_id = p_app_user_id)
    or exists (
      select 1 from public.invitations
      where invited_user_id = p_app_user_id or invited_by = p_app_user_id
        or accepted_by = p_app_user_id or revoked_by = p_app_user_id
    )
    or exists (
      select 1 from public.tasks
      where assigned_to = p_app_user_id or created_by = p_app_user_id
        or completed_by = p_app_user_id
    )
    or exists (select 1 from public.appointments where created_by = p_app_user_id)
    or exists (select 1 from public.medications where created_by = p_app_user_id)
    or exists (select 1 from public.conversations where created_by = p_app_user_id)
    or exists (
      select 1 from public.conversation_participants
      where added_by = p_app_user_id or removed_by = p_app_user_id
    )
    or exists (
      select 1 from public.messages
      where author_id = p_app_user_id
        and (body <> '[removed]' or status <> 'deleted' or deleted_at is null)
    )
    or exists (select 1 from public.documents where uploaded_by = p_app_user_id)
    or exists (select 1 from public.imaging_studies where uploaded_by = p_app_user_id)
    or exists (
      select 1 from public.care_recipients
      where created_by = p_app_user_id or archived_by = p_app_user_id
    )
    or exists (
      select 1 from public.care_teams
      where created_by = p_app_user_id or archived_by = p_app_user_id
    )
  then
    raise exception 'mutable account references remain after closure' using errcode = '55000';
  end if;

  select pg_catalog.count(*)::integer into retained_events
  from public.care_events where actor_user_id = p_app_user_id;
  select pg_catalog.count(*)::integer into retained_audits
  from public.audit_events where actor_user_id = p_app_user_id or target_user_id = p_app_user_id;

  insert into private.account_closure_receipts (
    app_user_id, auth_user_hash, closure_mode, retained_event_count, retained_audit_count
  ) values (
    p_app_user_id, auth_hash, p_mode, retained_events, retained_audits
  );

  update private.account_closure_authorizations
  set consumed_at = pg_catalog.now()
  where app_user_id = p_app_user_id
    and consumed_at is null;

  if not found then
    raise exception 'account closure authorization was not consumed' using errcode = '55000';
  end if;

  return query select 'ready_for_auth_deletion'::text, true;
end
$function$;

create or replace function private.verify_synthetic_staging_account_closure(
  p_app_user_id uuid,
  p_auth_user_id uuid,
  p_mode text
)
returns table(
  status text,
  closed_at timestamptz,
  retained_event_bucket text,
  retained_audit_bucket text
)
language plpgsql
security definer
set search_path = ''
set row_security = off
as $function$
declare
  closure_receipt record;
  expected_hash text := pg_catalog.md5('evernest-account-closure-v1:' || p_auth_user_id::text);
begin
  if session_user <> 'evernest_account_closure_operator' then
    raise exception 'account closure verification requires the dedicated operator' using errcode = '42501';
  end if;
  if not private.account_closure_operator_posture_is_valid() then
    raise exception 'account closure operator posture is invalid' using errcode = '42501';
  end if;
  if pg_catalog.current_setting('app.environment', true) is distinct from 'staging' then
    raise exception 'account closure verification is restricted to staging' using errcode = '42501';
  end if;
  if p_app_user_id is null or p_auth_user_id is null
    or p_mode not in ('user_only', 'sole_owner_team') then
    raise exception 'account closure verification arguments are invalid' using errcode = '22023';
  end if;

  select * into closure_receipt
  from private.account_closure_receipts receipts
  where receipts.app_user_id = p_app_user_id;

  if not found or closure_receipt.auth_user_hash <> expected_hash
    or closure_receipt.closure_mode <> p_mode then
    raise exception 'account closure receipt is missing or mismatched' using errcode = '55000';
  end if;
  if not exists (
    select 1
    from private.account_closure_authorizations authorizations
    where authorizations.app_user_id = p_app_user_id
      and authorizations.auth_user_hash = expected_hash
      and authorizations.closure_mode = p_mode
      and authorizations.legal_hold_status = 'clear'
      and authorizations.requester_auth_user_id <> authorizations.approver_auth_user_id
      and authorizations.consumed_at is not null
  ) then
    raise exception 'account closure authorization was not consumed' using errcode = '55000';
  end if;
  if exists (select 1 from auth.users users where users.id = p_auth_user_id) then
    raise exception 'Auth account still exists' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.users users
    where users.id = p_app_user_id
      and users.status = 'deleted'
      and users.auth_user_id is null
  ) then
    raise exception 'application account is not closed' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.care_team_members memberships
    where memberships.user_id = p_app_user_id and memberships.status = 'active'
  ) then
    raise exception 'active membership remains after closure' using errcode = '55000';
  end if;

  return query
  select 'closed'::text,
    closure_receipt.closed_at,
    case closure_receipt.retained_event_count
      when 0 then 'zero'::text when 1 then 'one'::text else 'multiple'::text
    end,
    case closure_receipt.retained_audit_count
      when 0 then 'zero'::text when 1 then 'one'::text else 'multiple'::text
    end;
end
$function$;

alter function private.account_closure_operator_posture_is_valid() owner to postgres;
alter function private.close_synthetic_staging_account(uuid, uuid, text) owner to postgres;
alter function private.verify_synthetic_staging_account_closure(uuid, uuid, text) owner to postgres;

revoke all on function private.account_closure_operator_posture_is_valid() from public;
revoke all on function private.account_closure_operator_posture_is_valid() from anon;
revoke all on function private.account_closure_operator_posture_is_valid() from authenticated;
revoke all on function private.account_closure_operator_posture_is_valid() from service_role;
revoke all on function private.account_closure_operator_posture_is_valid() from evernest_account_closure_operator;

revoke all on function private.close_synthetic_staging_account(uuid, uuid, text) from public;
revoke all on function private.close_synthetic_staging_account(uuid, uuid, text) from anon;
revoke all on function private.close_synthetic_staging_account(uuid, uuid, text) from authenticated;
revoke all on function private.close_synthetic_staging_account(uuid, uuid, text) from service_role;

revoke all on function private.verify_synthetic_staging_account_closure(uuid, uuid, text) from public;
revoke all on function private.verify_synthetic_staging_account_closure(uuid, uuid, text) from anon;
revoke all on function private.verify_synthetic_staging_account_closure(uuid, uuid, text) from authenticated;
revoke all on function private.verify_synthetic_staging_account_closure(uuid, uuid, text) from service_role;

do $operator_grants$
begin
  execute pg_catalog.format(
    'grant connect on database %I to evernest_account_closure_operator',
    pg_catalog.current_database()
  );
end
$operator_grants$;

grant usage on schema private to evernest_account_closure_operator;
grant execute on function private.close_synthetic_staging_account(uuid, uuid, text)
  to evernest_account_closure_operator;
grant execute on function private.verify_synthetic_staging_account_closure(uuid, uuid, text)
  to evernest_account_closure_operator;
