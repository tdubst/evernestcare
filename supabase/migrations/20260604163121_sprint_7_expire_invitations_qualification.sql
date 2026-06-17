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

  update public.invitations i
  set status = 'expired'
  where i.care_team_id = v_boundary.care_team_id
    and i.status = 'pending'
    and i.expires_at <= now();

  get diagnostics v_expired_count = row_count;

  return query select
    'ready'::text,
    case when v_expired_count > 0 then 'expired' else 'no_elapsed_invitations' end::text;
end;
$$;

revoke all on function public.expire_care_circle_invitations(jsonb) from public;
revoke all on function public.expire_care_circle_invitations(jsonb) from anon;
grant execute on function public.expire_care_circle_invitations(jsonb) to authenticated;
