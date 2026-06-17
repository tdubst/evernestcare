-- Sprint 7 narrow repair: qualify role lookup columns inside create_care_circle_invitation.
-- The prior function used unqualified role_key/status references, which collide with
-- PL/pgSQL output column names during runtime execution.

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

  select r.id into v_role_id
  from public.roles r
  where r.role_key = v_role_key
    and r.status = 'active';

  if v_role_id is null then
    return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, null::text, '[]'::jsonb, null::text;
    return;
  end if;

  select u.id into v_invited_user_id
  from public.users u
  where lower(u.email) = v_email
    and u.status = 'active'
    and u.deleted_at is null
  order by u.created_at
  limit 1;

  update public.invitations i
  set status = 'expired'
  where i.care_team_id = v_boundary.care_team_id
    and lower(i.email) = v_email
    and i.status = 'pending'
    and i.expires_at <= now();

  select * into v_invitation
  from public.invitations i
  where i.care_team_id = v_boundary.care_team_id
    and lower(i.email) = v_email
    and i.status = 'pending'
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

revoke all on function public.create_care_circle_invitation(jsonb) from public;
revoke all on function public.create_care_circle_invitation(jsonb) from anon;
grant execute on function public.create_care_circle_invitation(jsonb) to authenticated;
