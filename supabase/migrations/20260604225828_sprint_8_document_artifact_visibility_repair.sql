-- Sprint 8 blocker repair: preserve restricted document semantics and keep
-- artifact event visibility bound to document.view/manage, not broad care_event.view.

create or replace function public.can_view_document(p_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with document_scope as (
    select
      d.id,
      d.care_team_id,
      d.care_recipient_id,
      d.uploaded_by,
      d.restricted,
      d.status,
      d.visibility_category,
      coalesce(d.is_vault_placeholder, false) as is_vault_placeholder
    from public.documents d
    where d.id = p_document_id
      and d.deleted_at is null
  ),
  active_subject_roles as (
    select ctm.role_id
    from document_scope d
    join public.care_team_members ctm on ctm.care_team_id = d.care_team_id
    where ctm.user_id = public.current_app_user_id()
      and ctm.status = 'active'
      and ctm.revoked_at is null
  ),
  explicit_flags as (
    select
      d.id as document_id,
      exists (
        select 1
        from public.permission_grants pg
        where pg.care_team_id = d.care_team_id
          and pg.capability = 'document.view'
          and pg.effect = 'deny'
          and pg.revoked_at is null
          and pg.starts_at <= now()
          and (pg.expires_at is null or pg.expires_at > now())
          and (
            (
              pg.resource_type = 'care_recipient'
              and (pg.resource_id is null or pg.resource_id = d.care_recipient_id)
            )
            or (
              pg.resource_type = 'document'
              and pg.resource_id = d.id
            )
          )
          and (
            pg.subject_user_id = public.current_app_user_id()
            or pg.subject_role_id in (select role_id from active_subject_roles)
          )
      ) as document_view_denied,
      exists (
        select 1
        from public.permission_grants pg
        where pg.care_team_id = d.care_team_id
          and pg.resource_type = 'document'
          and pg.resource_id = d.id
          and pg.capability = 'document.view'
          and pg.effect = 'allow'
          and pg.revoked_at is null
          and pg.starts_at <= now()
          and (pg.expires_at is null or pg.expires_at > now())
          and (
            pg.subject_user_id = public.current_app_user_id()
            or pg.subject_role_id in (select role_id from active_subject_roles)
          )
      ) as explicit_document_view_allowed,
      exists (
        select 1
        from public.permission_grants pg
        where pg.care_team_id = d.care_team_id
          and pg.capability = 'document.manage'
          and pg.effect = 'deny'
          and pg.revoked_at is null
          and pg.starts_at <= now()
          and (pg.expires_at is null or pg.expires_at > now())
          and (
            (
              pg.resource_type = 'care_recipient'
              and (pg.resource_id is null or pg.resource_id = d.care_recipient_id)
            )
            or (
              pg.resource_type = 'document'
              and pg.resource_id = d.id
            )
          )
          and (
            pg.subject_user_id = public.current_app_user_id()
            or pg.subject_role_id in (select role_id from active_subject_roles)
          )
      ) as document_manage_denied,
      exists (
        select 1
        from public.permission_grants pg
        where pg.care_team_id = d.care_team_id
          and pg.resource_type = 'document'
          and pg.resource_id = d.id
          and pg.capability = 'document.manage'
          and pg.effect = 'allow'
          and pg.revoked_at is null
          and pg.starts_at <= now()
          and (pg.expires_at is null or pg.expires_at > now())
          and (
            pg.subject_user_id = public.current_app_user_id()
            or pg.subject_role_id in (select role_id from active_subject_roles)
          )
      ) as explicit_document_manage_allowed
    from document_scope d
  )
  select coalesce(
    exists (
      select 1
      from document_scope d
      join explicit_flags f on f.document_id = d.id
      where (
        d.is_vault_placeholder <> true
        and f.document_view_denied = false
        and (
          (
            d.restricted = false
            and public.has_resource_capability(
              d.care_team_id,
              'care_recipient',
              d.care_recipient_id,
              'document.view'
            )
          )
          or f.explicit_document_view_allowed
        )
      )
      or (
        d.is_vault_placeholder = true
        and d.status in ('uploaded', 'processing', 'active')
        and (
          (
            f.document_view_denied = false
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
              or f.explicit_document_view_allowed
            )
          )
          or (
            f.document_manage_denied = false
            and (
              public.has_resource_capability(
                d.care_team_id,
                'care_recipient',
                d.care_recipient_id,
                'document.manage'
              )
              or f.explicit_document_manage_allowed
            )
          )
        )
      )
    ),
    false
  )
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
    when care_events.event_type = 'CareNoteAddedEvent' then public.has_resource_capability(
      care_events.care_team_id,
      'care_recipient',
      care_events.care_recipient_id,
      'care_note.view'
    )
    else public.has_resource_capability(
      care_events.care_team_id,
      'care_recipient',
      care_events.care_recipient_id,
      'care_event.view'
    )
  end
);

revoke all on function public.can_view_document(uuid) from public;
revoke all on function public.can_view_document(uuid) from anon;
revoke all on function public.can_view_document(uuid) from authenticated;
grant execute on function public.can_view_document(uuid) to authenticated;

revoke all on function public.care_event_payload_is_structural(text, jsonb) from public;
revoke all on function public.care_event_payload_is_structural(text, jsonb) from anon;
revoke all on function public.care_event_payload_is_structural(text, jsonb) from authenticated;
