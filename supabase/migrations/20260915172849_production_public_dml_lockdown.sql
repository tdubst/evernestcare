-- Production access is provisioned administratively. Runtime hydration must
-- never create a user, recipient, team, or owner membership.
revoke all on function public.ensure_care_boundary(text, text, uuid)
from public, anon, authenticated;

-- Invitation delivery and activation are not part of the initial production
-- release. Keep preview/read APIs available, but close the mutation RPC until
-- a reviewed delivery path is installed.
revoke all on function public.create_care_circle_invitation(jsonb)
from public, anon, authenticated;

-- This helper only supported the now-closed direct membership bootstrap path.
revoke all on function public.team_has_no_members(uuid)
from public, anon, authenticated;

-- PostgreSQL grants PUBLIC privileges independently of the API roles. Revoke
-- direct mutations from every exposed role so writes only use reviewed RPCs.
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
from public, anon, authenticated;
