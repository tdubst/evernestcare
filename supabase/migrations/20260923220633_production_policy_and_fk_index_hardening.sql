-- Production writes use reviewed RPCs only. Remove every residual direct-write
-- policy and make the remaining simple read policies explicit and efficient.

drop policy if exists care_recipients_insert_authenticated on public.care_recipients;
drop policy if exists care_recipients_update_admins on public.care_recipients;
drop policy if exists care_team_members_insert_admins on public.care_team_members;
drop policy if exists care_team_members_update_admins on public.care_team_members;
drop policy if exists care_teams_insert_authenticated on public.care_teams;
drop policy if exists care_teams_update_admins on public.care_teams;
drop policy if exists invitations_insert_admins on public.invitations;
drop policy if exists invitations_update_admin_or_invited_user on public.invitations;
drop policy if exists messages_insert_participants on public.messages;
drop policy if exists messages_update_author on public.messages;
drop policy if exists notifications_update_own_delivery_state on public.notifications;
drop policy if exists permission_grants_insert_admins on public.permission_grants;
drop policy if exists permission_grants_update_admins on public.permission_grants;
drop policy if exists users_insert_self on public.users;
drop policy if exists users_update_self on public.users;

drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
for select to authenticated
using ((select auth.uid()) = auth_user_id);

drop policy if exists roles_select_authenticated on public.roles;
create policy roles_select_authenticated on public.roles
for select to authenticated
using (true);

-- Add covering indexes for every foreign key before production data volume
-- makes referential checks and parent updates expensive.
create index if not exists appointments_care_team_id_idx
  on public.appointments(care_team_id);
create index if not exists appointments_created_by_idx
  on public.appointments(created_by);
create index if not exists audit_events_actor_user_id_idx
  on public.audit_events(actor_user_id);
create index if not exists audit_events_care_recipient_id_idx
  on public.audit_events(care_recipient_id);
create index if not exists audit_events_target_user_id_idx
  on public.audit_events(target_user_id);
create index if not exists care_events_actor_user_id_idx
  on public.care_events(actor_user_id);
create index if not exists care_recipients_archived_by_idx
  on public.care_recipients(archived_by);
create index if not exists care_recipients_created_by_idx
  on public.care_recipients(created_by);
create index if not exists care_team_members_invited_by_idx
  on public.care_team_members(invited_by);
create index if not exists care_team_members_revoked_by_idx
  on public.care_team_members(revoked_by);
create index if not exists care_team_members_role_id_idx
  on public.care_team_members(role_id);
create index if not exists care_teams_archived_by_idx
  on public.care_teams(archived_by);
create index if not exists care_teams_created_by_idx
  on public.care_teams(created_by);
create index if not exists conversation_participants_added_by_idx
  on public.conversation_participants(added_by);
create index if not exists conversation_participants_removed_by_idx
  on public.conversation_participants(removed_by);
create index if not exists conversations_care_recipient_id_idx
  on public.conversations(care_recipient_id);
create index if not exists conversations_created_by_idx
  on public.conversations(created_by);
create index if not exists documents_attached_care_event_id_idx
  on public.documents(attached_care_event_id);
create index if not exists documents_uploaded_by_idx
  on public.documents(uploaded_by);
create index if not exists imaging_studies_care_team_id_idx
  on public.imaging_studies(care_team_id);
create index if not exists imaging_studies_source_document_id_idx
  on public.imaging_studies(source_document_id);
create index if not exists imaging_studies_uploaded_by_idx
  on public.imaging_studies(uploaded_by);
create index if not exists invitations_accepted_by_idx
  on public.invitations(accepted_by);
create index if not exists invitations_care_recipient_id_idx
  on public.invitations(care_recipient_id);
create index if not exists invitations_invited_by_idx
  on public.invitations(invited_by);
create index if not exists invitations_invited_user_id_idx
  on public.invitations(invited_user_id);
create index if not exists invitations_revoked_by_idx
  on public.invitations(revoked_by);
create index if not exists invitations_role_id_idx
  on public.invitations(role_id);
create index if not exists medications_care_team_id_idx
  on public.medications(care_team_id);
create index if not exists medications_created_by_idx
  on public.medications(created_by);
create index if not exists messages_author_id_idx
  on public.messages(author_id);
create index if not exists notifications_care_recipient_id_idx
  on public.notifications(care_recipient_id);
create index if not exists notifications_care_team_id_idx
  on public.notifications(care_team_id);
create index if not exists permission_grants_care_recipient_id_idx
  on public.permission_grants(care_recipient_id);
create index if not exists permission_grants_care_team_id_idx
  on public.permission_grants(care_team_id);
create index if not exists permission_grants_created_by_idx
  on public.permission_grants(created_by);
create index if not exists permission_grants_revoked_by_idx
  on public.permission_grants(revoked_by);
create index if not exists tasks_assigned_to_idx
  on public.tasks(assigned_to);
create index if not exists tasks_care_team_id_idx
  on public.tasks(care_team_id);
create index if not exists tasks_completed_by_idx
  on public.tasks(completed_by);
create index if not exists tasks_created_by_idx
  on public.tasks(created_by);

do $production_policy_index_assertions$
begin
  if exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and cmd <> 'SELECT'
  ) then
    raise exception 'direct-write RLS policy remains in production posture'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_constraint constraints
    join pg_catalog.pg_class relations on relations.oid = constraints.conrelid
    join pg_catalog.pg_namespace namespaces on namespaces.oid = relations.relnamespace
    where constraints.contype = 'f'
      and namespaces.nspname = 'public'
      and not exists (
        select 1
        from pg_catalog.pg_index indexes
        where indexes.indrelid = constraints.conrelid
          and indexes.indisvalid
          and indexes.indisready
          and (indexes.indkey::smallint[])[0:pg_catalog.array_length(constraints.conkey, 1) - 1]
            = constraints.conkey
      )
  ) then
    raise exception 'public foreign key remains without a covering index'
      using errcode = 'P0001';
  end if;
end
$production_policy_index_assertions$;
