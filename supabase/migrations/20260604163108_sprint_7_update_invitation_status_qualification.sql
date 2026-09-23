-- Sprint 7 narrow repair: qualify table references inside update_care_circle_invitation_status.
-- The prior revoke/expire update used unqualified columns that collide with
-- PL/pgSQL output column names such as status.

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

  select i.* into v_invitation
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

  update public.invitations i
  set status = p_target_status,
    revoked_by = case when p_target_status = 'revoked' then v_boundary.app_user_id else i.revoked_by end,
    revoked_at = case when p_target_status = 'revoked' then now() else i.revoked_at end
  where i.id = v_invitation.id
    and i.status = 'pending'
  returning * into v_invitation;

  return query select p_target_status, p_target_status;
end;
$$;

revoke all on function public.update_care_circle_invitation_status(jsonb, text) from public;
revoke all on function public.update_care_circle_invitation_status(jsonb, text) from anon;
revoke all on function public.update_care_circle_invitation_status(jsonb, text) from authenticated;
