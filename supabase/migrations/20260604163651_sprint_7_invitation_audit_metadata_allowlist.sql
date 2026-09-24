create or replace function public.audit_invitation_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_key text;
begin
  select r.role_key into v_role_key
  from public.roles r
  where r.id = new.role_id;

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
        'role_category', public.care_circle_role_category(v_role_key),
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
        'role_category', public.care_circle_role_category(v_role_key),
        'expiry_status', public.care_circle_expiry_status(new.expires_at),
        'result', public.care_circle_invite_status(new.status, new.expires_at)
      )
    );
  end if;

  return new;
end;
$$;
