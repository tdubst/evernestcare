-- Sprint 7 Care Circle, invitations, and permissions UX backend contracts.
-- Metadata-only RPC surface; RLS/RPC remains authoritative.

create or replace function public.invitation_preview_id(p_invitation_id uuid)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select left(encode(extensions.digest('evernest-invite-preview:' || p_invitation_id::text, 'sha256'), 'hex'), 32)
$$;

create or replace function public.care_circle_role_preview(p_role_key text)
returns jsonb
language sql
immutable
as $$
  select case
    when p_role_key = 'family_member' then jsonb_build_array(
      jsonb_build_object('category', 'care_circle', 'access', 'visible'),
      jsonb_build_object('category', 'coordination', 'access', 'can_help_coordinate'),
      jsonb_build_object('category', 'permissions', 'access', 'limited')
    )
    when p_role_key = 'viewer' then jsonb_build_array(
      jsonb_build_object('category', 'care_circle', 'access', 'visible'),
      jsonb_build_object('category', 'coordination', 'access', 'read_only'),
      jsonb_build_object('category', 'permissions', 'access', 'private')
    )
    else '[]'::jsonb
  end
$$;

create or replace function public.care_circle_role_category(p_role_key text)
returns text
language sql
immutable
as $$
  select case
    when p_role_key in ('owner', 'primary_caregiver') then 'care_lead'
    when p_role_key = 'family_member' then 'family'
    when p_role_key = 'viewer' then 'viewer'
    else 'limited'
  end
$$;

create or replace function public.care_circle_invite_status(
  p_status text,
  p_expires_at timestamptz
)
returns text
language sql
stable
as $$
  select case
    when p_status = 'declined' then 'denied'
    when p_status = 'pending' and p_expires_at <= now() then 'expired'
    else p_status
  end
$$;

create or replace function public.care_circle_expiry_status(p_expires_at timestamptz)
returns text
language sql
stable
as $$
  select case
    when p_expires_at is null then 'unavailable'
    when p_expires_at <= now() then 'expired'
    when p_expires_at <= now() + interval '3 days' then 'expires_soon'
    else 'active'
  end
$$;

create or replace function public.care_circle_active_boundary()
returns table (
  status text,
  app_user_id uuid,
  care_team_id uuid,
  care_recipient_id uuid,
  membership_id uuid,
  membership_status text,
  role_id uuid,
  role_key text,
  permission_version text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_active_count integer := 0;
  v_app_user_id uuid;
begin
  if auth.uid() is null then
    return query select
      'auth_required'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::uuid,
      null::text,
      null::text;
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
      null::uuid,
      null::text,
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
      'boundary_unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::uuid,
      null::text,
      null::text;
    return;
  end if;

  return query
  select
    case
      when ct.status <> 'active'
        or ct.deleted_at is not null
        or cr.status in ('archived', 'deleted')
        or cr.deleted_at is not null
        or cr.primary_care_team_id is distinct from ct.id
        then 'boundary_unavailable'
      else 'ready'
    end::text as status,
    v_app_user_id,
    ct.id,
    cr.id,
    ctm.id,
    ctm.status,
    r.id,
    r.role_key,
    greatest(
      ctm.updated_at,
      r.updated_at,
      ct.updated_at,
      cr.updated_at,
      coalesce(max(pg.updated_at), 'epoch'::timestamptz)
    )::text
  from public.care_team_members ctm
  join public.roles r on r.id = ctm.role_id
  join public.care_teams ct on ct.id = ctm.care_team_id
  join public.care_recipients cr on cr.id = ct.care_recipient_id
  left join public.permission_grants pg on pg.care_team_id = ctm.care_team_id
    and (
      pg.subject_user_id = ctm.user_id
      or pg.subject_role_id = ctm.role_id
    )
  where ctm.user_id = v_app_user_id
    and ctm.status = 'active'
    and ctm.revoked_at is null
    and r.status = 'active'
  group by ctm.id, ctm.status, ctm.updated_at, r.id, r.role_key, r.updated_at, ct.id, ct.status, ct.deleted_at, ct.updated_at, cr.id, cr.status, cr.deleted_at, cr.primary_care_team_id, cr.updated_at;
end;
$$;

create or replace function public.audit_invitation_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_event(
      new.care_team_id,
      new.care_recipient_id,
      new.invited_by,
      new.invited_user_id,
      'care_circle_invitation_created',
      'invitation',
      new.id,
      jsonb_build_object(
        'status', new.status,
        'role_key', (select r.role_key from public.roles r where r.id = new.role_id),
        'role_category', public.care_circle_role_category((select r.role_key from public.roles r where r.id = new.role_id)),
        'expiry_status', public.care_circle_expiry_status(new.expires_at),
        'result', 'created'
      )
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    perform public.write_audit_event(
      new.care_team_id,
      new.care_recipient_id,
      coalesce(new.accepted_by, new.revoked_by, new.invited_by),
      new.invited_user_id,
      case
        when new.status = 'declined' then 'care_circle_invitation_denied'
        else 'care_circle_invitation_' || public.care_circle_invite_status(new.status, new.expires_at)
      end,
      'invitation',
      new.id,
      jsonb_build_object(
        'previous_status', old.status,
        'status', public.care_circle_invite_status(new.status, new.expires_at),
        'role_key', (select r.role_key from public.roles r where r.id = new.role_id),
        'role_category', public.care_circle_role_category((select r.role_key from public.roles r where r.id = new.role_id)),
        'expiry_status', public.care_circle_expiry_status(new.expires_at),
        'result', public.care_circle_invite_status(new.status, new.expires_at)
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.audit_membership_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_care_recipient_id uuid;
  v_role_key text;
begin
  select care_recipient_id into v_care_recipient_id
  from public.care_teams
  where id = new.care_team_id;

  select role_key into v_role_key
  from public.roles
  where id = new.role_id;

  if tg_op = 'INSERT' then
    perform public.write_audit_event(
      new.care_team_id,
      v_care_recipient_id,
      new.invited_by,
      new.user_id,
      'care_circle_invitation_accepted',
      'care_team_member',
      new.id,
      jsonb_build_object(
        'status', new.status,
        'role_key', v_role_key,
        'role_category', public.care_circle_role_category(v_role_key),
        'result', 'accepted'
      )
    );
  elsif tg_op = 'UPDATE' and old.role_id is distinct from new.role_id then
    perform public.write_audit_event(
      new.care_team_id,
      v_care_recipient_id,
      coalesce(new.revoked_by, public.current_app_user_id()),
      new.user_id,
      'care_circle_role_update_accepted',
      'care_team_member',
      new.id,
      jsonb_build_object(
        'status', new.status,
        'role_key', v_role_key,
        'role_category', public.care_circle_role_category(v_role_key),
        'result', 'accepted'
      )
    );
  elsif tg_op = 'UPDATE' and old.revoked_at is null and new.revoked_at is not null then
    perform public.write_audit_event(
      new.care_team_id,
      v_care_recipient_id,
      new.revoked_by,
      new.user_id,
      'care_circle_invitation_revoked',
      'care_team_member',
      new.id,
      jsonb_build_object(
        'previous_status', old.status,
        'status', new.status,
        'role_key', v_role_key,
        'role_category', public.care_circle_role_category(v_role_key),
        'result', 'revoked'
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.hydrate_care_circle_context(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  permission_version text,
  care_circle jsonb,
  pending_invitations jsonb,
  advisory_permissions jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boundary record;
  v_can_manage_invitations boolean := false;
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    return query select 'invalid_request'::text, null::text, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb;
    return;
  end if;

  select * into v_boundary from public.care_circle_active_boundary() limit 1;

  if v_boundary.status <> 'ready' then
    return query select v_boundary.status, null::text, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb;
    return;
  end if;

  if not public.has_team_capability(v_boundary.care_team_id, 'team.view') then
    return query select 'denied'::text, null::text, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb;
    return;
  end if;

  v_can_manage_invitations := public.has_team_capability(v_boundary.care_team_id, 'invitation.manage');

  return query
  with member_rows as (
    select
      row_number() over (order by ctm.created_at, ctm.id)::integer as row_number,
      case
        when ctm.user_id = v_boundary.app_user_id then 'current_user'
        else 'member_' || row_number() over (order by ctm.created_at, ctm.id)::text
      end as safe_alias,
      ctm.status as membership_status,
      public.care_circle_role_category(r.role_key) as role_category
    from public.care_team_members ctm
    join public.roles r on r.id = ctm.role_id
    join public.users u on u.id = ctm.user_id
    where ctm.care_team_id = v_boundary.care_team_id
      and ctm.status in ('active', 'invited', 'revoked', 'left')
      and u.deleted_at is null
  ),
  invitation_rows as (
    select
      public.invitation_preview_id(i.id) as invite_preview_id,
      public.care_circle_invite_status(i.status, i.expires_at) as invite_status,
      public.care_circle_role_category(r.role_key) as role_category,
      case when r.role_key = 'viewer' then 'read_only_family' else 'family_coordination' end as audience_category,
      public.care_circle_role_preview(r.role_key) as capability_categories,
      public.care_circle_expiry_status(i.expires_at) as expiry_status,
      greatest(0, ceil(extract(epoch from (i.expires_at - now())) / 86400.0)::integer)::text || '_days' as expires_in
    from public.invitations i
    join public.roles r on r.id = i.role_id
    where i.care_team_id = v_boundary.care_team_id
      and v_can_manage_invitations
      and i.status in ('pending', 'accepted', 'expired', 'revoked', 'declined')
    order by i.created_at desc
    limit 25
  ),
  permission_rows as (
    select *
    from (values
      ('team.view', public.has_team_capability(v_boundary.care_team_id, 'team.view')),
      ('invitation.manage', public.has_team_capability(v_boundary.care_team_id, 'invitation.manage')),
      ('permissions.manage', public.has_team_capability(v_boundary.care_team_id, 'permissions.manage')),
      ('team.manage', public.has_team_capability(v_boundary.care_team_id, 'team.manage'))
    ) as p(capability, allowed)
  )
  select
    'ready'::text,
    v_boundary.permission_version,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
        'subject_alias', safe_alias,
        'membership_status', membership_status,
        'role_category', role_category
      ) order by row_number) from member_rows),
      '[]'::jsonb
    ),
    coalesce(
      (select jsonb_agg(jsonb_build_object(
        'invite_preview_id', invite_preview_id,
        'invite_status', invite_status,
        'role_category', role_category,
        'audience_category', audience_category,
        'capability_categories', capability_categories,
        'expiry_status', expiry_status,
        'expires_in', expires_in
      )) from invitation_rows),
      '[]'::jsonb
    ),
    coalesce(
      (select jsonb_agg(jsonb_build_object(
        'capability_key', capability,
        'access_state', case when allowed then 'allowed' else 'denied' end,
        'source_scope', 'server_projection',
        'result', case when allowed then 'allowed' else 'denied' end
      ) order by capability) from permission_rows),
      '[]'::jsonb
    );
end;
$$;

create or replace function public.get_care_circle_summary(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  permission_version text,
  care_circle jsonb,
  pending_invitations jsonb,
  advisory_permissions jsonb
)
language sql
security definer
set search_path = public
as $$
  select * from public.hydrate_care_circle_context(p_request)
$$;

create or replace function public.get_permissions_advisory_summary(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  permission_version text,
  advisory_permissions jsonb
)
language sql
security definer
set search_path = public
as $$
  select status, permission_version, advisory_permissions
  from public.hydrate_care_circle_context(p_request)
$$;

create or replace function public.list_care_circle_invitations(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  invitations jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid;
  v_email text;
begin
  if auth.uid() is null then
    return query select 'auth_required'::text, '[]'::jsonb;
    return;
  end if;

  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    return query select 'invalid_request'::text, '[]'::jsonb;
    return;
  end if;

  v_app_user_id := public.current_app_user_id();

  if v_app_user_id is null then
    return query select 'boundary_unavailable'::text, '[]'::jsonb;
    return;
  end if;

  select lower(email) into v_email
  from public.users
  where id = v_app_user_id;

  return query
  select
    'ready'::text,
    coalesce(jsonb_agg(jsonb_build_object(
      'invite_preview_id', public.invitation_preview_id(i.id),
      'invite_status', public.care_circle_invite_status(i.status, i.expires_at),
      'role_category', public.care_circle_role_category(r.role_key),
      'audience_category', case when r.role_key = 'viewer' then 'read_only_family' else 'family_coordination' end,
      'capability_categories', public.care_circle_role_preview(r.role_key),
      'expiry_status', public.care_circle_expiry_status(i.expires_at),
      'expires_in', greatest(0, ceil(extract(epoch from (i.expires_at - now())) / 86400.0)::integer)::text || '_days'
    ) order by i.created_at desc), '[]'::jsonb)
  from public.invitations i
  join public.roles r on r.id = i.role_id
  join public.care_teams ct on ct.id = i.care_team_id
  join public.care_recipients cr on cr.id = i.care_recipient_id
  where (i.invited_user_id = v_app_user_id or lower(i.email) = v_email)
    and ct.status = 'active'
    and ct.deleted_at is null
    and cr.status not in ('archived', 'deleted')
    and cr.deleted_at is null
  limit 25;
end;
$$;

create or replace function public.preview_care_circle_invitation(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  role_category text,
  audience_category text,
  capability_categories jsonb,
  expiry_status text,
  expires_in text,
  permission_version text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boundary record;
  v_expires_in_days integer := 7;
  v_role_key text;
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    return query select 'invalid_request'::text, null::text, null::text, '[]'::jsonb, null::text, null::text, null::text;
    return;
  end if;

  select * into v_boundary from public.care_circle_active_boundary() limit 1;

  if v_boundary.status <> 'ready' then
    return query select v_boundary.status, null::text, null::text, '[]'::jsonb, null::text, null::text, null::text;
    return;
  end if;

  if p_request ? 'permission_version'
    and nullif(p_request->>'permission_version', '') is distinct from v_boundary.permission_version then
    return query select 'stale_permission_context'::text, null::text, null::text, '[]'::jsonb, null::text, null::text, null::text;
    return;
  end if;

  if not public.has_team_capability(v_boundary.care_team_id, 'invitation.manage') then
    return query select 'denied'::text, null::text, null::text, '[]'::jsonb, null::text, null::text, null::text;
    return;
  end if;

  if jsonb_typeof(p_request->'role_key') is distinct from 'string' then
    return query select 'invalid_request'::text, null::text, null::text, '[]'::jsonb, null::text, null::text, null::text;
    return;
  end if;

  v_role_key := p_request->>'role_key';

  if v_role_key not in ('family_member', 'viewer') then
    return query select 'invalid_request'::text, null::text, null::text, '[]'::jsonb, null::text, null::text, null::text;
    return;
  end if;

  if p_request ? 'expires_in_days' then
    if jsonb_typeof(p_request->'expires_in_days') is distinct from 'number'
      or p_request->>'expires_in_days' !~ '^[0-9]+$' then
      return query select 'invalid_request'::text, null::text, null::text, '[]'::jsonb, null::text, null::text, null::text;
      return;
    end if;
    v_expires_in_days := (p_request->>'expires_in_days')::integer;
  end if;

  if v_expires_in_days < 1 or v_expires_in_days > 14 then
    return query select 'invalid_request'::text, null::text, null::text, '[]'::jsonb, null::text, null::text, null::text;
    return;
  end if;

  return query select
    'ready'::text,
    public.care_circle_role_category(v_role_key),
    case when v_role_key = 'viewer' then 'read_only_family' else 'family_coordination' end,
    public.care_circle_role_preview(v_role_key),
    'active'::text,
    v_expires_in_days::text || '_days',
    v_boundary.permission_version;
end;
$$;

create or replace function public.create_care_circle_invitation(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  invite_preview_id text,
  invite_status text,
  role_category text,
  audience_category text,
  expiry_status text,
  expires_in text,
  capability_categories jsonb,
  permission_version text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_boundary record;
  v_email text;
  v_expires_at timestamptz;
  v_expires_in_days integer := 7;
  v_invitation public.invitations%rowtype;
  v_invited_user_id uuid;
  v_role_id uuid;
  v_role_key text;
  v_created boolean := false;
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, null::text, '[]'::jsonb, null::text;
    return;
  end if;

  select * into v_boundary from public.care_circle_active_boundary() limit 1;

  if v_boundary.status <> 'ready' then
    return query select v_boundary.status, null::text, null::text, null::text, null::text, null::text, null::text, '[]'::jsonb, null::text;
    return;
  end if;

  if p_request ? 'permission_version'
    and nullif(p_request->>'permission_version', '') is distinct from v_boundary.permission_version then
    return query select 'stale_permission_context'::text, null::text, null::text, null::text, null::text, null::text, null::text, '[]'::jsonb, null::text;
    return;
  end if;

  if not public.has_team_capability(v_boundary.care_team_id, 'invitation.manage') then
    return query select 'denied'::text, null::text, null::text, null::text, null::text, null::text, null::text, '[]'::jsonb, null::text;
    return;
  end if;

  if jsonb_typeof(p_request->'invited_email') is distinct from 'string'
    or jsonb_typeof(p_request->'role_key') is distinct from 'string' then
    return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, null::text, '[]'::jsonb, null::text;
    return;
  end if;

  v_email := lower(btrim(p_request->>'invited_email'));
  v_role_key := p_request->>'role_key';

  if length(v_email) > 254
    or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
    or v_role_key not in ('family_member', 'viewer') then
    return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, null::text, '[]'::jsonb, null::text;
    return;
  end if;

  if p_request ? 'expires_in_days' then
    if jsonb_typeof(p_request->'expires_in_days') is distinct from 'number'
      or p_request->>'expires_in_days' !~ '^[0-9]+$' then
      return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, null::text, '[]'::jsonb, null::text;
      return;
    end if;
    v_expires_in_days := (p_request->>'expires_in_days')::integer;
  end if;

  if v_expires_in_days < 1 or v_expires_in_days > 14 then
    return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, null::text, '[]'::jsonb, null::text;
    return;
  end if;

  select id into v_role_id
  from public.roles
  where role_key = v_role_key
    and status = 'active';

  if v_role_id is null then
    return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, null::text, '[]'::jsonb, null::text;
    return;
  end if;

  select id into v_invited_user_id
  from public.users
  where lower(email) = v_email
    and status = 'active'
    and deleted_at is null
  order by created_at
  limit 1;

  update public.invitations
  set status = 'expired'
  where care_team_id = v_boundary.care_team_id
    and lower(email) = v_email
    and status = 'pending'
    and expires_at <= now();

  select * into v_invitation
  from public.invitations
  where care_team_id = v_boundary.care_team_id
    and lower(email) = v_email
    and status = 'pending'
  limit 1;

  if v_invitation.id is null then
    v_expires_at := now() + make_interval(days => v_expires_in_days);

    insert into public.invitations (
      care_team_id,
      care_recipient_id,
      email,
      invited_user_id,
      role_id,
      token_hash,
      status,
      invited_by,
      expires_at
    )
    values (
      v_boundary.care_team_id,
      v_boundary.care_recipient_id,
      v_email,
      v_invited_user_id,
      v_role_id,
      encode(extensions.digest(gen_random_uuid()::text || clock_timestamp()::text, 'sha256'), 'hex'),
      'pending',
      v_boundary.app_user_id,
      v_expires_at
    )
    returning * into v_invitation;
    v_created := true;
  end if;

  select r.role_key into v_role_key
  from public.roles r
  where r.id = v_invitation.role_id;

  return query select
    case when v_created then 'created' else 'duplicate_request' end::text,
    public.invitation_preview_id(v_invitation.id),
    public.care_circle_invite_status(v_invitation.status, v_invitation.expires_at),
    public.care_circle_role_category(v_role_key),
    case when v_role_key = 'viewer' then 'read_only_family' else 'family_coordination' end,
    public.care_circle_expiry_status(v_invitation.expires_at),
    greatest(0, ceil(extract(epoch from (v_invitation.expires_at - now())) / 86400.0)::integer)::text || '_days',
    public.care_circle_role_preview(v_role_key),
    v_boundary.permission_version;
end;
$$;

create or replace function public.resolve_care_circle_invitation(
  p_invite_preview_id text,
  p_action text
)
returns table (
  status text,
  invite_status text,
  role_category text,
  audience_category text,
  capability_categories jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid;
  v_email text;
  v_invitation public.invitations%rowtype;
  v_role_key text;
begin
  if auth.uid() is null then
    return query select 'auth_required'::text, null::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  v_app_user_id := public.current_app_user_id();

  if v_app_user_id is null
    or nullif(btrim(coalesce(p_invite_preview_id, '')), '') is null
    or length(p_invite_preview_id) > 64
    or p_action not in ('accept', 'deny') then
    return query select 'invalid_request'::text, null::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  select lower(email) into v_email
  from public.users
  where id = v_app_user_id;

  select i.* into v_invitation
  from public.invitations i
  join public.care_teams ct on ct.id = i.care_team_id
  join public.care_recipients cr on cr.id = i.care_recipient_id
  where public.invitation_preview_id(i.id) = p_invite_preview_id
    and ct.status = 'active'
    and ct.deleted_at is null
    and cr.status not in ('archived', 'deleted')
    and cr.deleted_at is null
  limit 1;

  if v_invitation.id is null then
    return query select 'denied'::text, null::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  if not (v_invitation.invited_user_id = v_app_user_id or lower(v_invitation.email) = v_email) then
    return query select 'wrong_audience'::text, null::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  select role_key into v_role_key from public.roles where id = v_invitation.role_id;

  if v_invitation.status = 'accepted' then
    return query select 'already_used'::text, 'accepted'::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  if v_invitation.status in ('revoked', 'declined') then
    return query select public.care_circle_invite_status(v_invitation.status, v_invitation.expires_at), public.care_circle_invite_status(v_invitation.status, v_invitation.expires_at), null::text, null::text, '[]'::jsonb;
    return;
  end if;

  if v_invitation.status = 'expired' or v_invitation.expires_at <= now() then
    update public.invitations
    set status = 'expired'
    where id = v_invitation.id
      and status = 'pending';
    return query select 'expired'::text, 'expired'::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  if p_action = 'deny' then
    update public.invitations
    set status = 'declined',
      invited_user_id = coalesce(invited_user_id, v_app_user_id)
    where id = v_invitation.id
      and status = 'pending'
    returning * into v_invitation;

    return query select 'denied'::text, 'denied'::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  insert into public.care_team_members (
    care_team_id,
    user_id,
    role_id,
    status,
    invited_by,
    joined_at
  )
  values (
    v_invitation.care_team_id,
    v_app_user_id,
    v_invitation.role_id,
    'active',
    v_invitation.invited_by,
    now()
  )
  on conflict (care_team_id, user_id) do update set
    role_id = excluded.role_id,
    status = 'active',
    invited_by = excluded.invited_by,
    joined_at = coalesce(public.care_team_members.joined_at, now()),
    revoked_by = null,
    revoked_at = null,
    updated_at = now();

  update public.invitations
  set status = 'accepted',
    invited_user_id = coalesce(invited_user_id, v_app_user_id),
    accepted_by = v_app_user_id,
    accepted_at = coalesce(accepted_at, now())
  where id = v_invitation.id
  returning * into v_invitation;

  return query select 'accepted'::text, 'accepted'::text, public.care_circle_role_category(v_role_key), case when v_role_key = 'viewer' then 'read_only_family' else 'family_coordination' end, public.care_circle_role_preview(v_role_key);
end;
$$;

create or replace function public.accept_care_circle_invitation(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  invite_status text,
  role_category text,
  audience_category text,
  capability_categories jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object' or jsonb_typeof(p_request->'invite_preview_id') is distinct from 'string' then
    return query select 'invalid_request'::text, null::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  return query
  select *
  from public.resolve_care_circle_invitation(p_request->>'invite_preview_id', 'accept');
end;
$$;

create or replace function public.deny_care_circle_invitation(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  invite_status text,
  role_category text,
  audience_category text,
  capability_categories jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object' or jsonb_typeof(p_request->'invite_preview_id') is distinct from 'string' then
    return query select 'invalid_request'::text, null::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  return query
  select *
  from public.resolve_care_circle_invitation(p_request->>'invite_preview_id', 'deny');
end;
$$;

create or replace function public.update_care_circle_invitation_status(
  p_request jsonb,
  p_target_status text
)
returns table (
  status text,
  invite_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boundary record;
  v_invitation public.invitations%rowtype;
begin
  if p_request is null
    or jsonb_typeof(p_request) <> 'object'
    or jsonb_typeof(p_request->'invite_preview_id') is distinct from 'string'
    or p_target_status not in ('revoked', 'expired') then
    return query select 'invalid_request'::text, null::text;
    return;
  end if;

  select * into v_boundary from public.care_circle_active_boundary() limit 1;

  if v_boundary.status <> 'ready' then
    return query select v_boundary.status, null::text;
    return;
  end if;

  if p_request ? 'permission_version'
    and nullif(p_request->>'permission_version', '') is distinct from v_boundary.permission_version then
    return query select 'stale_permission_context'::text, null::text;
    return;
  end if;

  if not public.has_team_capability(v_boundary.care_team_id, 'invitation.manage') then
    return query select 'denied'::text, null::text;
    return;
  end if;

  select * into v_invitation
  from public.invitations i
  where i.care_team_id = v_boundary.care_team_id
    and public.invitation_preview_id(i.id) = p_request->>'invite_preview_id'
  limit 1;

  if v_invitation.id is null then
    return query select 'denied'::text, null::text;
    return;
  end if;

  if v_invitation.status = 'accepted' then
    return query select 'accepted'::text, 'accepted'::text;
    return;
  end if;

  if v_invitation.status in ('revoked', 'expired', 'declined') then
    return query select public.care_circle_invite_status(v_invitation.status, v_invitation.expires_at), public.care_circle_invite_status(v_invitation.status, v_invitation.expires_at);
    return;
  end if;

  update public.invitations
  set status = p_target_status,
    revoked_by = case when p_target_status = 'revoked' then v_boundary.app_user_id else revoked_by end,
    revoked_at = case when p_target_status = 'revoked' then now() else revoked_at end
  where id = v_invitation.id
    and status = 'pending'
  returning * into v_invitation;

  return query select p_target_status, p_target_status;
end;
$$;

create or replace function public.revoke_care_circle_invitation(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  invite_status text
)
language sql
security definer
set search_path = public
as $$
  select * from public.update_care_circle_invitation_status(p_request, 'revoked')
$$;

create or replace function public.expire_care_circle_invitation(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  invite_status text
)
language sql
security definer
set search_path = public
as $$
  select * from public.update_care_circle_invitation_status(p_request, 'expired')
$$;

create or replace function public.expire_care_circle_invitations(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  result text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boundary record;
  v_expired_count integer := 0;
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    return query select 'invalid_request'::text, null::text;
    return;
  end if;

  select * into v_boundary from public.care_circle_active_boundary() limit 1;

  if v_boundary.status <> 'ready' then
    return query select v_boundary.status, null::text;
    return;
  end if;

  if p_request ? 'permission_version'
    and nullif(p_request->>'permission_version', '') is distinct from v_boundary.permission_version then
    return query select 'stale_permission_context'::text, null::text;
    return;
  end if;

  if not public.has_team_capability(v_boundary.care_team_id, 'invitation.manage') then
    return query select 'denied'::text, null::text;
    return;
  end if;

  update public.invitations
  set status = 'expired'
  where care_team_id = v_boundary.care_team_id
    and status = 'pending'
    and expires_at <= now();

  get diagnostics v_expired_count = row_count;

  return query select
    'ready'::text,
    case when v_expired_count > 0 then 'expired' else 'no_elapsed_invitations' end::text;
end;
$$;

revoke all on function public.invitation_preview_id(uuid) from public;
revoke all on function public.invitation_preview_id(uuid) from anon;
revoke all on function public.invitation_preview_id(uuid) from authenticated;

revoke all on function public.care_circle_role_preview(text) from public;
revoke all on function public.care_circle_role_preview(text) from anon;
revoke all on function public.care_circle_role_preview(text) from authenticated;

revoke all on function public.care_circle_role_category(text) from public;
revoke all on function public.care_circle_role_category(text) from anon;
revoke all on function public.care_circle_role_category(text) from authenticated;

revoke all on function public.care_circle_invite_status(text, timestamptz) from public;
revoke all on function public.care_circle_invite_status(text, timestamptz) from anon;
revoke all on function public.care_circle_invite_status(text, timestamptz) from authenticated;

revoke all on function public.care_circle_expiry_status(timestamptz) from public;
revoke all on function public.care_circle_expiry_status(timestamptz) from anon;
revoke all on function public.care_circle_expiry_status(timestamptz) from authenticated;

revoke all on function public.care_circle_active_boundary() from public;
revoke all on function public.care_circle_active_boundary() from anon;
revoke all on function public.care_circle_active_boundary() from authenticated;

revoke all on function public.resolve_care_circle_invitation(text, text) from public;
revoke all on function public.resolve_care_circle_invitation(text, text) from anon;
revoke all on function public.resolve_care_circle_invitation(text, text) from authenticated;

revoke all on function public.update_care_circle_invitation_status(jsonb, text) from public;
revoke all on function public.update_care_circle_invitation_status(jsonb, text) from anon;
revoke all on function public.update_care_circle_invitation_status(jsonb, text) from authenticated;

revoke all on function public.hydrate_care_circle_context(jsonb) from public;
revoke all on function public.hydrate_care_circle_context(jsonb) from anon;
grant execute on function public.hydrate_care_circle_context(jsonb) to authenticated;

revoke all on function public.get_care_circle_summary(jsonb) from public;
revoke all on function public.get_care_circle_summary(jsonb) from anon;
grant execute on function public.get_care_circle_summary(jsonb) to authenticated;

revoke all on function public.get_permissions_advisory_summary(jsonb) from public;
revoke all on function public.get_permissions_advisory_summary(jsonb) from anon;
grant execute on function public.get_permissions_advisory_summary(jsonb) to authenticated;

revoke all on function public.list_care_circle_invitations(jsonb) from public;
revoke all on function public.list_care_circle_invitations(jsonb) from anon;
grant execute on function public.list_care_circle_invitations(jsonb) to authenticated;

revoke all on function public.preview_care_circle_invitation(jsonb) from public;
revoke all on function public.preview_care_circle_invitation(jsonb) from anon;
grant execute on function public.preview_care_circle_invitation(jsonb) to authenticated;

revoke all on function public.create_care_circle_invitation(jsonb) from public;
revoke all on function public.create_care_circle_invitation(jsonb) from anon;
grant execute on function public.create_care_circle_invitation(jsonb) to authenticated;

revoke all on function public.accept_care_circle_invitation(jsonb) from public;
revoke all on function public.accept_care_circle_invitation(jsonb) from anon;
grant execute on function public.accept_care_circle_invitation(jsonb) to authenticated;

revoke all on function public.deny_care_circle_invitation(jsonb) from public;
revoke all on function public.deny_care_circle_invitation(jsonb) from anon;
grant execute on function public.deny_care_circle_invitation(jsonb) to authenticated;

revoke all on function public.revoke_care_circle_invitation(jsonb) from public;
revoke all on function public.revoke_care_circle_invitation(jsonb) from anon;
grant execute on function public.revoke_care_circle_invitation(jsonb) to authenticated;

revoke all on function public.expire_care_circle_invitation(jsonb) from public;
revoke all on function public.expire_care_circle_invitation(jsonb) from anon;
grant execute on function public.expire_care_circle_invitation(jsonb) to authenticated;

revoke all on function public.expire_care_circle_invitations(jsonb) from public;
revoke all on function public.expire_care_circle_invitations(jsonb) from anon;
grant execute on function public.expire_care_circle_invitations(jsonb) to authenticated;
