-- Sprint 7 repair: non-success invitation resolution must not echo role,
-- audience, or capability summaries.

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

  if v_invitation.status = 'accepted' then
    return query select 'already_used'::text, null::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  if v_invitation.status in ('revoked', 'declined') then
    return query select public.care_circle_invite_status(v_invitation.status, v_invitation.expires_at), null::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  if v_invitation.status = 'expired' or v_invitation.expires_at <= now() then
    update public.invitations
    set status = 'expired'
    where id = v_invitation.id
      and status = 'pending';
    return query select 'expired'::text, null::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  if p_action = 'deny' then
    update public.invitations
    set status = 'declined',
      invited_user_id = coalesce(invited_user_id, v_app_user_id)
    where id = v_invitation.id
      and status = 'pending';

    return query select 'denied'::text, null::text, null::text, null::text, '[]'::jsonb;
    return;
  end if;

  select role_key into v_role_key
  from public.roles
  where id = v_invitation.role_id;

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

revoke all on function public.resolve_care_circle_invitation(text, text) from public;
revoke all on function public.resolve_care_circle_invitation(text, text) from anon;
revoke all on function public.resolve_care_circle_invitation(text, text) from authenticated;
