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
  select ct.care_recipient_id into v_care_recipient_id
  from public.care_teams ct
  where ct.id = new.care_team_id;

  select r.role_key into v_role_key
  from public.roles r
  where r.id = new.role_id;

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
        'role_category', public.care_circle_role_category(v_role_key),
        'result', 'revoked'
      )
    );
  end if;

  return new;
end;
$$;
