-- Match the exposed database API to the narrow initial production scope.

alter default privileges for role postgres
  revoke execute on functions from public;

revoke select on all tables in schema public from anon;

revoke all on function public.accept_care_circle_invitation(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.deny_care_circle_invitation(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.expire_care_circle_invitation(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.expire_care_circle_invitations(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.preview_care_circle_invitation(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.revoke_care_circle_invitation(jsonb)
  from public, anon, authenticated, service_role;

-- Direct table mutation is already revoked from API roles. Remove legacy FOR
-- ALL policies so they cannot widen SELECT visibility or add duplicate policy
-- work. Future direct writes require a separately reviewed forward migration.
drop policy if exists appointments_write_permitted on public.appointments;
drop policy if exists medications_write_permitted on public.medications;
drop policy if exists tasks_write_permitted_or_assigned on public.tasks;
drop policy if exists conversations_write_managers on public.conversations;
drop policy if exists conversation_participants_write_managers
  on public.conversation_participants;
drop policy if exists documents_write_permitted on public.documents;
drop policy if exists imaging_studies_write_permitted on public.imaging_studies;

do $production_scope_api_assertions$
declare
  function_record record;
  table_record record;
  reviewed_authenticated_signatures constant text[] := array[
    'append_care_event(uuid,uuid,text,text,text,timestamp with time zone,text,text,text,integer,jsonb)',
    'attach_vault_artifact_to_timeline(jsonb)',
    'can_view_conversation(uuid)',
    'can_view_document(uuid)',
    'can_view_recipient(uuid)',
    'create_vault_artifact_placeholder(jsonb)',
    'current_app_user_id()',
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
    'list_vault_artifacts(jsonb)'
  ];
begin
  for function_record in
    select procedures.oid, procedures.oid::regprocedure::text as signature
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
      raise exception 'production function allowlist mismatch for %', function_record.signature
        using errcode = 'P0001';
    end if;
  end loop;

  for table_record in
    select relations.oid, relations.oid::regclass::text as relation_name
    from pg_catalog.pg_class relations
    join pg_catalog.pg_namespace namespaces on namespaces.oid = relations.relnamespace
    where namespaces.nspname = 'public'
      and relations.relkind in ('r', 'p', 'v', 'm', 'f')
  loop
    if pg_catalog.has_table_privilege('anon', table_record.oid, 'SELECT') then
      raise exception 'anon can select public relation %', table_record.relation_name
        using errcode = 'P0001';
    end if;
  end loop;
end
$production_scope_api_assertions$;
