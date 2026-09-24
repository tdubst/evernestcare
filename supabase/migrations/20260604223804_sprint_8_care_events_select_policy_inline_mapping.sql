-- Sprint 8 repair: keep care-event read helper internal by inlining the
-- capability mapping used by the care_events select policy.

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
