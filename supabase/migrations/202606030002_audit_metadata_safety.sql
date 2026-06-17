-- Remove sensitive invitation details from future audit metadata and align
-- care-recipient creation audit rows with the care-team boundary.

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
      'invitation.created',
      'invitation',
      new.id,
      jsonb_build_object('status', new.status)
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    perform public.write_audit_event(
      new.care_team_id,
      new.care_recipient_id,
      coalesce(new.accepted_by, new.revoked_by, new.invited_by),
      new.invited_user_id,
      'invitation.' || new.status,
      'invitation',
      new.id,
      jsonb_build_object('previous_status', old.status, 'status', new.status)
    );
  end if;

  return new;
end;
$$;

create or replace function public.audit_care_recipient_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.primary_care_team_id is not null then
      perform public.write_audit_event(
        new.primary_care_team_id,
        new.id,
        new.created_by,
        null,
        'care_recipient.created',
        'care_recipient',
        new.id,
        jsonb_build_object('status', new.status)
      );
    end if;
  elsif tg_op = 'UPDATE'
    and old.primary_care_team_id is null
    and new.primary_care_team_id is not null then
    perform public.write_audit_event(
      new.primary_care_team_id,
      new.id,
      coalesce(new.created_by, public.current_app_user_id()),
      null,
      'care_recipient.created',
      'care_recipient',
      new.id,
      jsonb_build_object('status', new.status)
    );
  elsif tg_op = 'UPDATE' and old.archived_at is null and new.archived_at is not null then
    perform public.write_audit_event(
      new.primary_care_team_id,
      new.id,
      new.archived_by,
      null,
      'care_recipient.archived',
      'care_recipient',
      new.id,
      jsonb_build_object('previous_status', old.status, 'status', new.status)
    );
  elsif tg_op = 'UPDATE' and old.archived_at is not null and new.archived_at is null then
    perform public.write_audit_event(
      new.primary_care_team_id,
      new.id,
      public.current_app_user_id(),
      null,
      'care_recipient.restored',
      'care_recipient',
      new.id,
      jsonb_build_object('previous_status', old.status, 'status', new.status)
    );
  end if;

  return new;
end;
$$;
