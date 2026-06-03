-- Evernest Care operational event persistence.
-- Extends the core trust runtime without replacing the canonical local event reducer.

create or replace function public.evernest_role_allows(p_role_key text, p_capability text)
returns boolean
language sql
immutable
as $$
  select case
    when p_role_key = 'owner' then true
    when p_role_key = 'primary_caregiver' then p_capability = any(array[
      'recipient.view', 'recipient.manage',
      'team.view', 'invitation.manage', 'permissions.manage',
      'appointment.view', 'appointment.manage',
      'medication.view', 'medication.manage', 'medication.log',
      'vitals.view', 'vitals.log',
      'care_event.view', 'care_event.append',
      'care_note.view', 'care_note.create',
      'task.view', 'task.manage',
      'conversation.view', 'conversation.manage', 'message.send',
      'document.view', 'document.upload', 'document.manage',
      'imaging.view', 'imaging.upload',
      'audit.view'
    ])
    when p_role_key = 'family_member' then p_capability = any(array[
      'recipient.view', 'team.view',
      'appointment.view',
      'medication.view', 'medication.log',
      'vitals.view', 'vitals.log',
      'care_event.view', 'care_event.append',
      'care_note.view', 'care_note.create',
      'task.view', 'task.manage',
      'conversation.view', 'message.send',
      'document.view', 'document.upload',
      'imaging.view'
    ])
    when p_role_key = 'viewer' then p_capability = any(array[
      'recipient.view', 'team.view',
      'appointment.view',
      'medication.view',
      'vitals.view',
      'care_event.view',
      'care_note.view',
      'task.view',
      'document.view',
      'imaging.view'
    ])
    else false
  end
$$;

create table public.care_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id text not null,
  care_team_id uuid not null references public.care_teams(id) on delete cascade,
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  actor_user_id uuid not null references public.users(id) on delete restrict,
  actor_display_name text not null,
  actor_role text not null check (actor_role in ('primary-caregiver', 'family-member', 'provider', 'supporter')),
  event_type text not null check (
    event_type in (
      'MedicationTakenEvent',
      'MedicationScheduledEvent',
      'VitalsRecordedEvent',
      'CareNoteAddedEvent',
      'CareArtifactAttachedEvent',
      'ReminderDismissedEvent',
      'MedicationMissedEvent'
    )
  ),
  event_source text not null check (event_source in ('manual', 'reminder', 'device')),
  occurred_at timestamptz not null,
  display_timestamp text,
  operational_context text not null,
  correlation_id text not null,
  causation_id text,
  schema_version integer not null default 1 check (schema_version = 1),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (care_team_id, client_event_id)
);

create index care_events_team_time_idx on public.care_events(care_team_id, occurred_at desc);
create index care_events_recipient_time_idx on public.care_events(care_recipient_id, occurred_at desc);
create index care_events_type_time_idx on public.care_events(care_team_id, event_type, occurred_at desc);
create index care_events_payload_idx on public.care_events using gin(payload jsonb_path_ops);

create or replace function public.prevent_care_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'care_events are append-only';
end;
$$;

create or replace function public.care_event_required_capability(p_event_type text)
returns text
language sql
immutable
as $$
  select case
    when p_event_type in ('MedicationTakenEvent', 'MedicationMissedEvent', 'ReminderDismissedEvent') then 'medication.log'
    when p_event_type = 'MedicationScheduledEvent' then 'medication.manage'
    when p_event_type = 'VitalsRecordedEvent' then 'vitals.log'
    when p_event_type = 'CareNoteAddedEvent' then 'care_note.create'
    when p_event_type = 'CareArtifactAttachedEvent' then 'document.upload'
    else 'care_event.append'
  end
$$;

create or replace function public.can_insert_care_event(
  p_care_team_id uuid,
  p_care_recipient_id uuid,
  p_actor_user_id uuid,
  p_event_type text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_actor_user_id = public.current_app_user_id()
    and exists (
      select 1
      from public.care_teams ct
      where ct.id = p_care_team_id
        and ct.care_recipient_id = p_care_recipient_id
        and ct.status = 'active'
        and ct.deleted_at is null
    )
    and public.has_resource_capability(
      p_care_team_id,
      'care_recipient',
      p_care_recipient_id,
      public.care_event_required_capability(p_event_type)
    );
$$;

create or replace function public.audit_care_event_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_audit_event(
    new.care_team_id,
    new.care_recipient_id,
    new.actor_user_id,
    null,
    'care_event.created',
    'care_event',
    new.id,
    jsonb_build_object(
      'event_type', new.event_type,
      'event_source', new.event_source,
      'schema_version', new.schema_version
    )
  );

  return new;
end;
$$;

create trigger care_events_no_update before update on public.care_events for each row execute function public.prevent_care_event_mutation();
create trigger care_events_no_delete before delete on public.care_events for each row execute function public.prevent_care_event_mutation();
create trigger care_events_audit after insert on public.care_events for each row execute function public.audit_care_event_insert();

alter table public.care_events enable row level security;

create policy care_events_select_permitted on public.care_events
for select using (
  public.can_view_recipient(care_recipient_id)
  and public.has_resource_capability(care_team_id, 'care_recipient', care_recipient_id, 'care_event.view')
);

create policy care_events_insert_permitted on public.care_events
for insert with check (
  public.can_insert_care_event(care_team_id, care_recipient_id, actor_user_id, event_type)
);
