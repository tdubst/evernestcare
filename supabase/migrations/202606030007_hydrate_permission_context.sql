-- Sprint 3 server-derived advisory permission context.
-- UI capabilities are hints only; RLS/RPC remains authoritative.

create or replace function public.hydrate_permission_context()
returns table (
  status text,
  app_user_id uuid,
  active_care_team_id uuid,
  active_care_recipient_id uuid,
  membership_id uuid,
  membership_status text,
  role_key text,
  advisory_capabilities text[],
  permission_version text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count integer := 0;
  v_advisory_capabilities text[] := '{}'::text[];
  v_app_user_id uuid;
  v_care_recipient_deleted_at timestamptz;
  v_care_recipient_id uuid;
  v_care_recipient_primary_team_id uuid;
  v_care_recipient_status text;
  v_care_team_deleted_at timestamptz;
  v_care_team_id uuid;
  v_care_team_status text;
  v_membership_id uuid;
  v_membership_status text;
  v_permission_version text;
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
      '{}'::text[],
      null::text;
    return;
  end if;

  v_app_user_id := public.current_app_user_id();

  if v_app_user_id is null then
    return query select
      'user_unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      '{}'::text[],
      null::text;
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
      '{}'::text[],
      null::text;
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
      '{}'::text[],
      null::text;
    return;
  end if;

  with capability_catalog(capability, scope) as (
    values
      ('recipient.view', 'recipient'),
      ('recipient.manage', 'recipient'),
      ('team.view', 'team'),
      ('team.manage', 'team'),
      ('invitation.manage', 'team'),
      ('permissions.manage', 'team'),
      ('appointment.view', 'recipient'),
      ('appointment.manage', 'recipient'),
      ('medication.view', 'recipient'),
      ('medication.manage', 'recipient'),
      ('medication.log', 'recipient'),
      ('vitals.view', 'recipient'),
      ('vitals.log', 'recipient'),
      ('care_event.view', 'recipient'),
      ('care_event.append', 'recipient'),
      ('care_note.view', 'recipient'),
      ('care_note.create', 'recipient'),
      ('task.view', 'recipient'),
      ('task.manage', 'recipient'),
      ('conversation.view', 'team'),
      ('conversation.manage', 'team'),
      ('message.send', 'team'),
      ('document.view', 'recipient'),
      ('document.upload', 'recipient'),
      ('document.manage', 'recipient'),
      ('imaging.view', 'recipient'),
      ('imaging.upload', 'recipient'),
      ('audit.view', 'team')
  )
  select coalesce(array_agg(capability order by capability), '{}'::text[])
    into v_advisory_capabilities
  from capability_catalog
  where case
    when scope = 'team' then public.has_team_capability(v_care_team_id, capability)
    else public.has_resource_capability(
      v_care_team_id,
      'care_recipient',
      v_care_recipient_id,
      capability
    )
  end;

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

  return query select
    'ready'::text,
    v_app_user_id,
    v_care_team_id,
    v_care_recipient_id,
    v_membership_id,
    v_membership_status,
    v_role_key,
    v_advisory_capabilities,
    v_permission_version;
  return;
exception
  when serialization_failure or deadlock_detected then
    return query select
      'retry_later'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      '{}'::text[],
      null::text;
end;
$$;

revoke all on function public.hydrate_permission_context() from public;
revoke all on function public.hydrate_permission_context() from anon;
grant execute on function public.hydrate_permission_context() to authenticated;
