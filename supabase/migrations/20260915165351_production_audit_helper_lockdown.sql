-- Internal audit writes must only execute inside trusted triggers and
-- reviewed security-definer product RPCs. They are not a public API.
revoke all on function public.write_audit_event(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  jsonb
) from public, anon, authenticated;

-- Product mutations flow through reviewed security-definer RPCs. Keep table
-- reads governed by RLS while removing direct mutation paths from API roles.
revoke insert, update, delete on table
  public.users,
  public.care_recipients,
  public.care_teams,
  public.roles,
  public.care_team_members,
  public.permission_grants,
  public.invitations,
  public.appointments,
  public.medications,
  public.tasks,
  public.conversations,
  public.conversation_participants,
  public.messages,
  public.documents,
  public.imaging_studies,
  public.notifications,
  public.audit_events,
  public.care_events
from anon, authenticated;
