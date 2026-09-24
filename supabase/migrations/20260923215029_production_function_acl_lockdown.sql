-- Lock public function execution to reviewed authenticated APIs and RLS helpers.
-- PostgreSQL 17 records the managed role creator as an ADMIN-only member of a
-- newly created role. Supabase records that grant under supabase_admin, so the
-- project owner cannot revoke it. Permit only that exact non-inheritable,
-- non-settable platform relationship; every other membership remains blocked.

do $closure_role_posture_repair$
declare
  target_function constant regprocedure :=
    'private.account_closure_operator_posture_is_valid()'::regprocedure;
  function_definition text := pg_catalog.pg_get_functiondef(target_function);
  repaired_definition text;
  replacement_count integer;
  database_acl_replacement_count integer;
  schema_acl_replacement_count integer;
  old_guard constant text := $old_guard$and not exists (
        select 1 from pg_catalog.pg_auth_members memberships
        where memberships.member = operator_role.oid
          or memberships.roleid = operator_role.oid
      )$old_guard$;
  new_guard constant text := $new_guard$and not exists (
        select 1 from pg_catalog.pg_auth_members memberships
        where memberships.member = operator_role.oid
      )
      and (
        select pg_catalog.count(*)
        from pg_catalog.pg_auth_members memberships
        where memberships.roleid = operator_role.oid
      ) <= 1
      and not exists (
        select 1
        from pg_catalog.pg_auth_members memberships
        join pg_catalog.pg_roles member_role on member_role.oid = memberships.member
        join pg_catalog.pg_roles grantor_role on grantor_role.oid = memberships.grantor
        where memberships.roleid = operator_role.oid
          and not (
            member_role.rolname = 'postgres'
            and grantor_role.rolname = 'supabase_admin'
            and memberships.admin_option
            and not memberships.inherit_option
            and not memberships.set_option
          )
      )$new_guard$;
  old_database_acl constant text :=
    'coalesce(databases.datacl, ''{}''::aclitem[])';
  new_database_acl constant text :=
    'coalesce(databases.datacl, pg_catalog.acldefault(''d'', databases.datdba))';
  old_schema_acl constant text :=
    'coalesce(namespaces.nspacl, ''{}''::aclitem[])';
  new_schema_acl constant text :=
    'coalesce(namespaces.nspacl, pg_catalog.acldefault(''n'', namespaces.nspowner))';
begin
  replacement_count := (
    pg_catalog.length(function_definition)
    - pg_catalog.length(pg_catalog.replace(function_definition, old_guard, ''))
  ) / pg_catalog.length(old_guard);

  if replacement_count <> 1 then
    raise exception 'expected one closure-role membership guard, found %', replacement_count
      using errcode = 'P0001';
  end if;

  repaired_definition := pg_catalog.replace(function_definition, old_guard, new_guard);
  database_acl_replacement_count := (
    pg_catalog.length(repaired_definition)
    - pg_catalog.length(pg_catalog.replace(repaired_definition, old_database_acl, ''))
  ) / pg_catalog.length(old_database_acl);
  schema_acl_replacement_count := (
    pg_catalog.length(repaired_definition)
    - pg_catalog.length(pg_catalog.replace(repaired_definition, old_schema_acl, ''))
  ) / pg_catalog.length(old_schema_acl);

  if database_acl_replacement_count <> 1 or schema_acl_replacement_count <> 1 then
    raise exception 'expected one database and schema ACL fallback, found % and %',
      database_acl_replacement_count,
      schema_acl_replacement_count using errcode = 'P0001';
  end if;

  repaired_definition := pg_catalog.replace(
    repaired_definition,
    old_database_acl,
    new_database_acl
  );
  repaired_definition := pg_catalog.replace(
    repaired_definition,
    old_schema_acl,
    new_schema_acl
  );
  execute repaired_definition;

  if not private.account_closure_operator_posture_is_valid() then
    raise exception 'evernest_account_closure_operator posture remains invalid'
      using errcode = 'P0001';
  end if;
end
$closure_role_posture_repair$;

-- These helpers previously inherited a caller-controlled search path. They use
-- only PostgreSQL built-ins and explicitly qualified or public application data.
alter function public.care_circle_role_preview(text)
  set search_path = pg_catalog, public;
alter function public.care_circle_role_category(text)
  set search_path = pg_catalog, public;
alter function public.care_circle_invite_status(text, timestamptz)
  set search_path = pg_catalog, public;
alter function public.care_circle_expiry_status(timestamptz)
  set search_path = pg_catalog, public;
alter function public.care_event_read_capability(text)
  set search_path = pg_catalog, public;
alter function public.care_event_actor_role(text)
  set search_path = pg_catalog, public;
alter function public.care_event_required_capability(text)
  set search_path = pg_catalog, public;
alter function public.care_note_payload_validation_status(jsonb)
  set search_path = pg_catalog, public;
alter function public.care_event_payload_is_structural(text, jsonb)
  set search_path = pg_catalog, public;
alter function public.vault_artifact_payload_status(jsonb)
  set search_path = pg_catalog, public;
alter function public.vault_artifact_time_bucket(timestamptz)
  set search_path = pg_catalog, public;
alter function public.evernest_role_allows(text, text)
  set search_path = pg_catalog, public;
alter function public.set_updated_at()
  set search_path = pg_catalog, public;
alter function public.prevent_audit_event_mutation()
  set search_path = pg_catalog, public;
alter function public.prevent_care_event_mutation()
  set search_path = pg_catalog, public;

-- PostgreSQL grants EXECUTE to PUBLIC for newly created functions. Reset the
-- exposed schema to a deny-by-default posture, then grant only reviewed APIs
-- and the small helper set required by authenticated RLS reads.
revoke all on all functions in schema public from public;
revoke all on all functions in schema public from anon;
revoke all on all functions in schema public from authenticated;
revoke all on all functions in schema public from service_role;

grant execute on function public.current_app_user_id() to authenticated, service_role;
grant execute on function public.has_active_team_membership(uuid) to authenticated, service_role;
grant execute on function public.has_team_capability(uuid, text) to authenticated, service_role;
grant execute on function public.has_resource_capability(uuid, text, uuid, text)
  to authenticated, service_role;
grant execute on function public.can_view_recipient(uuid) to authenticated, service_role;
grant execute on function public.can_view_conversation(uuid) to authenticated, service_role;
grant execute on function public.can_view_document(uuid) to authenticated, service_role;

grant execute on function public.accept_care_circle_invitation(jsonb)
  to authenticated, service_role;
grant execute on function public.append_care_event(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  integer,
  jsonb
) to authenticated, service_role;
grant execute on function public.attach_vault_artifact_to_timeline(jsonb)
  to authenticated, service_role;
grant execute on function public.create_vault_artifact_placeholder(jsonb)
  to authenticated, service_role;
grant execute on function public.deny_care_circle_invitation(jsonb)
  to authenticated, service_role;
grant execute on function public.expire_care_circle_invitation(jsonb)
  to authenticated, service_role;
grant execute on function public.expire_care_circle_invitations(jsonb)
  to authenticated, service_role;
grant execute on function public.get_artifact_access_advisory_summary(jsonb)
  to authenticated, service_role;
grant execute on function public.get_care_circle_summary(jsonb)
  to authenticated, service_role;
grant execute on function public.get_permissions_advisory_summary(jsonb)
  to authenticated, service_role;
grant execute on function public.get_vault_artifact_summary(jsonb)
  to authenticated, service_role;
grant execute on function public.hydrate_care_circle_context(jsonb)
  to authenticated, service_role;
grant execute on function public.hydrate_permission_context()
  to authenticated, service_role;
grant execute on function public.hydrate_resource_access_context(jsonb)
  to authenticated, service_role;
grant execute on function public.list_care_circle_invitations(jsonb)
  to authenticated, service_role;
grant execute on function public.list_vault_artifacts(jsonb)
  to authenticated, service_role;
grant execute on function public.preview_care_circle_invitation(jsonb)
  to authenticated, service_role;
grant execute on function public.revoke_care_circle_invitation(jsonb)
  to authenticated, service_role;

do $function_acl_assertions$
declare
  function_record record;
  reviewed_authenticated_signatures constant text[] := array[
    'accept_care_circle_invitation(jsonb)',
    'append_care_event(uuid,uuid,text,text,text,timestamp with time zone,text,text,text,integer,jsonb)',
    'attach_vault_artifact_to_timeline(jsonb)',
    'can_view_conversation(uuid)',
    'can_view_document(uuid)',
    'can_view_recipient(uuid)',
    'create_vault_artifact_placeholder(jsonb)',
    'current_app_user_id()',
    'deny_care_circle_invitation(jsonb)',
    'expire_care_circle_invitation(jsonb)',
    'expire_care_circle_invitations(jsonb)',
    'get_artifact_access_advisory_summary(jsonb)',
    'get_care_circle_summary(jsonb)',
    'get_permissions_advisory_summary(jsonb)',
    'get_vault_artifact_summary(jsonb)',
    'has_active_team_membership(uuid)',
    'has_resource_capability(uuid,text,uuid,text)',
    'has_team_capability(uuid,text)',
    'hydrate_care_circle_context(jsonb)',
    'hydrate_permission_context()',
    'hydrate_resource_access_context(jsonb)',
    'list_care_circle_invitations(jsonb)',
    'list_vault_artifacts(jsonb)',
    'preview_care_circle_invitation(jsonb)',
    'revoke_care_circle_invitation(jsonb)'
  ];
begin
  for function_record in
    select procedures.oid,
      procedures.oid::regprocedure::text as signature,
      procedures.prosecdef,
      procedures.proconfig
    from pg_catalog.pg_proc procedures
    join pg_catalog.pg_namespace namespaces on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
  loop
    if pg_catalog.has_function_privilege('anon', function_record.oid, 'EXECUTE') then
      raise exception 'anon can execute public function %', function_record.signature
        using errcode = 'P0001';
    end if;

    if pg_catalog.has_function_privilege('authenticated', function_record.oid, 'EXECUTE')
      <> (function_record.signature = any(reviewed_authenticated_signatures)) then
      raise exception 'authenticated function allowlist mismatch for %', function_record.signature
        using errcode = 'P0001';
    end if;

    if function_record.prosecdef
      and function_record.proconfig is null then
      raise exception 'security-definer function has mutable search_path: %',
        function_record.signature using errcode = 'P0001';
    end if;
  end loop;
end
$function_acl_assertions$;
