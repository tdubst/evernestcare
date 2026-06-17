-- Sprint 5 resource-scoped advisory access projection.
-- This is a metadata-only UI hint; RLS/RPC remains authoritative.

create or replace function public.hydrate_resource_access_context(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  app_user_id uuid,
  active_care_team_id uuid,
  active_care_recipient_id uuid,
  membership_id uuid,
  membership_status text,
  role_key text,
  permission_version text,
  resource_access jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count integer := 0;
  v_app_user_id uuid;
  v_care_recipient_deleted_at timestamptz;
  v_care_recipient_id uuid;
  v_care_recipient_primary_team_id uuid;
  v_care_recipient_status text;
  v_care_team_deleted_at timestamptz;
  v_care_team_id uuid;
  v_care_team_status text;
  v_max_page_size integer := 100;
  v_membership_id uuid;
  v_membership_status text;
  v_page_size integer := 50;
  v_permission_version text;
  v_resource_classes jsonb := '["care_recipient", "care_event"]'::jsonb;
  v_requested_permission_version text;
  v_request jsonb := coalesce(p_request, '{}'::jsonb);
  v_resources jsonb := '[]'::jsonb;
  v_resource_access jsonb := '[]'::jsonb;
  v_role_id uuid;
  v_role_key text;
begin
  if auth.uid() is null then
    return query select
      'auth_required'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if jsonb_typeof(v_request) <> 'object' then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  v_resource_classes := case
    when v_request ? 'resource_classes'
      and v_request->'resource_classes' <> 'null'::jsonb
      then v_request->'resource_classes'
    else '["care_recipient", "care_event"]'::jsonb
  end;

  v_resources := case
    when v_request ? 'resources'
      and v_request->'resources' <> 'null'::jsonb
      then v_request->'resources'
    else '[]'::jsonb
  end;

  if v_request ? 'page_size' then
    if jsonb_typeof(v_request->'page_size') <> 'number' then
      return query select
        'invalid_request'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        '[]'::jsonb;
      return;
    end if;

    if v_request->>'page_size' !~ '^[0-9]+$'
      or length(v_request->>'page_size') > 3 then
      return query select
        'invalid_request'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        '[]'::jsonb;
      return;
    end if;

    v_page_size := (v_request->>'page_size')::integer;

    if v_page_size < 1 or v_page_size > v_max_page_size then
      return query select
        'invalid_request'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        '[]'::jsonb;
      return;
    end if;
  end if;

  if jsonb_typeof(v_resource_classes) <> 'array' then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if jsonb_typeof(v_resources) <> 'array' then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if v_request ? 'permission_version' then
    if jsonb_typeof(v_request->'permission_version') <> 'string' then
      return query select
        'invalid_request'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        '[]'::jsonb;
      return;
    end if;

    v_requested_permission_version := nullif(v_request->>'permission_version', '');
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_resource_classes) as rc(resource_class)
    where jsonb_typeof(rc.resource_class) is distinct from 'string'
      or rc.resource_class #>> '{}' not in ('care_recipient', 'care_event')
  ) then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if (
    select count(*)
    from jsonb_array_elements(v_resources)
  ) > v_page_size then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_resources) as r(resource)
    where jsonb_typeof(r.resource) is distinct from 'object'
      or jsonb_typeof(r.resource->'resource_type') is distinct from 'string'
      or r.resource->>'resource_type' not in ('care_recipient', 'care_event')
      or (
        r.resource ? 'resource_id'
        and r.resource->'resource_id' <> 'null'::jsonb
        and jsonb_typeof(r.resource->'resource_id') is distinct from 'string'
      )
      or jsonb_typeof(r.resource->'capabilities') is distinct from 'array'
      or jsonb_array_length(r.resource->'capabilities') = 0
  ) then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_resources) as r(resource)
    cross join lateral jsonb_array_elements(r.resource->'capabilities') as c(capability)
    where jsonb_typeof(c.capability) is distinct from 'string'
      or c.capability #>> '{}' not in ('care_event.view', 'care_event.append', 'provider_prep.preview')
      or (
        r.resource->>'resource_type' = 'care_event'
        and c.capability #>> '{}' not in ('care_event.view', 'care_event.append')
      )
      or (
        r.resource->>'resource_type' = 'care_recipient'
        and c.capability #>> '{}' <> 'provider_prep.preview'
      )
  ) then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if exists (
    select 1
    from (
      select
        r.resource->>'resource_type' as resource_type,
        coalesce(r.resource->>'resource_id', '') as resource_id,
        count(*) as duplicate_count
      from jsonb_array_elements(v_resources) as r(resource)
      group by r.resource->>'resource_type', coalesce(r.resource->>'resource_id', '')
    ) duplicates
    where duplicates.duplicate_count > 1
  ) then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_resources) as r(resource)
    where r.resource ? 'resource_id'
      and r.resource->'resource_id' <> 'null'::jsonb
      and r.resource->>'resource_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  v_app_user_id := public.current_app_user_id();

  if v_app_user_id is null then
    return query select
      'boundary_unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  select count(*) into v_active_count
  from public.care_team_members ctm
  where ctm.user_id = v_app_user_id
    and ctm.status = 'active'
    and ctm.revoked_at is null;

  if v_active_count <> 1 then
    return query select
      case when v_active_count > 1 then 'multiple_active_memberships' else 'boundary_unavailable' end::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  select
    ctm.id,
    ctm.status,
    ctm.role_id,
    r.role_key,
    ct.id,
    ct.status,
    ct.deleted_at,
    cr.id,
    cr.status,
    cr.deleted_at,
    cr.primary_care_team_id
  into
    v_membership_id,
    v_membership_status,
    v_role_id,
    v_role_key,
    v_care_team_id,
    v_care_team_status,
    v_care_team_deleted_at,
    v_care_recipient_id,
    v_care_recipient_status,
    v_care_recipient_deleted_at,
    v_care_recipient_primary_team_id
  from public.care_team_members ctm
  join public.roles r on r.id = ctm.role_id
  join public.care_teams ct on ct.id = ctm.care_team_id
  join public.care_recipients cr on cr.id = ct.care_recipient_id
  where ctm.user_id = v_app_user_id
    and ctm.status = 'active'
    and ctm.revoked_at is null
    and r.status = 'active'
  limit 1;

  if v_membership_id is null
    or v_care_team_id is null
    or v_care_recipient_id is null
    or v_care_team_status <> 'active'
    or v_care_team_deleted_at is not null
    or v_care_recipient_status in ('archived', 'deleted')
    or v_care_recipient_deleted_at is not null
    or v_care_recipient_primary_team_id <> v_care_team_id then
    return query select
      'boundary_unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  select greatest(
      ctm.updated_at,
      r.updated_at,
      ct.updated_at,
      cr.updated_at,
      coalesce(max(pg.updated_at), 'epoch'::timestamptz)
    )::text
    into v_permission_version
  from public.care_team_members ctm
  join public.roles r on r.id = ctm.role_id
  join public.care_teams ct on ct.id = ctm.care_team_id
  join public.care_recipients cr on cr.id = ct.care_recipient_id
  left join public.permission_grants pg on pg.care_team_id = ctm.care_team_id
    and (
      pg.subject_user_id = ctm.user_id
      or pg.subject_role_id = ctm.role_id
    )
  where ctm.id = v_membership_id
  group by ctm.updated_at, r.updated_at, ct.updated_at, cr.updated_at;

  if v_requested_permission_version is not null
    and v_requested_permission_version <> v_permission_version then
    return query select
      'stale_permission_context'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  with requested_resources as (
    select
      r.ordinality::integer as resource_ordinal,
      r.resource->>'resource_type' as resource_type,
      nullif(r.resource->>'resource_id', '')::uuid as requested_resource_id,
      c.ordinality::integer as capability_ordinal,
      c.capability #>> '{}' as capability
    from jsonb_array_elements(v_resources)
      with ordinality as r(resource, ordinality)
    cross join lateral jsonb_array_elements(r.resource->'capabilities')
      with ordinality as c(capability, ordinality)
  ),
  requested_classes as (
    select distinct
      rc.resource_class #>> '{}' as resource_type
    from jsonb_array_elements(v_resource_classes) as rc(resource_class)
    where not exists (select 1 from jsonb_array_elements(v_resources))
  ),
  default_resources as (
    select
      (row_number() over ())::integer as resource_ordinal,
      resource_type,
      null::uuid as requested_resource_id,
      (row_number() over (partition by resource_type order by capability))::integer as capability_ordinal,
      capability
    from (
      values
        ('care_recipient', 'provider_prep.preview'),
        ('care_event', 'care_event.view'),
        ('care_event', 'care_event.append')
    ) as defaults(resource_type, capability)
    where exists (
      select 1 from requested_classes
      where requested_classes.resource_type = defaults.resource_type
    )
  ),
  requested as (
    select * from requested_resources
    union all
    select * from default_resources
  ),
  normalized as (
    select
      resource_ordinal,
      capability_ordinal,
      resource_type,
      case
        when resource_type = 'care_recipient'
          and (requested_resource_id is null or requested_resource_id = v_care_recipient_id)
          then requested_resource_id
        else null::uuid
      end as safe_resource_id,
      requested_resource_id,
      capability,
      case
        when capability = 'provider_prep.preview' then array['provider_prep.preview', 'care_event.view']
        else array[capability]
      end as effective_capabilities
    from requested
  ),
  evaluated as (
    select
      n.resource_ordinal,
      n.capability_ordinal,
      n.resource_type,
      n.safe_resource_id,
      n.requested_resource_id,
      n.capability,
      exists (
        select 1
        from public.permission_grants pg
        where pg.care_team_id = v_care_team_id
          and pg.resource_type = 'care_recipient'
          and (pg.resource_id is null or pg.resource_id = v_care_recipient_id)
          and pg.capability = any(n.effective_capabilities)
          and pg.effect = 'deny'
          and pg.revoked_at is null
          and pg.starts_at <= now()
          and (pg.expires_at is null or pg.expires_at > now())
          and (
            pg.subject_user_id = v_app_user_id
            or pg.subject_role_id = v_role_id
          )
      ) as has_explicit_deny,
      exists (
        select 1
        from public.permission_grants pg
        where pg.care_team_id = v_care_team_id
          and pg.resource_type = 'care_recipient'
          and (pg.resource_id is null or pg.resource_id = v_care_recipient_id)
          and pg.capability = any(n.effective_capabilities)
          and pg.effect = 'allow'
          and pg.revoked_at is null
          and pg.starts_at <= now()
          and (pg.expires_at is null or pg.expires_at > now())
          and (
            pg.subject_user_id = v_app_user_id
            or pg.subject_role_id = v_role_id
          )
      ) as has_explicit_grant,
      (
        select min(pg.expires_at)
        from public.permission_grants pg
        where pg.care_team_id = v_care_team_id
          and pg.resource_type = 'care_recipient'
          and (pg.resource_id is null or pg.resource_id = v_care_recipient_id)
          and pg.capability = any(n.effective_capabilities)
          and pg.effect = 'allow'
          and pg.revoked_at is null
          and pg.starts_at <= now()
          and pg.expires_at is not null
          and pg.expires_at > now()
          and (
            pg.subject_user_id = v_app_user_id
            or pg.subject_role_id = v_role_id
          )
      ) as explicit_grant_expires_at,
      case
        when n.capability = 'provider_prep.preview' then public.evernest_role_allows(v_role_key, 'care_event.view')
        else public.evernest_role_allows(v_role_key, n.capability)
      end as has_role_default,
      case
        when n.requested_resource_id is null then true
        when n.resource_type = 'care_recipient' and n.requested_resource_id = v_care_recipient_id then true
        else false
      end as resource_available
    from normalized n
  ),
  projected as (
    select
      resource_ordinal,
      capability_ordinal,
      resource_type,
      case when resource_available then safe_resource_id else null::uuid end as resource_id,
      capability,
      case
        when not resource_available then 'unavailable'
        when has_explicit_deny then 'denied'
        when has_explicit_grant or has_role_default then 'allowed'
        else 'denied'
      end as access,
      case
        when not resource_available then 'system_boundary'
        when has_explicit_deny then 'explicit_deny'
        when has_explicit_grant then 'explicit_grant'
        when has_role_default then 'role_default'
        else 'system_boundary'
      end as source_scope,
      case
        when resource_available and has_explicit_grant and not has_explicit_deny then explicit_grant_expires_at
        else null::timestamptz
      end as expires_at
    from evaluated
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'resource_type', resource_type,
        'resource_id', resource_id,
        'capability', capability,
        'access', access,
        'source_scope', source_scope,
        'expires_at', expires_at
      )
      order by resource_ordinal, capability_ordinal, capability
    ),
    '[]'::jsonb
  )
  into v_resource_access
  from projected;

  return query select
    'ready'::text,
    v_app_user_id,
    v_care_team_id,
    v_care_recipient_id,
    v_membership_id,
    v_membership_status,
    v_role_key,
    v_permission_version,
    v_resource_access;
  return;
exception
  when invalid_text_representation or numeric_value_out_of_range or serialization_failure or deadlock_detected then
    return query select
      'unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
end;
$$;

revoke all on function public.hydrate_resource_access_context(jsonb) from public;
revoke all on function public.hydrate_resource_access_context(jsonb) from anon;
grant execute on function public.hydrate_resource_access_context(jsonb) to authenticated;
