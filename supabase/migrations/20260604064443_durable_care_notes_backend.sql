-- Sprint 6 durable care notes hardening.
-- Keeps notes on the accepted care_events / append_care_event path.

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
      'care_note.view', 'care_note.append', 'care_note.create',
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
      'care_note.view', 'care_note.append', 'care_note.create',
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

create or replace function public.care_event_required_capability(p_event_type text)
returns text
language sql
immutable
as $$
  select case
    when p_event_type in ('MedicationTakenEvent', 'MedicationMissedEvent', 'ReminderDismissedEvent') then 'medication.log'
    when p_event_type = 'MedicationScheduledEvent' then 'medication.manage'
    when p_event_type = 'VitalsRecordedEvent' then 'vitals.log'
    when p_event_type = 'CareNoteAddedEvent' then 'care_note.append'
    when p_event_type = 'CareArtifactAttachedEvent' then 'document.upload'
    else 'care_event.append'
  end
$$;

create or replace function public.care_event_read_capability(p_event_type text)
returns text
language sql
immutable
as $$
  select case
    when p_event_type = 'CareNoteAddedEvent' then 'care_note.view'
    else 'care_event.view'
  end
$$;

create or replace function public.care_note_payload_validation_status(p_payload jsonb)
returns text
language sql
immutable
as $$
  select case
    when p_payload is null or jsonb_typeof(p_payload) <> 'object' then 'validation_failed'
    when octet_length(p_payload::text) > 8192 then 'payload_too_large'
    when not (p_payload ? 'note') or jsonb_typeof(p_payload -> 'note') <> 'string' then 'validation_failed'
    when not (p_payload ? 'noteType') or jsonb_typeof(p_payload -> 'noteType') <> 'string' then 'validation_failed'
    when nullif(btrim(p_payload ->> 'note'), '') is null then 'validation_failed'
    when length(btrim(p_payload ->> 'note')) > 2000 then 'note_too_long'
    when p_payload ->> 'noteType' not in (
      'symptom-observation',
      'caregiver-context',
      'recovery-observation',
      'operational-concern'
    ) then 'validation_failed'
    else 'ok'
  end
$$;

create or replace function public.care_event_payload_is_structural(
  p_event_type text,
  p_payload jsonb
)
returns boolean
language sql
immutable
as $$
  select coalesce(
    jsonb_typeof(p_payload) = 'object'
    and case
      when p_event_type in ('MedicationTakenEvent', 'MedicationMissedEvent') then
        p_payload ? 'medicationId'
        and jsonb_typeof(p_payload -> 'medicationId') = 'string'
      when p_event_type = 'ReminderDismissedEvent' then
        p_payload ? 'reminderId'
        and jsonb_typeof(p_payload -> 'reminderId') = 'string'
      when p_event_type = 'MedicationScheduledEvent' then
        p_payload ? 'id'
        and p_payload ? 'name'
        and p_payload ? 'dose'
        and p_payload ? 'frequency'
        and p_payload ? 'reminderTime'
        and jsonb_typeof(p_payload -> 'id') = 'string'
        and jsonb_typeof(p_payload -> 'name') = 'string'
        and jsonb_typeof(p_payload -> 'dose') = 'string'
        and jsonb_typeof(p_payload -> 'frequency') = 'string'
        and jsonb_typeof(p_payload -> 'reminderTime') = 'string'
      when p_event_type = 'VitalsRecordedEvent' then
        p_payload ? 'reading'
        and jsonb_typeof(p_payload -> 'reading') = 'object'
        and (p_payload -> 'reading') ? 'id'
        and (p_payload -> 'reading') ? 'label'
        and (p_payload -> 'reading') ? 'recordedAt'
        and (p_payload -> 'reading') ? 'bloodPressure'
        and (p_payload -> 'reading') ? 'context'
        and (p_payload -> 'reading') ? 'heartRate'
        and (p_payload -> 'reading') ? 'systolic'
        and (p_payload -> 'reading') ? 'weight'
        and jsonb_typeof(p_payload -> 'reading' -> 'id') = 'string'
        and jsonb_typeof(p_payload -> 'reading' -> 'label') = 'string'
        and jsonb_typeof(p_payload -> 'reading' -> 'recordedAt') = 'string'
        and jsonb_typeof(p_payload -> 'reading' -> 'bloodPressure') = 'string'
        and jsonb_typeof(p_payload -> 'reading' -> 'context') = 'string'
        and jsonb_typeof(p_payload -> 'reading' -> 'heartRate') = 'number'
        and jsonb_typeof(p_payload -> 'reading' -> 'systolic') = 'number'
        and jsonb_typeof(p_payload -> 'reading' -> 'weight') = 'string'
      when p_event_type = 'CareNoteAddedEvent' then
        public.care_note_payload_validation_status(p_payload) = 'ok'
      when p_event_type = 'CareArtifactAttachedEvent' then
        p_payload ? 'artifact'
        and jsonb_typeof(p_payload -> 'artifact') = 'object'
        and (p_payload -> 'artifact') ? 'id'
        and (p_payload -> 'artifact') ? 'kind'
        and (p_payload -> 'artifact') ? 'title'
        and jsonb_typeof(p_payload -> 'artifact' -> 'id') = 'string'
        and jsonb_typeof(p_payload -> 'artifact' -> 'kind') = 'string'
        and jsonb_typeof(p_payload -> 'artifact' -> 'title') = 'string'
      else false
    end,
    false
  )
$$;

create or replace function public.can_view_care_event_payload(
  p_care_team_id uuid,
  p_care_recipient_id uuid,
  p_event_type text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_view_recipient(p_care_recipient_id)
    and public.has_resource_capability(
      p_care_team_id,
      'care_recipient',
      p_care_recipient_id,
      public.care_event_read_capability(p_event_type)
    )
$$;

create or replace function public.append_care_event(
  p_care_team_id uuid,
  p_care_recipient_id uuid,
  p_client_event_id text,
  p_event_type text,
  p_event_source text,
  p_occurred_at timestamptz,
  p_operational_context text,
  p_correlation_id text,
  p_causation_id text default null,
  p_schema_version integer default 1,
  p_payload jsonb default '{}'::jsonb
)
returns table (
  status text,
  care_event_id uuid,
  client_event_id text,
  care_team_id uuid,
  care_recipient_id uuid,
  event_type text,
  occurred_at timestamptz,
  schema_version integer,
  created_at timestamptz,
  read_back boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_display_name text;
  v_actor_role text;
  v_actor_user_id uuid;
  v_existing public.care_events%rowtype;
  v_inserted public.care_events%rowtype;
  v_note_validation_status text;
  v_required_capability text;
  v_role_key text;
begin
  if auth.uid() is null then
    return query select
      'auth_required'::text,
      null::uuid,
      null::text,
      null::uuid,
      null::uuid,
      null::text,
      null::timestamptz,
      null::integer,
      null::timestamptz,
      false;
    return;
  end if;

  v_actor_user_id := public.current_app_user_id();

  if v_actor_user_id is null then
    return query select
      'user_unavailable'::text,
      null::uuid,
      null::text,
      null::uuid,
      null::uuid,
      null::text,
      null::timestamptz,
      null::integer,
      null::timestamptz,
      false;
    return;
  end if;

  if p_event_type = 'CareNoteAddedEvent' then
    v_note_validation_status := public.care_note_payload_validation_status(p_payload);

    if v_note_validation_status <> 'ok' then
      return query select
        v_note_validation_status,
        null::uuid,
        null::text,
        null::uuid,
        null::uuid,
        null::text,
        null::timestamptz,
        null::integer,
        null::timestamptz,
        false;
      return;
    end if;

    if p_event_source <> 'manual'
      or p_operational_context <> 'caregiver-note'
      or p_occurred_at is null
      or p_occurred_at > now() + interval '5 minutes'
      or p_occurred_at < now() - interval '30 days' then
      return query select
        'validation_failed'::text,
        null::uuid,
        null::text,
        null::uuid,
        null::uuid,
        null::text,
        null::timestamptz,
        null::integer,
        null::timestamptz,
        false;
      return;
    end if;

    p_payload := jsonb_set(p_payload, '{note}', to_jsonb(btrim(p_payload ->> 'note')), false);
  end if;

  if p_care_team_id is null
    or p_care_recipient_id is null
    or nullif(btrim(coalesce(p_client_event_id, '')), '') is null
    or length(p_client_event_id) > 200
    or nullif(btrim(coalesce(p_operational_context, '')), '') is null
    or length(p_operational_context) > 160
    or nullif(btrim(coalesce(p_correlation_id, '')), '') is null
    or length(p_correlation_id) > 200
    or length(coalesce(p_causation_id, '')) > 200
    or p_schema_version <> 1
    or p_event_type is null
    or p_event_type not in (
      'MedicationTakenEvent',
      'MedicationScheduledEvent',
      'VitalsRecordedEvent',
      'CareNoteAddedEvent',
      'CareArtifactAttachedEvent',
      'ReminderDismissedEvent',
      'MedicationMissedEvent'
    )
    or p_event_source not in ('manual', 'reminder', 'device')
    or p_occurred_at is null
    or p_occurred_at > now() + interval '5 minutes'
    or (
      p_event_type <> 'CareNoteAddedEvent'
      and p_occurred_at < now() - interval '100 years'
    )
    or p_payload is null
    or pg_column_size(p_payload) > 65536
    or not public.care_event_payload_is_structural(p_event_type, p_payload) then
    return query select
      'validation_failed'::text,
      null::uuid,
      null::text,
      null::uuid,
      null::uuid,
      null::text,
      null::timestamptz,
      null::integer,
      null::timestamptz,
      false;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_care_team_id::text || ':' || p_client_event_id, 0)
  );

  select
    coalesce(nullif(u.display_name, ''), 'Caregiver'),
    r.role_key,
    public.care_event_actor_role(r.role_key)
  into
    v_actor_display_name,
    v_role_key,
    v_actor_role
  from public.care_team_members ctm
  join public.users u on u.id = ctm.user_id
  join public.roles r on r.id = ctm.role_id
  join public.care_teams ct on ct.id = ctm.care_team_id
  join public.care_recipients cr on cr.id = ct.care_recipient_id
  where ctm.care_team_id = p_care_team_id
    and ctm.user_id = v_actor_user_id
    and ctm.status = 'active'
    and ctm.revoked_at is null
    and u.status = 'active'
    and u.deleted_at is null
    and r.status = 'active'
    and ct.id = p_care_team_id
    and ct.care_recipient_id = p_care_recipient_id
    and ct.status = 'active'
    and ct.deleted_at is null
    and cr.id = p_care_recipient_id
    and cr.status not in ('archived', 'deleted')
    and cr.deleted_at is null
  limit 1;

  v_required_capability := public.care_event_required_capability(p_event_type);

  if v_actor_role is null
    or v_required_capability is null
    or not public.has_resource_capability(
      p_care_team_id,
      'care_recipient',
      p_care_recipient_id,
      v_required_capability
    ) then
    return query select
      'permission_denied'::text,
      null::uuid,
      null::text,
      null::uuid,
      null::uuid,
      null::text,
      null::timestamptz,
      null::integer,
      null::timestamptz,
      false;
    return;
  end if;

  select *
  into v_existing
  from public.care_events ce
  where ce.care_team_id = p_care_team_id
    and ce.client_event_id = p_client_event_id
  limit 1;

  if v_existing.id is not null then
    if v_existing.care_recipient_id = p_care_recipient_id
      and v_existing.actor_user_id = v_actor_user_id
      and v_existing.event_type = p_event_type
      and v_existing.event_source = p_event_source
      and v_existing.occurred_at = p_occurred_at
      and v_existing.operational_context = p_operational_context
      and v_existing.correlation_id = p_correlation_id
      and v_existing.causation_id is not distinct from p_causation_id
      and v_existing.schema_version = p_schema_version
      and v_existing.payload = p_payload then
      return query select
        'duplicate'::text,
        v_existing.id,
        v_existing.client_event_id,
        v_existing.care_team_id,
        v_existing.care_recipient_id,
        v_existing.event_type,
        v_existing.occurred_at,
        v_existing.schema_version,
        v_existing.created_at,
        public.can_view_care_event_payload(
          v_existing.care_team_id,
          v_existing.care_recipient_id,
          v_existing.event_type
        );
      return;
    end if;

    return query select
      'conflict'::text,
      null::uuid,
      null::text,
      null::uuid,
      null::uuid,
      null::text,
      null::timestamptz,
      null::integer,
      null::timestamptz,
      false;
    return;
  end if;

  insert into public.care_events (
    actor_display_name,
    actor_role,
    actor_user_id,
    care_recipient_id,
    care_team_id,
    causation_id,
    client_event_id,
    correlation_id,
    event_source,
    event_type,
    occurred_at,
    operational_context,
    payload,
    schema_version
  )
  values (
    v_actor_display_name,
    v_actor_role,
    v_actor_user_id,
    p_care_recipient_id,
    p_care_team_id,
    p_causation_id,
    p_client_event_id,
    p_correlation_id,
    p_event_source,
    p_event_type,
    p_occurred_at,
    p_operational_context,
    p_payload,
    p_schema_version
  )
  returning * into v_inserted;

  return query select
    'inserted'::text,
    v_inserted.id,
    v_inserted.client_event_id,
    v_inserted.care_team_id,
    v_inserted.care_recipient_id,
    v_inserted.event_type,
    v_inserted.occurred_at,
    v_inserted.schema_version,
    v_inserted.created_at,
    public.can_view_care_event_payload(
      v_inserted.care_team_id,
      v_inserted.care_recipient_id,
      v_inserted.event_type
    );
  return;
exception
  when unique_violation then
    return query select
      'retry_later'::text,
      null::uuid,
      null::text,
      null::uuid,
      null::uuid,
      null::text,
      null::timestamptz,
      null::integer,
      null::timestamptz,
      false;
  when serialization_failure or deadlock_detected then
    return query select
      'retry_later'::text,
      null::uuid,
      null::text,
      null::uuid,
      null::uuid,
      null::text,
      null::timestamptz,
      null::integer,
      null::timestamptz,
      false;
end;
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
    case
      when new.event_type = 'CareNoteAddedEvent' then 'care_note_created'
      else 'care_event.created'
    end,
    'care_event',
    new.id,
    case
      when new.event_type = 'CareNoteAddedEvent' then jsonb_build_object(
        'event_type', new.event_type,
        'event_source', new.event_source,
        'schema_version', new.schema_version,
        'capability', 'care_note.append',
        'note_type', new.payload ->> 'noteType',
        'result', 'inserted'
      )
      else jsonb_build_object(
        'event_type', new.event_type,
        'event_source', new.event_source,
        'schema_version', new.schema_version
      )
    end
  );

  return new;
end;
$$;

drop policy if exists care_events_select_permitted on public.care_events;

create policy care_events_select_permitted on public.care_events
for select using (
  public.can_view_recipient(care_recipient_id)
  and public.has_resource_capability(
    care_team_id,
    'care_recipient',
    care_recipient_id,
    case
      when event_type = 'CareNoteAddedEvent' then 'care_note.view'
      else 'care_event.view'
    end
  )
);

create or replace function public.hydrate_permission_context()
returns table (
  status text,
  app_user_id uuid,
  active_care_team_id uuid,
  active_care_recipient_id uuid,
  membership_id uuid,
  membership_status text,
  role_key text,
  advisory_capabilities text[],
  permission_version text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count integer := 0;
  v_advisory_capabilities text[] := '{}'::text[];
  v_app_user_id uuid;
  v_care_recipient_deleted_at timestamptz;
  v_care_recipient_id uuid;
  v_care_recipient_primary_team_id uuid;
  v_care_recipient_status text;
  v_care_team_deleted_at timestamptz;
  v_care_team_id uuid;
  v_care_team_status text;
  v_membership_id uuid;
  v_membership_status text;
  v_permission_version text;
  v_role_id uuid;
  v_role_key text;
begin
  if auth.uid() is null then
    return query select
      'auth_required'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      '{}'::text[],
      null::text;
    return;
  end if;

  v_app_user_id := public.current_app_user_id();

  if v_app_user_id is null then
    return query select
      'user_unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      '{}'::text[],
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
      case when v_active_count > 1 then 'multiple_active_memberships' else 'boundary_unavailable' end::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      '{}'::text[],
      null::text;
    return;
  end if;

  select
    ctm.id,
    ctm.status,
    ctm.role_id,
    r.role_key,
    ct.id,
    ct.status,
    ct.deleted_at,
    cr.id,
    cr.status,
    cr.deleted_at,
    cr.primary_care_team_id
  into
    v_membership_id,
    v_membership_status,
    v_role_id,
    v_role_key,
    v_care_team_id,
    v_care_team_status,
    v_care_team_deleted_at,
    v_care_recipient_id,
    v_care_recipient_status,
    v_care_recipient_deleted_at,
    v_care_recipient_primary_team_id
  from public.care_team_members ctm
  join public.roles r on r.id = ctm.role_id
  join public.care_teams ct on ct.id = ctm.care_team_id
  join public.care_recipients cr on cr.id = ct.care_recipient_id
  where ctm.user_id = v_app_user_id
    and ctm.status = 'active'
    and ctm.revoked_at is null
    and r.status = 'active'
  limit 1;

  if v_membership_id is null
    or v_care_team_id is null
    or v_care_recipient_id is null
    or v_care_team_status <> 'active'
    or v_care_team_deleted_at is not null
    or v_care_recipient_status in ('archived', 'deleted')
    or v_care_recipient_deleted_at is not null
    or v_care_recipient_primary_team_id <> v_care_team_id then
    return query select
      'boundary_unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      '{}'::text[],
      null::text;
    return;
  end if;

  with capability_catalog(capability, scope) as (
    values
      ('recipient.view', 'recipient'),
      ('recipient.manage', 'recipient'),
      ('team.view', 'team'),
      ('team.manage', 'team'),
      ('invitation.manage', 'team'),
      ('permissions.manage', 'team'),
      ('appointment.view', 'recipient'),
      ('appointment.manage', 'recipient'),
      ('medication.view', 'recipient'),
      ('medication.manage', 'recipient'),
      ('medication.log', 'recipient'),
      ('vitals.view', 'recipient'),
      ('vitals.log', 'recipient'),
      ('care_event.view', 'recipient'),
      ('care_event.append', 'recipient'),
      ('care_note.view', 'recipient'),
      ('care_note.append', 'recipient'),
      ('task.view', 'recipient'),
      ('task.manage', 'recipient'),
      ('conversation.view', 'team'),
      ('conversation.manage', 'team'),
      ('message.send', 'team'),
      ('document.view', 'recipient'),
      ('document.upload', 'recipient'),
      ('document.manage', 'recipient'),
      ('imaging.view', 'recipient'),
      ('imaging.upload', 'recipient'),
      ('audit.view', 'team')
  )
  select coalesce(array_agg(capability order by capability), '{}'::text[])
    into v_advisory_capabilities
  from capability_catalog
  where case
    when scope = 'team' then public.has_team_capability(v_care_team_id, capability)
    else public.has_resource_capability(
      v_care_team_id,
      'care_recipient',
      v_care_recipient_id,
      capability
    )
  end;

  select greatest(
      ctm.updated_at,
      r.updated_at,
      ct.updated_at,
      cr.updated_at,
      coalesce(max(pg.updated_at), 'epoch'::timestamptz)
    )::text
    into v_permission_version
  from public.care_team_members ctm
  join public.roles r on r.id = ctm.role_id
  join public.care_teams ct on ct.id = ctm.care_team_id
  join public.care_recipients cr on cr.id = ct.care_recipient_id
  left join public.permission_grants pg on pg.care_team_id = ctm.care_team_id
    and (
      pg.subject_user_id = ctm.user_id
      or pg.subject_role_id = ctm.role_id
    )
  where ctm.id = v_membership_id
  group by ctm.updated_at, r.updated_at, ct.updated_at, cr.updated_at;

  return query select
    'ready'::text,
    v_app_user_id,
    v_care_team_id,
    v_care_recipient_id,
    v_membership_id,
    v_membership_status,
    v_role_key,
    v_advisory_capabilities,
    v_permission_version;
  return;
exception
  when serialization_failure or deadlock_detected then
    return query select
      'retry_later'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      '{}'::text[],
      null::text;
end;
$$;

create or replace function public.hydrate_resource_access_context(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  app_user_id uuid,
  active_care_team_id uuid,
  active_care_recipient_id uuid,
  membership_id uuid,
  membership_status text,
  role_key text,
  permission_version text,
  resource_access jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count integer := 0;
  v_app_user_id uuid;
  v_care_recipient_deleted_at timestamptz;
  v_care_recipient_id uuid;
  v_care_recipient_primary_team_id uuid;
  v_care_recipient_status text;
  v_care_team_deleted_at timestamptz;
  v_care_team_id uuid;
  v_care_team_status text;
  v_max_page_size integer := 100;
  v_membership_id uuid;
  v_membership_status text;
  v_page_size integer := 50;
  v_permission_version text;
  v_resource_classes jsonb := '["care_recipient", "care_event"]'::jsonb;
  v_requested_permission_version text;
  v_request jsonb := coalesce(p_request, '{}'::jsonb);
  v_resources jsonb := '[]'::jsonb;
  v_resource_access jsonb := '[]'::jsonb;
  v_role_id uuid;
  v_role_key text;
begin
  if auth.uid() is null then
    return query select
      'auth_required'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if jsonb_typeof(v_request) <> 'object' then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  v_resource_classes := case
    when v_request ? 'resource_classes'
      and v_request->'resource_classes' <> 'null'::jsonb
      then v_request->'resource_classes'
    else '["care_recipient", "care_event"]'::jsonb
  end;

  v_resources := case
    when v_request ? 'resources'
      and v_request->'resources' <> 'null'::jsonb
      then v_request->'resources'
    else '[]'::jsonb
  end;

  if v_request ? 'page_size' then
    if jsonb_typeof(v_request->'page_size') <> 'number' then
      return query select
        'invalid_request'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        '[]'::jsonb;
      return;
    end if;

    if v_request->>'page_size' !~ '^[0-9]+$'
      or length(v_request->>'page_size') > 3 then
      return query select
        'invalid_request'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        '[]'::jsonb;
      return;
    end if;

    v_page_size := (v_request->>'page_size')::integer;

    if v_page_size < 1 or v_page_size > v_max_page_size then
      return query select
        'invalid_request'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        '[]'::jsonb;
      return;
    end if;
  end if;

  if jsonb_typeof(v_resource_classes) <> 'array' then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if jsonb_typeof(v_resources) <> 'array' then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if v_request ? 'permission_version' then
    if jsonb_typeof(v_request->'permission_version') <> 'string' then
      return query select
        'invalid_request'::text,
        null::uuid,
        null::uuid,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        '[]'::jsonb;
      return;
    end if;

    v_requested_permission_version := nullif(v_request->>'permission_version', '');
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_resource_classes) as rc(resource_class)
    where jsonb_typeof(rc.resource_class) is distinct from 'string'
      or rc.resource_class #>> '{}' not in ('care_recipient', 'care_event')
  ) then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if (
    select count(*)
    from jsonb_array_elements(v_resources)
  ) > v_page_size then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_resources) as r(resource)
    where jsonb_typeof(r.resource) is distinct from 'object'
      or jsonb_typeof(r.resource->'resource_type') is distinct from 'string'
      or r.resource->>'resource_type' not in ('care_recipient', 'care_event')
      or (
        r.resource ? 'resource_id'
        and r.resource->'resource_id' <> 'null'::jsonb
        and jsonb_typeof(r.resource->'resource_id') is distinct from 'string'
      )
      or jsonb_typeof(r.resource->'capabilities') is distinct from 'array'
      or jsonb_array_length(r.resource->'capabilities') = 0
  ) then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_resources) as r(resource)
    cross join lateral jsonb_array_elements(r.resource->'capabilities') as c(capability)
    where jsonb_typeof(c.capability) is distinct from 'string'
      or c.capability #>> '{}' not in (
        'care_event.view',
        'care_event.append',
        'provider_prep.preview',
        'care_note.view',
        'care_note.append'
      )
      or (
        r.resource->>'resource_type' = 'care_event'
        and c.capability #>> '{}' not in ('care_event.view', 'care_event.append')
      )
      or (
        r.resource->>'resource_type' = 'care_recipient'
        and c.capability #>> '{}' not in (
          'provider_prep.preview',
          'care_note.view',
          'care_note.append'
        )
      )
  ) then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if exists (
    select 1
    from (
      select
        r.resource->>'resource_type' as resource_type,
        coalesce(r.resource->>'resource_id', '') as resource_id,
        count(*) as duplicate_count
      from jsonb_array_elements(v_resources) as r(resource)
      group by r.resource->>'resource_type', coalesce(r.resource->>'resource_id', '')
    ) duplicates
    where duplicates.duplicate_count > 1
  ) then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_resources) as r(resource)
    where r.resource ? 'resource_id'
      and r.resource->'resource_id' <> 'null'::jsonb
      and r.resource->>'resource_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    return query select
      'invalid_request'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
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
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  select count(*) into v_active_count
  from public.care_team_members ctm
  where ctm.user_id = v_app_user_id
    and ctm.status = 'active'
    and ctm.revoked_at is null;

  if v_active_count <> 1 then
    return query select
      case when v_active_count > 1 then 'multiple_active_memberships' else 'boundary_unavailable' end::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  select
    ctm.id,
    ctm.status,
    ctm.role_id,
    r.role_key,
    ct.id,
    ct.status,
    ct.deleted_at,
    cr.id,
    cr.status,
    cr.deleted_at,
    cr.primary_care_team_id
  into
    v_membership_id,
    v_membership_status,
    v_role_id,
    v_role_key,
    v_care_team_id,
    v_care_team_status,
    v_care_team_deleted_at,
    v_care_recipient_id,
    v_care_recipient_status,
    v_care_recipient_deleted_at,
    v_care_recipient_primary_team_id
  from public.care_team_members ctm
  join public.roles r on r.id = ctm.role_id
  join public.care_teams ct on ct.id = ctm.care_team_id
  join public.care_recipients cr on cr.id = ct.care_recipient_id
  where ctm.user_id = v_app_user_id
    and ctm.status = 'active'
    and ctm.revoked_at is null
    and r.status = 'active'
  limit 1;

  if v_membership_id is null
    or v_care_team_id is null
    or v_care_recipient_id is null
    or v_care_team_status <> 'active'
    or v_care_team_deleted_at is not null
    or v_care_recipient_status in ('archived', 'deleted')
    or v_care_recipient_deleted_at is not null
    or v_care_recipient_primary_team_id <> v_care_team_id then
    return query select
      'boundary_unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  select greatest(
      ctm.updated_at,
      r.updated_at,
      ct.updated_at,
      cr.updated_at,
      coalesce(max(pg.updated_at), 'epoch'::timestamptz)
    )::text
    into v_permission_version
  from public.care_team_members ctm
  join public.roles r on r.id = ctm.role_id
  join public.care_teams ct on ct.id = ctm.care_team_id
  join public.care_recipients cr on cr.id = ct.care_recipient_id
  left join public.permission_grants pg on pg.care_team_id = ctm.care_team_id
    and (
      pg.subject_user_id = ctm.user_id
      or pg.subject_role_id = ctm.role_id
    )
  where ctm.id = v_membership_id
  group by ctm.updated_at, r.updated_at, ct.updated_at, cr.updated_at;

  if v_requested_permission_version is not null
    and v_requested_permission_version <> v_permission_version then
    return query select
      'stale_permission_context'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
    return;
  end if;

  with requested_resources as (
    select
      r.ordinality::integer as resource_ordinal,
      r.resource->>'resource_type' as resource_type,
      nullif(r.resource->>'resource_id', '')::uuid as requested_resource_id,
      c.ordinality::integer as capability_ordinal,
      c.capability #>> '{}' as capability
    from jsonb_array_elements(v_resources)
      with ordinality as r(resource, ordinality)
    cross join lateral jsonb_array_elements(r.resource->'capabilities')
      with ordinality as c(capability, ordinality)
  ),
  requested_classes as (
    select distinct
      rc.resource_class #>> '{}' as resource_type
    from jsonb_array_elements(v_resource_classes) as rc(resource_class)
    where not exists (select 1 from jsonb_array_elements(v_resources))
  ),
  default_resources as (
    select
      (row_number() over ())::integer as resource_ordinal,
      resource_type,
      null::uuid as requested_resource_id,
      (row_number() over (partition by resource_type order by capability))::integer as capability_ordinal,
      capability
    from (
      values
        ('care_recipient', 'care_note.append'),
        ('care_recipient', 'care_note.view'),
        ('care_recipient', 'provider_prep.preview'),
        ('care_event', 'care_event.view'),
        ('care_event', 'care_event.append')
    ) as defaults(resource_type, capability)
    where exists (
      select 1 from requested_classes
      where requested_classes.resource_type = defaults.resource_type
    )
  ),
  requested as (
    select * from requested_resources
    union all
    select * from default_resources
  ),
  normalized as (
    select
      resource_ordinal,
      capability_ordinal,
      resource_type,
      case
        when resource_type = 'care_recipient'
          and (requested_resource_id is null or requested_resource_id = v_care_recipient_id)
          then requested_resource_id
        else null::uuid
      end as safe_resource_id,
      requested_resource_id,
      capability,
      case
        when capability = 'provider_prep.preview' then array['provider_prep.preview', 'care_event.view']
        when capability = 'care_note.append' then array['care_note.append', 'care_note.create']
        else array[capability]
      end as effective_capabilities
    from requested
  ),
  evaluated as (
    select
      n.resource_ordinal,
      n.capability_ordinal,
      n.resource_type,
      n.safe_resource_id,
      n.requested_resource_id,
      n.capability,
      exists (
        select 1
        from public.permission_grants pg
        where pg.care_team_id = v_care_team_id
          and pg.resource_type = 'care_recipient'
          and (pg.resource_id is null or pg.resource_id = v_care_recipient_id)
          and pg.capability = any(n.effective_capabilities)
          and pg.effect = 'deny'
          and pg.revoked_at is null
          and pg.starts_at <= now()
          and (pg.expires_at is null or pg.expires_at > now())
          and (
            pg.subject_user_id = v_app_user_id
            or pg.subject_role_id = v_role_id
          )
      ) as has_explicit_deny,
      exists (
        select 1
        from public.permission_grants pg
        where pg.care_team_id = v_care_team_id
          and pg.resource_type = 'care_recipient'
          and (pg.resource_id is null or pg.resource_id = v_care_recipient_id)
          and pg.capability = any(n.effective_capabilities)
          and pg.effect = 'allow'
          and pg.revoked_at is null
          and pg.starts_at <= now()
          and (pg.expires_at is null or pg.expires_at > now())
          and (
            pg.subject_user_id = v_app_user_id
            or pg.subject_role_id = v_role_id
          )
      ) as has_explicit_grant,
      (
        select min(pg.expires_at)
        from public.permission_grants pg
        where pg.care_team_id = v_care_team_id
          and pg.resource_type = 'care_recipient'
          and (pg.resource_id is null or pg.resource_id = v_care_recipient_id)
          and pg.capability = any(n.effective_capabilities)
          and pg.effect = 'allow'
          and pg.revoked_at is null
          and pg.starts_at <= now()
          and pg.expires_at is not null
          and pg.expires_at > now()
          and (
            pg.subject_user_id = v_app_user_id
            or pg.subject_role_id = v_role_id
          )
      ) as explicit_grant_expires_at,
      case
        when n.capability = 'provider_prep.preview' then public.evernest_role_allows(v_role_key, 'care_event.view')
        else public.evernest_role_allows(v_role_key, n.capability)
      end as has_role_default,
      case
        when n.requested_resource_id is null then true
        when n.resource_type = 'care_recipient' and n.requested_resource_id = v_care_recipient_id then true
        else false
      end as resource_available
    from normalized n
  ),
  projected as (
    select
      resource_ordinal,
      capability_ordinal,
      resource_type,
      case when resource_available then safe_resource_id else null::uuid end as resource_id,
      capability,
      case
        when not resource_available then 'unavailable'
        when has_explicit_deny then 'denied'
        when has_explicit_grant or has_role_default then 'allowed'
        else 'denied'
      end as access,
      case
        when not resource_available then 'system_boundary'
        when has_explicit_deny then 'explicit_deny'
        when has_explicit_grant then 'explicit_grant'
        when has_role_default then 'role_default'
        else 'system_boundary'
      end as source_scope,
      case
        when resource_available and has_explicit_grant and not has_explicit_deny then explicit_grant_expires_at
        else null::timestamptz
      end as expires_at
    from evaluated
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'resource_type', resource_type,
        'resource_id', resource_id,
        'capability', capability,
        'access', access,
        'source_scope', source_scope,
        'expires_at', expires_at
      )
      order by resource_ordinal, capability_ordinal, capability
    ),
    '[]'::jsonb
  )
  into v_resource_access
  from projected;

  return query select
    'ready'::text,
    v_app_user_id,
    v_care_team_id,
    v_care_recipient_id,
    v_membership_id,
    v_membership_status,
    v_role_key,
    v_permission_version,
    v_resource_access;
  return;
exception
  when invalid_text_representation or numeric_value_out_of_range or serialization_failure or deadlock_detected then
    return query select
      'unavailable'::text,
      null::uuid,
      null::uuid,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      '[]'::jsonb;
end;
$$;

revoke all on function public.care_event_read_capability(text) from public;
revoke all on function public.care_event_read_capability(text) from anon;
revoke all on function public.care_event_read_capability(text) from authenticated;

revoke all on function public.care_note_payload_validation_status(jsonb) from public;
revoke all on function public.care_note_payload_validation_status(jsonb) from anon;
revoke all on function public.care_note_payload_validation_status(jsonb) from authenticated;

revoke all on function public.care_event_payload_is_structural(text, jsonb) from public;
revoke all on function public.care_event_payload_is_structural(text, jsonb) from anon;
revoke all on function public.care_event_payload_is_structural(text, jsonb) from authenticated;

revoke all on function public.can_view_care_event_payload(uuid, uuid, text) from public;
revoke all on function public.can_view_care_event_payload(uuid, uuid, text) from anon;
revoke all on function public.can_view_care_event_payload(uuid, uuid, text) from authenticated;

revoke all on function public.append_care_event(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  integer,
  jsonb
) from public;
revoke all on function public.append_care_event(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  integer,
  jsonb
) from anon;
grant execute on function public.append_care_event(
  uuid,
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  integer,
  jsonb
) to authenticated;

revoke all on function public.hydrate_permission_context() from public;
revoke all on function public.hydrate_permission_context() from anon;
grant execute on function public.hydrate_permission_context() to authenticated;

revoke all on function public.hydrate_resource_access_context(jsonb) from public;
revoke all on function public.hydrate_resource_access_context(jsonb) from anon;
grant execute on function public.hydrate_resource_access_context(jsonb) to authenticated;
