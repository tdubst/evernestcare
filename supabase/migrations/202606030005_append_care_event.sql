-- Sprint 3 server-side care-event append contract.
-- Replaces direct client care_events upsert with an authenticated RPC boundary.

create or replace function public.care_event_actor_role(p_role_key text)
returns text
language sql
immutable
as $$
  select case
    when p_role_key in ('owner', 'primary_caregiver') then 'primary-caregiver'
    when p_role_key = 'family_member' then 'family-member'
    when p_role_key = 'provider_contact' then 'provider'
    when p_role_key = 'emergency_contact' then 'supporter'
    else null
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
        p_payload ? 'note'
        and p_payload ? 'noteType'
        and jsonb_typeof(p_payload -> 'note') = 'string'
        and p_payload ->> 'noteType' in (
          'symptom-observation',
          'caregiver-context',
          'recovery-observation',
          'operational-concern'
        )
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
    or p_occurred_at < now() - interval '100 years'
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
        public.can_view_recipient(v_existing.care_recipient_id)
          and public.has_resource_capability(
            v_existing.care_team_id,
            'care_recipient',
            v_existing.care_recipient_id,
            'care_event.view'
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
    public.can_view_recipient(v_inserted.care_recipient_id)
      and public.has_resource_capability(
        v_inserted.care_team_id,
        'care_recipient',
        v_inserted.care_recipient_id,
        'care_event.view'
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

revoke all on function public.care_event_actor_role(text) from public;
revoke all on function public.care_event_actor_role(text) from anon;
revoke all on function public.care_event_actor_role(text) from authenticated;

revoke all on function public.care_event_payload_is_structural(text, jsonb) from public;
revoke all on function public.care_event_payload_is_structural(text, jsonb) from anon;
revoke all on function public.care_event_payload_is_structural(text, jsonb) from authenticated;

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
