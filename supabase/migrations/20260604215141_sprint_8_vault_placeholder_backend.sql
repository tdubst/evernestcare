-- Sprint 8 Vault / Documents beta slice: placeholder-first backend.
--
-- This intentionally does not create storage buckets, storage objects, signed
-- URLs, previews, thumbnails, provider delivery, or share/export behavior.

alter table public.documents
  add column if not exists is_vault_placeholder boolean not null default false,
  add column if not exists artifact_alias text,
  add column if not exists artifact_category text not null default 'other',
  add column if not exists visibility_category text not null default 'family_visible',
  add column if not exists attachment_status text not null default 'unattached',
  add column if not exists placeholder_schema_version integer not null default 1,
  add column if not exists attached_care_event_id uuid references public.care_events(id) on delete set null;

update public.documents
set artifact_alias = 'artifact_' || left(replace(id::text, '-', ''), 16)
where artifact_alias is null;

alter table public.documents
  alter column artifact_alias set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'documents_artifact_category_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_artifact_category_check
      check (artifact_category in (
        'care_document',
        'medication_photo',
        'insurance_card',
        'referral',
        'instructions',
        'other'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'documents_visibility_category_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_visibility_category_check
      check (visibility_category in ('family_visible', 'private'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'documents_attachment_status_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_attachment_status_check
      check (attachment_status in ('unattached', 'attached', 'revoked'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'documents_placeholder_schema_version_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_placeholder_schema_version_check
      check (placeholder_schema_version = 1);
  end if;
end $$;

create unique index if not exists documents_artifact_alias_idx
  on public.documents(artifact_alias);

create index if not exists documents_vault_placeholder_team_idx
  on public.documents(care_team_id, care_recipient_id, status, created_at desc)
  where is_vault_placeholder = true;

revoke insert, update, delete on public.documents from anon;
revoke insert, update, delete on public.documents from authenticated;

create or replace function public.vault_artifact_time_bucket(p_created_at timestamptz)
returns text
language sql
stable
as $$
  select case
    when p_created_at is null then null::text
    when p_created_at >= now() - interval '1 day' then 'today'
    when p_created_at >= now() - interval '30 days' then 'recent'
    else 'earlier'
  end
$$;

create or replace function public.can_view_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.documents d
    where d.id = p_document_id
      and d.deleted_at is null
      and d.status in ('uploaded', 'processing', 'active')
      and (
        (
          d.visibility_category = 'family_visible'
          and public.has_resource_capability(
            d.care_team_id,
            'care_recipient',
            d.care_recipient_id,
            'document.view'
          )
        )
        or (
          d.visibility_category = 'private'
          and d.uploaded_by = public.current_app_user_id()
          and public.has_resource_capability(
            d.care_team_id,
            'care_recipient',
            d.care_recipient_id,
            'document.view'
          )
        )
        or public.has_resource_capability(
          d.care_team_id,
          'care_recipient',
          d.care_recipient_id,
          'document.manage'
        )
      )
  )
$$;

create or replace function public.vault_artifact_payload_status(p_payload jsonb)
returns text
language sql
immutable
as $$
  select case
    when p_payload is null or jsonb_typeof(p_payload) <> 'object' then 'invalid_request'
    when pg_column_size(p_payload) > 4096 then 'invalid_request'
    when not (p_payload ? 'artifact')
      or jsonb_typeof(p_payload -> 'artifact') <> 'object' then 'invalid_request'
    when not ((p_payload -> 'artifact') ? 'artifactAlias')
      or jsonb_typeof(p_payload -> 'artifact' -> 'artifactAlias') <> 'string'
      or nullif(btrim(p_payload -> 'artifact' ->> 'artifactAlias'), '') is null
      or length(p_payload -> 'artifact' ->> 'artifactAlias') > 80 then 'invalid_request'
    when not ((p_payload -> 'artifact') ? 'artifactCategory')
      or jsonb_typeof(p_payload -> 'artifact' -> 'artifactCategory') <> 'string'
      or p_payload -> 'artifact' ->> 'artifactCategory' not in (
        'care_document',
        'medication_photo',
        'insurance_card',
        'referral',
        'instructions',
        'other'
      ) then 'unsupported_artifact_type'
    when not ((p_payload -> 'artifact') ? 'visibilityCategory')
      or jsonb_typeof(p_payload -> 'artifact' -> 'visibilityCategory') <> 'string'
      or p_payload -> 'artifact' ->> 'visibilityCategory' not in ('family_visible', 'private') then 'invalid_request'
    when not ((p_payload -> 'artifact') ? 'attachmentStatus')
      or jsonb_typeof(p_payload -> 'artifact' -> 'attachmentStatus') <> 'string'
      or p_payload -> 'artifact' ->> 'attachmentStatus' <> 'attached' then 'invalid_request'
    when not ((p_payload -> 'artifact') ? 'schemaVersion')
      or jsonb_typeof(p_payload -> 'artifact' -> 'schemaVersion') <> 'number'
      or p_payload -> 'artifact' ->> 'schemaVersion' <> '1' then 'invalid_request'
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
        public.vault_artifact_payload_status(p_payload) = 'ok'
      else false
    end,
    false
  )
$$;

create or replace function public.care_event_read_capability(p_event_type text)
returns text
language sql
immutable
as $$
  select case
    when p_event_type = 'CareNoteAddedEvent' then 'care_note.view'
    when p_event_type = 'CareArtifactAttachedEvent' then 'document.view'
    else 'care_event.view'
  end
$$;

create or replace function public.can_view_care_event_row(
  p_care_team_id uuid,
  p_care_recipient_id uuid,
  p_event_type text,
  p_payload jsonb
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_view_recipient(p_care_recipient_id)
    and case
      when p_event_type = 'CareArtifactAttachedEvent' then exists (
        select 1
        from public.documents d
        where d.care_team_id = p_care_team_id
          and d.care_recipient_id = p_care_recipient_id
          and d.artifact_alias = p_payload -> 'artifact' ->> 'artifactAlias'
          and d.is_vault_placeholder = true
          and public.can_view_document(d.id)
      )
      else public.has_resource_capability(
        p_care_team_id,
        'care_recipient',
        p_care_recipient_id,
        public.care_event_read_capability(p_event_type)
      )
    end
$$;

drop policy if exists care_events_select_permitted on public.care_events;

create policy care_events_select_permitted on public.care_events
for select using (
  public.can_view_recipient(care_events.care_recipient_id)
  and case
    when care_events.event_type = 'CareArtifactAttachedEvent' then exists (
      select 1
      from public.documents d
      where d.care_team_id = care_events.care_team_id
        and d.care_recipient_id = care_events.care_recipient_id
        and d.artifact_alias = care_events.payload -> 'artifact' ->> 'artifactAlias'
        and d.is_vault_placeholder = true
        and public.can_view_document(d.id)
    )
    else public.has_resource_capability(
      care_events.care_team_id,
      'care_recipient',
      care_events.care_recipient_id,
      public.care_event_read_capability(care_events.event_type)
    )
  end
);

create or replace function public.audit_document_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_vault_placeholder, false) <> true then
    if tg_op = 'INSERT' then
      perform public.write_audit_event(
        new.care_team_id,
        new.care_recipient_id,
        new.uploaded_by,
        null,
        'document.uploaded',
        'document',
        new.id,
        jsonb_build_object(
          'status', new.status,
          'restricted', new.restricted,
          'result', 'created'
        )
      );
    elsif tg_op = 'UPDATE' and (
      old.deleted_at is null and new.deleted_at is not null
      or old.status is distinct from new.status and new.status = 'deleted'
    ) then
      perform public.write_audit_event(
        new.care_team_id,
        new.care_recipient_id,
        public.current_app_user_id(),
        null,
        'document.deleted',
        'document',
        new.id,
        jsonb_build_object(
          'status', new.status,
          'restricted', new.restricted,
          'result', 'deleted'
        )
      );
    end if;

    return new;
  end if;

  if tg_op = 'INSERT' then
    perform public.write_audit_event(
      new.care_team_id,
      new.care_recipient_id,
      new.uploaded_by,
      null,
      'vault_artifact_placeholder_created',
      'document',
      new.id,
      jsonb_build_object(
        'status', new.status,
        'result', 'created',
        'resource_class', 'document',
        'artifact_category', new.artifact_category,
        'visibility_category', new.visibility_category,
        'attachment_status', new.attachment_status,
        'schema_version', new.placeholder_schema_version
      )
    );
  elsif tg_op = 'UPDATE' and (
    old.deleted_at is null and new.deleted_at is not null
    or old.status is distinct from new.status and new.status in ('archived', 'deleted')
    or old.attachment_status is distinct from new.attachment_status and new.attachment_status = 'revoked'
  ) then
    perform public.write_audit_event(
      new.care_team_id,
      new.care_recipient_id,
      public.current_app_user_id(),
      null,
      'vault_artifact_placeholder_revoked',
      'document',
      new.id,
      jsonb_build_object(
        'status', new.status,
        'result', 'revoked',
        'resource_class', 'document',
        'artifact_category', new.artifact_category,
        'visibility_category', new.visibility_category,
        'attachment_status', new.attachment_status,
        'schema_version', new.placeholder_schema_version
      )
    );
  end if;

  return new;
end;
$$;

create or replace function public.audit_care_event_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_type = 'CareArtifactAttachedEvent' then
    perform public.write_audit_event(
      new.care_team_id,
      new.care_recipient_id,
      new.actor_user_id,
      null,
      'vault_artifact_placeholder_attached',
      'care_event',
      new.id,
      jsonb_build_object(
        'status', 'attached',
        'result', 'attached',
        'resource_class', 'care_event',
        'artifact_category', new.payload -> 'artifact' ->> 'artifactCategory',
        'visibility_category', new.payload -> 'artifact' ->> 'visibilityCategory',
        'attachment_status', new.payload -> 'artifact' ->> 'attachmentStatus',
        'schema_version', new.schema_version
      )
    );
  else
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
  end if;

  return new;
end;
$$;

create or replace function public.vault_placeholder_permission_version(p_membership_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    ctm.updated_at,
    r.updated_at,
    ct.updated_at,
    cr.updated_at,
    coalesce(max(pg.updated_at), 'epoch'::timestamptz),
    coalesce(max(d.updated_at), 'epoch'::timestamptz)
  )::text
  from public.care_team_members ctm
  join public.roles r on r.id = ctm.role_id
  join public.care_teams ct on ct.id = ctm.care_team_id
  join public.care_recipients cr on cr.id = ct.care_recipient_id
  left join public.permission_grants pg on pg.care_team_id = ctm.care_team_id
    and (pg.subject_user_id = ctm.user_id or pg.subject_role_id = ctm.role_id)
  left join public.documents d on d.care_team_id = ctm.care_team_id
    and d.care_recipient_id = cr.id
    and d.is_vault_placeholder = true
  where ctm.id = p_membership_id
  group by ctm.updated_at, r.updated_at, ct.updated_at, cr.updated_at
$$;

create or replace function public.get_artifact_access_advisory_summary(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  capability_keys text[],
  permission_version text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boundary record;
  v_capability_keys text[] := '{}'::text[];
  v_permission_version text;
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    return query select 'invalid_request'::text, '{}'::text[], null::text;
    return;
  end if;

  select * into v_boundary from public.care_circle_active_boundary() limit 1;

  if v_boundary.status <> 'ready' then
    return query select v_boundary.status, '{}'::text[], null::text;
    return;
  end if;

  v_permission_version := public.vault_placeholder_permission_version(v_boundary.membership_id);

  if p_request ? 'permission_version'
    and nullif(p_request->>'permission_version', '') is distinct from v_permission_version then
    return query select 'stale_permission_context'::text, '{}'::text[], null::text;
    return;
  end if;

  with capability_catalog(capability) as (
    values ('document.view'), ('document.upload'), ('document.manage')
  )
  select coalesce(array_agg(capability order by capability), '{}'::text[])
    into v_capability_keys
  from capability_catalog
  where public.has_resource_capability(
    v_boundary.care_team_id,
    'care_recipient',
    v_boundary.care_recipient_id,
    capability
  );

  return query select 'ready'::text, v_capability_keys, v_permission_version;
end;
$$;

create or replace function public.get_vault_artifact_summary(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  result text,
  count integer,
  capability_keys text[],
  permission_version text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boundary record;
  v_count integer := 0;
  v_permission_version text;
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    return query select 'invalid_request'::text, null::text, 0, '{}'::text[], null::text;
    return;
  end if;

  select * into v_boundary from public.care_circle_active_boundary() limit 1;

  if v_boundary.status <> 'ready' then
    return query select v_boundary.status, null::text, 0, '{}'::text[], null::text;
    return;
  end if;

  v_permission_version := public.vault_placeholder_permission_version(v_boundary.membership_id);

  if p_request ? 'permission_version'
    and nullif(p_request->>'permission_version', '') is distinct from v_permission_version then
    return query select 'stale_permission_context'::text, null::text, 0, '{}'::text[], null::text;
    return;
  end if;

  if not public.has_resource_capability(
    v_boundary.care_team_id,
    'care_recipient',
    v_boundary.care_recipient_id,
    'document.view'
  ) then
    return query select 'denied'::text, null::text, 0, '{}'::text[], null::text;
    return;
  end if;

  select count(*)::integer into v_count
  from public.documents d
  where d.care_team_id = v_boundary.care_team_id
    and d.care_recipient_id = v_boundary.care_recipient_id
    and d.is_vault_placeholder = true
    and d.status in ('uploaded', 'processing', 'active')
    and d.deleted_at is null
    and public.can_view_document(d.id);

  return query select
    case when v_count = 0 then 'empty' else 'ready' end::text,
    case when v_count = 0 then 'empty' else 'available' end::text,
    v_count,
    array['document.view']::text[],
    v_permission_version;
end;
$$;

create or replace function public.create_vault_artifact_placeholder(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  result text,
  artifact_alias text,
  artifact_category text,
  visibility_category text,
  attachment_status text,
  capability_keys text[],
  count integer,
  created_time_bucket text,
  permission_version text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_alias text;
  v_artifact_category text;
  v_boundary record;
  v_count integer := 0;
  v_document public.documents%rowtype;
  v_permission_version text;
  v_visibility_category text;
begin
  if p_request is null
    or jsonb_typeof(p_request) <> 'object'
    or pg_column_size(p_request) > 4096
    or jsonb_typeof(p_request->'artifact_category') is distinct from 'string'
    or jsonb_typeof(p_request->'visibility_category') is distinct from 'string' then
    return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  v_artifact_category := p_request->>'artifact_category';
  v_visibility_category := p_request->>'visibility_category';

  if v_artifact_category not in (
    'care_document',
    'medication_photo',
    'insurance_card',
    'referral',
    'instructions',
    'other'
  ) then
    return query select 'unsupported_artifact_type'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  if v_visibility_category not in ('family_visible', 'private') then
    return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  select * into v_boundary from public.care_circle_active_boundary() limit 1;

  if v_boundary.status <> 'ready' then
    return query select v_boundary.status, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  v_permission_version := public.vault_placeholder_permission_version(v_boundary.membership_id);

  if p_request ? 'permission_version'
    and nullif(p_request->>'permission_version', '') is distinct from v_permission_version then
    return query select 'stale_permission_context'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  if not public.has_resource_capability(
    v_boundary.care_team_id,
    'care_recipient',
    v_boundary.care_recipient_id,
    'document.upload'
  ) then
    return query select 'denied'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  v_alias := 'artifact_' || encode(gen_random_bytes(10), 'hex');

  insert into public.documents (
    care_team_id,
    care_recipient_id,
    uploaded_by,
    title,
    bucket,
    storage_path,
    mime_type,
    byte_size,
    restricted,
    status,
    is_vault_placeholder,
    artifact_alias,
    artifact_category,
    visibility_category,
    attachment_status,
    placeholder_schema_version
  )
  values (
    v_boundary.care_team_id,
    v_boundary.care_recipient_id,
    v_boundary.app_user_id,
    'Vault artifact placeholder',
    'documents-private',
    'vault-placeholder/' || v_boundary.care_recipient_id::text || '/' || v_alias,
    'application/x-evernest-placeholder',
    0,
    v_visibility_category = 'private',
    'active',
    true,
    v_alias,
    v_artifact_category,
    v_visibility_category,
    'unattached',
    1
  )
  returning * into v_document;

  select count(*)::integer into v_count
  from public.documents d
  where d.care_team_id = v_boundary.care_team_id
    and d.care_recipient_id = v_boundary.care_recipient_id
    and d.is_vault_placeholder = true
    and d.status in ('uploaded', 'processing', 'active')
    and d.deleted_at is null
    and public.can_view_document(d.id);

  return query select
    'created'::text,
    'created'::text,
    v_document.artifact_alias,
    v_document.artifact_category,
    v_document.visibility_category,
    v_document.attachment_status,
    array['document.upload']::text[],
    v_count,
    public.vault_artifact_time_bucket(v_document.created_at),
    public.vault_placeholder_permission_version(v_boundary.membership_id);
exception
  when unique_violation then
    return query select 'duplicate_request'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
  when serialization_failure or deadlock_detected then
    return query select 'unavailable'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
end;
$$;

create or replace function public.list_vault_artifacts(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  result text,
  artifact_alias text,
  artifact_category text,
  visibility_category text,
  attachment_status text,
  capability_keys text[],
  count integer,
  created_time_bucket text,
  permission_version text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boundary record;
  v_count integer := 0;
  v_limit integer := 20;
  v_permission_version text;
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object' then
    return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  if p_request ? 'limit' then
    if jsonb_typeof(p_request->'limit') is distinct from 'number'
      or p_request->>'limit' !~ '^[0-9]+$' then
      return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
      return;
    end if;

    v_limit := least(greatest((p_request->>'limit')::integer, 1), 50);
  end if;

  select * into v_boundary from public.care_circle_active_boundary() limit 1;

  if v_boundary.status <> 'ready' then
    return query select v_boundary.status, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  v_permission_version := public.vault_placeholder_permission_version(v_boundary.membership_id);

  if p_request ? 'permission_version'
    and nullif(p_request->>'permission_version', '') is distinct from v_permission_version then
    return query select 'stale_permission_context'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  if not public.has_resource_capability(
    v_boundary.care_team_id,
    'care_recipient',
    v_boundary.care_recipient_id,
    'document.view'
  ) then
    return query select 'denied'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  select count(*)::integer into v_count
  from public.documents d
  where d.care_team_id = v_boundary.care_team_id
    and d.care_recipient_id = v_boundary.care_recipient_id
    and d.is_vault_placeholder = true
    and d.status in ('uploaded', 'processing', 'active')
    and d.deleted_at is null
    and public.can_view_document(d.id);

  if v_count = 0 then
    return query select 'empty'::text, 'empty'::text, null::text, null::text, null::text, null::text, array['document.view']::text[], 0, null::text, v_permission_version;
    return;
  end if;

  return query
  select
    'ready'::text,
    'available'::text,
    d.artifact_alias,
    d.artifact_category,
    d.visibility_category,
    d.attachment_status,
    array['document.view']::text[],
    v_count,
    public.vault_artifact_time_bucket(d.created_at),
    v_permission_version
  from public.documents d
  where d.care_team_id = v_boundary.care_team_id
    and d.care_recipient_id = v_boundary.care_recipient_id
    and d.is_vault_placeholder = true
    and d.status in ('uploaded', 'processing', 'active')
    and d.deleted_at is null
    and public.can_view_document(d.id)
  order by d.created_at desc
  limit v_limit;
end;
$$;

create or replace function public.attach_vault_artifact_to_timeline(
  p_request jsonb default '{}'::jsonb
)
returns table (
  status text,
  result text,
  artifact_alias text,
  artifact_category text,
  visibility_category text,
  attachment_status text,
  capability_keys text[],
  count integer,
  created_time_bucket text,
  permission_version text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_append record;
  v_boundary record;
  v_document public.documents%rowtype;
  v_permission_version text;
begin
  if p_request is null
    or jsonb_typeof(p_request) <> 'object'
    or jsonb_typeof(p_request->'artifact_alias') is distinct from 'string'
    or nullif(btrim(p_request->>'artifact_alias'), '') is null
    or length(p_request->>'artifact_alias') > 80 then
    return query select 'invalid_request'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  select * into v_boundary from public.care_circle_active_boundary() limit 1;

  if v_boundary.status <> 'ready' then
    return query select v_boundary.status, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  v_permission_version := public.vault_placeholder_permission_version(v_boundary.membership_id);

  if p_request ? 'permission_version'
    and nullif(p_request->>'permission_version', '') is distinct from v_permission_version then
    return query select 'stale_permission_context'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  if not public.has_resource_capability(
    v_boundary.care_team_id,
    'care_recipient',
    v_boundary.care_recipient_id,
    'document.upload'
  ) then
    return query select 'denied'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  select * into v_document
  from public.documents d
  where d.care_team_id = v_boundary.care_team_id
    and d.care_recipient_id = v_boundary.care_recipient_id
    and d.artifact_alias = p_request->>'artifact_alias'
    and d.is_vault_placeholder = true
    and d.status in ('uploaded', 'processing', 'active')
    and d.deleted_at is null
    and (
      d.uploaded_by = v_boundary.app_user_id
      or public.has_resource_capability(
        v_boundary.care_team_id,
        'care_recipient',
        v_boundary.care_recipient_id,
        'document.manage'
      )
      or public.can_view_document(d.id)
    )
  limit 1;

  if v_document.id is null then
    return query select 'denied'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  if v_document.attachment_status = 'attached' then
    return query select
      'duplicate_request'::text,
      'attached'::text,
      v_document.artifact_alias,
      v_document.artifact_category,
      v_document.visibility_category,
      v_document.attachment_status,
      array['document.upload']::text[],
      1,
      public.vault_artifact_time_bucket(v_document.created_at),
      v_permission_version;
    return;
  end if;

  select * into v_append
  from public.append_care_event(
    v_boundary.care_team_id,
    v_boundary.care_recipient_id,
    'vault-artifact-placeholder-' || v_document.artifact_alias,
    'CareArtifactAttachedEvent',
    'manual',
    now(),
    'care-artifact-placeholder',
    'vault-artifact-placeholder-' || v_document.artifact_alias,
    null,
    1,
    jsonb_build_object(
      'artifact',
      jsonb_build_object(
        'artifactAlias', v_document.artifact_alias,
        'artifactCategory', v_document.artifact_category,
        'visibilityCategory', v_document.visibility_category,
        'attachmentStatus', 'attached',
        'schemaVersion', 1
      )
    )
  );

  if v_append.status not in ('inserted', 'duplicate') then
    return query select 'unavailable'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
    return;
  end if;

  update public.documents d
  set attachment_status = 'attached',
    attached_care_event_id = v_append.care_event_id,
    updated_at = now()
  where d.id = v_document.id
  returning * into v_document;

  return query select
    'attached'::text,
    'attached'::text,
    v_document.artifact_alias,
    v_document.artifact_category,
    v_document.visibility_category,
    v_document.attachment_status,
    array['document.upload']::text[],
    1,
    public.vault_artifact_time_bucket(v_document.created_at),
    public.vault_placeholder_permission_version(v_boundary.membership_id);
exception
  when serialization_failure or deadlock_detected then
    return query select 'unavailable'::text, null::text, null::text, null::text, null::text, null::text, '{}'::text[], 0, null::text, null::text;
end;
$$;

revoke all on function public.vault_artifact_time_bucket(timestamptz) from public;
revoke all on function public.vault_artifact_time_bucket(timestamptz) from anon;
revoke all on function public.vault_artifact_time_bucket(timestamptz) from authenticated;

revoke all on function public.can_view_document(uuid) from public;
revoke all on function public.can_view_document(uuid) from anon;
revoke all on function public.can_view_document(uuid) from authenticated;
grant execute on function public.can_view_document(uuid) to authenticated;

revoke all on function public.vault_artifact_payload_status(jsonb) from public;
revoke all on function public.vault_artifact_payload_status(jsonb) from anon;
revoke all on function public.vault_artifact_payload_status(jsonb) from authenticated;

revoke all on function public.can_view_care_event_row(uuid, uuid, text, jsonb) from public;
revoke all on function public.can_view_care_event_row(uuid, uuid, text, jsonb) from anon;
revoke all on function public.can_view_care_event_row(uuid, uuid, text, jsonb) from authenticated;

revoke all on function public.vault_placeholder_permission_version(uuid) from public;
revoke all on function public.vault_placeholder_permission_version(uuid) from anon;
revoke all on function public.vault_placeholder_permission_version(uuid) from authenticated;

revoke all on function public.get_artifact_access_advisory_summary(jsonb) from public;
revoke all on function public.get_artifact_access_advisory_summary(jsonb) from anon;
grant execute on function public.get_artifact_access_advisory_summary(jsonb) to authenticated;

revoke all on function public.get_vault_artifact_summary(jsonb) from public;
revoke all on function public.get_vault_artifact_summary(jsonb) from anon;
grant execute on function public.get_vault_artifact_summary(jsonb) to authenticated;

revoke all on function public.create_vault_artifact_placeholder(jsonb) from public;
revoke all on function public.create_vault_artifact_placeholder(jsonb) from anon;
grant execute on function public.create_vault_artifact_placeholder(jsonb) to authenticated;

revoke all on function public.list_vault_artifacts(jsonb) from public;
revoke all on function public.list_vault_artifacts(jsonb) from anon;
grant execute on function public.list_vault_artifacts(jsonb) to authenticated;

revoke all on function public.attach_vault_artifact_to_timeline(jsonb) from public;
revoke all on function public.attach_vault_artifact_to_timeline(jsonb) from anon;
grant execute on function public.attach_vault_artifact_to_timeline(jsonb) to authenticated;
