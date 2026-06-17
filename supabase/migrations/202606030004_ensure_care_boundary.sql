-- Transactional Sprint 3 care-boundary bootstrap.
-- Replaces client-side multi-step first-run setup with an authenticated RPC.

create or replace function public.ensure_care_boundary(
  p_recipient_display_name text default null,
  p_relationship_context text default null,
  p_requested_care_recipient_id uuid default null
)
returns table (
  status text,
  app_user_id uuid,
  active_care_team_id uuid,
  active_care_recipient_id uuid,
  membership_id uuid,
  role_key text,
  membership_status text,
  created_user boolean,
  created_recipient boolean,
  created_team boolean,
  created_membership boolean,
  reused_existing boolean,
  permission_version text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count integer := 0;
  v_app_user_deleted_at timestamptz;
  v_app_user_id uuid;
  v_app_user_status text;
  v_auth_display_name text;
  v_auth_email text;
  v_auth_user_id uuid := auth.uid();
  v_care_recipient_id uuid;
  v_care_recipient_primary_team_id uuid;
  v_care_recipient_status text;
  v_care_recipient_deleted_at timestamptz;
  v_care_team_deleted_at timestamptz;
  v_care_team_id uuid;
  v_care_team_status text;
  v_membership_id uuid;
  v_membership_status text;
  v_owner_role_id uuid;
  v_permission_version text;
  v_recipient_display_name text;
  v_relationship_context text;
  v_role_key text;
begin
  if v_auth_user_id is null then
    return query select
      'auth_required'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      false,
      false,
      false,
      false,
      false,
      null::text;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_auth_user_id::text, 0));

  select u.id, u.status, u.deleted_at
    into v_app_user_id, v_app_user_status, v_app_user_deleted_at
  from public.users u
  where u.auth_user_id = v_auth_user_id
  limit 1;

  if v_app_user_id is not null and (
    v_app_user_status <> 'active'
    or v_app_user_deleted_at is not null
  ) then
    return query select
      'user_unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      false,
      false,
      false,
      false,
      false,
      null::text;
    return;
  end if;

  if v_app_user_id is null then
    v_auth_email := nullif(auth.jwt() ->> 'email', '');
    v_auth_display_name := coalesce(
      nullif(auth.jwt() #>> '{user_metadata,full_name}', ''),
      nullif(auth.jwt() #>> '{user_metadata,name}', ''),
      nullif(split_part(coalesce(v_auth_email, ''), '@', 1), ''),
      'Caregiver'
    );

    insert into public.users (
      auth_user_id,
      display_name,
      email,
      status
    )
    values (
      v_auth_user_id,
      v_auth_display_name,
      coalesce(v_auth_email, v_auth_user_id::text || '@auth.evernest.local'),
      'active'
    )
    returning id into v_app_user_id;

    created_user := true;
  else
    created_user := false;
  end if;

  select count(*) into v_active_count
  from public.care_team_members ctm
  where ctm.user_id = v_app_user_id
    and ctm.status = 'active'
    and ctm.revoked_at is null;

  if v_active_count > 1 and p_requested_care_recipient_id is null then
    return query select
      'multiple_active_memberships'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      false,
      false,
      false,
      false,
      false,
      null::text;
    return;
  end if;

  if v_active_count > 0 then
    select
      ctm.id,
      ctm.status,
      r.role_key,
      ct.id,
      ct.status,
      ct.deleted_at,
      cr.id,
      cr.status,
      cr.deleted_at,
      cr.primary_care_team_id,
      greatest(ctm.updated_at, ct.updated_at, cr.updated_at)::text
    into
      v_membership_id,
      v_membership_status,
      v_role_key,
      v_care_team_id,
      v_care_team_status,
      v_care_team_deleted_at,
      v_care_recipient_id,
      v_care_recipient_status,
      v_care_recipient_deleted_at,
      v_care_recipient_primary_team_id,
      v_permission_version
    from public.care_team_members ctm
    join public.roles r on r.id = ctm.role_id
    join public.care_teams ct on ct.id = ctm.care_team_id
    join public.care_recipients cr on cr.id = ct.care_recipient_id
    where ctm.user_id = v_app_user_id
      and ctm.status = 'active'
      and ctm.revoked_at is null
      and (
        p_requested_care_recipient_id is null
        or cr.id = p_requested_care_recipient_id
      )
    order by ctm.created_at asc
    limit 1;

    if v_membership_id is null then
      return query select
        'boundary_unavailable'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        false,
        false,
        false,
        false,
        false,
        null::text;
      return;
    end if;

    if v_care_team_status <> 'active'
      or v_care_team_deleted_at is not null
      or v_care_recipient_status in ('archived', 'deleted')
      or v_care_recipient_deleted_at is not null then
      return query select
        'boundary_unavailable'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        false,
        false,
        false,
        false,
        false,
        null::text;
      return;
    end if;

    if v_care_recipient_primary_team_id is null then
      update public.care_recipients
      set primary_care_team_id = v_care_team_id
      where id = v_care_recipient_id;

      v_permission_version := clock_timestamp()::text;
    elsif v_care_recipient_primary_team_id <> v_care_team_id then
      return query select
        'boundary_unavailable'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        false,
        false,
        false,
        false,
        false,
        null::text;
      return;
    end if;

    return query select
      'ready'::text,
      v_app_user_id,
      v_care_team_id,
      v_care_recipient_id,
      v_membership_id,
      v_role_key,
      v_membership_status,
      created_user,
      false,
      false,
      false,
      true,
      v_permission_version;
    return;
  end if;

  if p_requested_care_recipient_id is not null then
    return query select
      'boundary_unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      false,
      false,
      false,
      false,
      false,
      null::text;
    return;
  end if;

  select r.id into v_owner_role_id
  from public.roles r
  where r.role_key = 'owner'
    and r.status = 'active'
  limit 1;

  if v_owner_role_id is null then
    return query select
      'boundary_unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      false,
      false,
      false,
      false,
      false,
      null::text;
    return;
  end if;

  v_recipient_display_name := coalesce(nullif(btrim(p_recipient_display_name), ''), 'Family member');
  v_relationship_context := coalesce(nullif(btrim(p_relationship_context), ''), 'Care coordination');

  insert into public.care_recipients (
    created_by,
    display_name,
    onboarding_state,
    relationship_context,
    status
  )
  values (
    v_app_user_id,
    v_recipient_display_name,
    jsonb_build_object('source', 'ensure_care_boundary'),
    v_relationship_context,
    'active'
  )
  returning id into v_care_recipient_id;

  insert into public.care_teams (
    care_recipient_id,
    created_by,
    name,
    status
  )
  values (
    v_care_recipient_id,
    v_app_user_id,
    'Family care team',
    'active'
  )
  returning id into v_care_team_id;

  insert into public.care_team_members (
    care_team_id,
    invited_by,
    joined_at,
    role_id,
    status,
    user_id
  )
  values (
    v_care_team_id,
    v_app_user_id,
    now(),
    v_owner_role_id,
    'active',
    v_app_user_id
  )
  returning id, status into v_membership_id, v_membership_status;

  update public.care_recipients
  set primary_care_team_id = v_care_team_id
  where id = v_care_recipient_id;

  select greatest(ctm.updated_at, ct.updated_at, cr.updated_at)::text
    into v_permission_version
  from public.care_team_members ctm
  join public.care_teams ct on ct.id = ctm.care_team_id
  join public.care_recipients cr on cr.id = ct.care_recipient_id
  where ctm.id = v_membership_id;

  return query select
    'ready'::text,
    v_app_user_id,
    v_care_team_id,
    v_care_recipient_id,
    v_membership_id,
    'owner'::text,
    v_membership_status,
    created_user,
    true,
    true,
    true,
    false,
    v_permission_version;
  return;
exception
  when unique_violation or serialization_failure or deadlock_detected then
    return query select
      'retry_later'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      false,
      false,
      false,
      false,
      false,
      null::text;
end;
$$;

revoke all on function public.ensure_care_boundary(text, text, uuid) from public;
revoke all on function public.ensure_care_boundary(text, text, uuid) from anon;
grant execute on function public.ensure_care_boundary(text, text, uuid) to authenticated;
