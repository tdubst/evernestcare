-- Evernest Care core trust runtime.
-- Source of truth: FOUNDATION/ENTITY_MODEL.md, PERMISSIONS_RUNTIME.md, RLS_ARCHITECTURE.md.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  status text not null default 'active' check (status in ('invited', 'active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.care_recipients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  preferred_name text,
  relationship_context text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived', 'deleted')),
  onboarding_state jsonb not null default '{}'::jsonb,
  primary_care_team_id uuid,
  created_by uuid references public.users(id),
  archived_by uuid references public.users(id),
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.care_teams (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id) on delete restrict,
  name text not null,
  status text not null default 'active' check (status in ('active', 'archived', 'dissolved')),
  created_by uuid references public.users(id),
  archived_by uuid references public.users(id),
  archived_at timestamptz,
  dissolved_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.care_recipients
  add constraint care_recipients_primary_care_team_id_fkey
  foreign key (primary_care_team_id) references public.care_teams(id) on delete set null;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  role_key text unique not null check (
    role_key in (
      'owner',
      'primary_caregiver',
      'family_member',
      'viewer',
      'provider_contact',
      'emergency_contact'
    )
  ),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'deprecated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.roles (role_key, name, description)
values
  ('owner', 'Owner', 'Full administrative control over the care team and recipient.'),
  ('primary_caregiver', 'Primary caregiver', 'Broad coordination access without ownership transfer by default.'),
  ('family_member', 'Family member', 'Shared view, comment, and task participation.'),
  ('viewer', 'Viewer', 'Read-limited access to selected surfaces.'),
  ('provider_contact', 'Provider contact', 'No default account access unless explicitly invited and granted.'),
  ('emergency_contact', 'Emergency contact', 'Contact designation only unless separately granted.')
on conflict (role_key) do nothing;

create table public.care_team_members (
  id uuid primary key default gen_random_uuid(),
  care_team_id uuid not null references public.care_teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  status text not null default 'active' check (status in ('invited', 'active', 'revoked', 'left')),
  invited_by uuid references public.users(id),
  joined_at timestamptz,
  revoked_by uuid references public.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (care_team_id, user_id)
);

create table public.permission_grants (
  id uuid primary key default gen_random_uuid(),
  care_team_id uuid not null references public.care_teams(id) on delete cascade,
  care_recipient_id uuid references public.care_recipients(id) on delete cascade,
  subject_user_id uuid references public.users(id) on delete cascade,
  subject_role_id uuid references public.roles(id) on delete cascade,
  resource_type text not null check (
    resource_type in (
      'care_team',
      'care_recipient',
      'appointment',
      'medication',
      'task',
      'conversation',
      'document',
      'imaging_study'
    )
  ),
  resource_id uuid,
  capability text not null,
  effect text not null default 'allow' check (effect in ('allow', 'deny')),
  reason text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_by uuid references public.users(id),
  revoked_at timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (subject_user_id is not null or subject_role_id is not null)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  care_team_id uuid not null references public.care_teams(id) on delete cascade,
  care_recipient_id uuid references public.care_recipients(id) on delete cascade,
  email text not null,
  invited_user_id uuid references public.users(id) on delete set null,
  role_id uuid not null references public.roles(id) on delete restrict,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked', 'declined')),
  message text,
  invited_by uuid not null references public.users(id),
  accepted_by uuid references public.users(id),
  accepted_at timestamptz,
  revoked_by uuid references public.users(id),
  revoked_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  care_team_id uuid not null references public.care_teams(id) on delete cascade,
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  title text not null,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'planned' check (status in ('planned', 'confirmed', 'completed', 'canceled', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  care_team_id uuid not null references public.care_teams(id) on delete cascade,
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  name text not null,
  dosage text,
  schedule_note text,
  status text not null default 'active' check (status in ('active', 'paused', 'discontinued', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  care_team_id uuid not null references public.care_teams(id) on delete cascade,
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  title text not null,
  notes text,
  assigned_to uuid references public.users(id) on delete set null,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'in_progress', 'blocked', 'completed', 'canceled', 'archived')),
  created_by uuid references public.users(id),
  completed_by uuid references public.users(id),
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  care_team_id uuid not null references public.care_teams(id) on delete cascade,
  care_recipient_id uuid references public.care_recipients(id) on delete cascade,
  resource_type text check (resource_type in ('care_team', 'care_recipient', 'appointment', 'task', 'document', 'imaging_study')),
  resource_id uuid,
  title text,
  status text not null default 'active' check (status in ('active', 'muted', 'archived', 'closed')),
  created_by uuid references public.users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'removed', 'left')),
  added_by uuid references public.users(id),
  removed_by uuid references public.users(id),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete restrict,
  body text not null,
  status text not null default 'sent' check (status in ('sent', 'edited', 'deleted', 'archived')),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  care_team_id uuid not null references public.care_teams(id) on delete cascade,
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  uploaded_by uuid references public.users(id) on delete set null,
  title text not null,
  bucket text not null default 'documents-private',
  storage_path text not null,
  mime_type text,
  byte_size bigint,
  restricted boolean not null default false,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'active', 'archived', 'deleted')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, storage_path)
);

create table public.imaging_studies (
  id uuid primary key default gen_random_uuid(),
  care_team_id uuid not null references public.care_teams(id) on delete cascade,
  care_recipient_id uuid not null references public.care_recipients(id) on delete cascade,
  source_document_id uuid references public.documents(id) on delete set null,
  uploaded_by uuid references public.users(id) on delete set null,
  title text not null,
  modality text,
  study_date date,
  status text not null default 'uploaded' check (status in ('uploaded', 'active', 'archived', 'deleted')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  care_team_id uuid references public.care_teams(id) on delete cascade,
  care_recipient_id uuid references public.care_recipients(id) on delete cascade,
  source_type text,
  source_id uuid,
  title text not null,
  body text,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'read', 'dismissed', 'expired')),
  delivered_at timestamptz,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  care_team_id uuid references public.care_teams(id) on delete set null,
  care_recipient_id uuid references public.care_recipients(id) on delete set null,
  actor_user_id uuid references public.users(id) on delete set null,
  target_user_id uuid references public.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index users_auth_user_id_idx on public.users(auth_user_id);
create index care_recipients_primary_team_idx on public.care_recipients(primary_care_team_id);
create index care_teams_recipient_idx on public.care_teams(care_recipient_id);
create index care_team_members_team_user_idx on public.care_team_members(care_team_id, user_id);
create index care_team_members_user_idx on public.care_team_members(user_id);
create index permission_grants_subject_user_idx on public.permission_grants(subject_user_id);
create index permission_grants_subject_role_idx on public.permission_grants(subject_role_id);
create index permission_grants_resource_idx on public.permission_grants(resource_type, resource_id);
create index invitations_email_idx on public.invitations(lower(email));
create unique index invitations_one_pending_per_email_idx
  on public.invitations(care_team_id, lower(email))
  where status = 'pending';
create index appointments_recipient_idx on public.appointments(care_recipient_id);
create index medications_recipient_idx on public.medications(care_recipient_id);
create index tasks_recipient_idx on public.tasks(care_recipient_id);
create index conversations_team_idx on public.conversations(care_team_id);
create index conversation_participants_user_idx on public.conversation_participants(user_id);
create index messages_conversation_idx on public.messages(conversation_id);
create index documents_recipient_idx on public.documents(care_recipient_id);
create index imaging_studies_recipient_idx on public.imaging_studies(care_recipient_id);
create index notifications_user_idx on public.notifications(user_id);
create index audit_events_team_idx on public.audit_events(care_team_id, created_at desc);
create index audit_events_resource_idx on public.audit_events(resource_type, resource_id);

create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger care_recipients_set_updated_at before update on public.care_recipients for each row execute function public.set_updated_at();
create trigger care_teams_set_updated_at before update on public.care_teams for each row execute function public.set_updated_at();
create trigger roles_set_updated_at before update on public.roles for each row execute function public.set_updated_at();
create trigger care_team_members_set_updated_at before update on public.care_team_members for each row execute function public.set_updated_at();
create trigger permission_grants_set_updated_at before update on public.permission_grants for each row execute function public.set_updated_at();
create trigger invitations_set_updated_at before update on public.invitations for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger medications_set_updated_at before update on public.medications for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger conversations_set_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger conversation_participants_set_updated_at before update on public.conversation_participants for each row execute function public.set_updated_at();
create trigger messages_set_updated_at before update on public.messages for each row execute function public.set_updated_at();
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();
create trigger imaging_studies_set_updated_at before update on public.imaging_studies for each row execute function public.set_updated_at();
create trigger notifications_set_updated_at before update on public.notifications for each row execute function public.set_updated_at();

create or replace function public.write_audit_event(
  p_care_team_id uuid,
  p_care_recipient_id uuid,
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_events (
    care_team_id,
    care_recipient_id,
    actor_user_id,
    target_user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  values (
    p_care_team_id,
    p_care_recipient_id,
    p_actor_user_id,
    p_target_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

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
      jsonb_build_object('email', new.email, 'status', new.status)
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

create or replace function public.audit_permission_grant_changes()
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
      new.created_by,
      new.subject_user_id,
      'permission_grant.created',
      'permission_grant',
      new.id,
      jsonb_build_object('resource_type', new.resource_type, 'capability', new.capability, 'effect', new.effect)
    );
  elsif tg_op = 'UPDATE' and old.revoked_at is null and new.revoked_at is not null then
    perform public.write_audit_event(
      new.care_team_id,
      new.care_recipient_id,
      new.revoked_by,
      new.subject_user_id,
      'permission_grant.revoked',
      'permission_grant',
      new.id,
      jsonb_build_object('resource_type', new.resource_type, 'capability', new.capability, 'effect', new.effect)
    );
  elsif tg_op = 'UPDATE' and (
    old.effect is distinct from new.effect
    or old.expires_at is distinct from new.expires_at
    or old.capability is distinct from new.capability
  ) then
    perform public.write_audit_event(
      new.care_team_id,
      new.care_recipient_id,
      coalesce(new.created_by, new.revoked_by),
      new.subject_user_id,
      'permission_grant.updated',
      'permission_grant',
      new.id,
      jsonb_build_object('resource_type', new.resource_type, 'capability', new.capability, 'effect', new.effect)
    );
  end if;

  return new;
end;
$$;

create or replace function public.audit_membership_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_care_recipient_id uuid;
begin
  select care_recipient_id into v_care_recipient_id
  from public.care_teams
  where id = new.care_team_id;

  if tg_op = 'INSERT' then
    perform public.write_audit_event(
      new.care_team_id,
      v_care_recipient_id,
      new.invited_by,
      new.user_id,
      'membership.created',
      'care_team_member',
      new.id,
      jsonb_build_object('status', new.status, 'role_id', new.role_id)
    );
  elsif tg_op = 'UPDATE' and old.role_id is distinct from new.role_id then
    perform public.write_audit_event(
      new.care_team_id,
      v_care_recipient_id,
      coalesce(new.revoked_by, public.current_app_user_id()),
      new.user_id,
      'role.changed',
      'care_team_member',
      new.id,
      jsonb_build_object('previous_role_id', old.role_id, 'role_id', new.role_id)
    );
  elsif tg_op = 'UPDATE' and old.revoked_at is null and new.revoked_at is not null then
    perform public.write_audit_event(
      new.care_team_id,
      v_care_recipient_id,
      new.revoked_by,
      new.user_id,
      'membership.revoked',
      'care_team_member',
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

create or replace function public.audit_document_changes()
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
      new.uploaded_by,
      null,
      'document.uploaded',
      'document',
      new.id,
      jsonb_build_object('restricted', new.restricted, 'bucket', new.bucket)
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
      jsonb_build_object('restricted', new.restricted, 'bucket', new.bucket)
    );
  end if;

  return new;
end;
$$;

create trigger invitations_audit after insert or update on public.invitations for each row execute function public.audit_invitation_changes();
create trigger permission_grants_audit after insert or update on public.permission_grants for each row execute function public.audit_permission_grant_changes();
create trigger care_team_members_audit after insert or update on public.care_team_members for each row execute function public.audit_membership_changes();
create trigger care_recipients_audit after insert or update on public.care_recipients for each row execute function public.audit_care_recipient_changes();
create trigger documents_audit after insert or update on public.documents for each row execute function public.audit_document_changes();

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.users
  where auth_user_id = auth.uid()
    and status = 'active'
    and deleted_at is null
  limit 1
$$;

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
      'task.view', 'task.manage',
      'conversation.view', 'message.send',
      'document.view', 'imaging.view'
    ])
    when p_role_key = 'viewer' then p_capability = any(array[
      'recipient.view', 'team.view', 'appointment.view', 'task.view'
    ])
    else false
  end
$$;

create or replace function public.has_active_team_membership(p_care_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.care_team_members ctm
    join public.users u on u.id = ctm.user_id
    where ctm.care_team_id = p_care_team_id
      and ctm.user_id = public.current_app_user_id()
      and ctm.status = 'active'
      and ctm.revoked_at is null
      and u.status = 'active'
      and u.deleted_at is null
  )
$$;

create or replace function public.has_team_capability(p_care_team_id uuid, p_capability text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.current_app_user_id();
  v_has_role boolean := false;
  v_denied boolean := false;
  v_allowed boolean := false;
begin
  if v_user_id is null then
    return false;
  end if;

  select exists (
    select 1
    from public.care_team_members ctm
    join public.roles r on r.id = ctm.role_id
    where ctm.care_team_id = p_care_team_id
      and ctm.user_id = v_user_id
      and ctm.status = 'active'
      and ctm.revoked_at is null
      and public.evernest_role_allows(r.role_key, p_capability)
  ) into v_has_role;

  select exists (
    select 1
    from public.permission_grants pg
    where pg.care_team_id = p_care_team_id
      and pg.capability = p_capability
      and pg.effect = 'deny'
      and pg.revoked_at is null
      and pg.starts_at <= now()
      and (pg.expires_at is null or pg.expires_at > now())
      and (
        pg.subject_user_id = v_user_id
        or pg.subject_role_id in (
          select role_id
          from public.care_team_members
          where care_team_id = p_care_team_id
            and user_id = v_user_id
            and status = 'active'
            and revoked_at is null
        )
      )
      and pg.resource_type = 'care_team'
      and (pg.resource_id is null or pg.resource_id = p_care_team_id)
  ) into v_denied;

  if v_denied then
    return false;
  end if;

  select exists (
    select 1
    from public.permission_grants pg
    where pg.care_team_id = p_care_team_id
      and pg.capability = p_capability
      and pg.effect = 'allow'
      and pg.revoked_at is null
      and pg.starts_at <= now()
      and (pg.expires_at is null or pg.expires_at > now())
      and (
        pg.subject_user_id = v_user_id
        or pg.subject_role_id in (
          select role_id
          from public.care_team_members
          where care_team_id = p_care_team_id
            and user_id = v_user_id
            and status = 'active'
            and revoked_at is null
        )
      )
      and pg.resource_type = 'care_team'
      and (pg.resource_id is null or pg.resource_id = p_care_team_id)
  ) into v_allowed;

  return v_has_role or v_allowed;
end;
$$;

create or replace function public.team_has_no_members(p_care_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.care_team_members
    where care_team_id = p_care_team_id
  )
$$;

create or replace function public.has_resource_capability(
  p_care_team_id uuid,
  p_resource_type text,
  p_resource_id uuid,
  p_capability text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.current_app_user_id();
  v_denied boolean := false;
  v_allowed boolean := false;
begin
  if not public.has_active_team_membership(p_care_team_id) then
    return false;
  end if;

  select exists (
    select 1
    from public.permission_grants pg
    where pg.care_team_id = p_care_team_id
      and pg.resource_type = p_resource_type
      and (pg.resource_id is null or pg.resource_id = p_resource_id)
      and pg.capability = p_capability
      and pg.effect = 'deny'
      and pg.revoked_at is null
      and pg.starts_at <= now()
      and (pg.expires_at is null or pg.expires_at > now())
      and (
        pg.subject_user_id = v_user_id
        or pg.subject_role_id in (
          select role_id
          from public.care_team_members
          where care_team_id = p_care_team_id
            and user_id = v_user_id
            and status = 'active'
            and revoked_at is null
        )
      )
  ) into v_denied;

  if v_denied then
    return false;
  end if;

  select exists (
    select 1
    from public.permission_grants pg
    where pg.care_team_id = p_care_team_id
      and pg.resource_type = p_resource_type
      and (pg.resource_id is null or pg.resource_id = p_resource_id)
      and pg.capability = p_capability
      and pg.effect = 'allow'
      and pg.revoked_at is null
      and pg.starts_at <= now()
      and (pg.expires_at is null or pg.expires_at > now())
      and (
        pg.subject_user_id = v_user_id
        or pg.subject_role_id in (
          select role_id
          from public.care_team_members
          where care_team_id = p_care_team_id
            and user_id = v_user_id
            and status = 'active'
            and revoked_at is null
        )
      )
  ) into v_allowed;

  return v_allowed or public.has_team_capability(p_care_team_id, p_capability);
end;
$$;

create or replace function public.can_view_recipient(p_care_recipient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.care_recipients cr
    join public.care_teams ct on ct.id = cr.primary_care_team_id or ct.care_recipient_id = cr.id
    where cr.id = p_care_recipient_id
      and cr.deleted_at is null
      and public.has_resource_capability(ct.id, 'care_recipient', cr.id, 'recipient.view')
  )
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
      and (
        (d.restricted = false and public.has_resource_capability(d.care_team_id, 'care_recipient', d.care_recipient_id, 'document.view'))
        or public.has_resource_capability(d.care_team_id, 'document', d.id, 'document.view')
      )
  )
$$;

create or replace function public.can_view_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    join public.conversation_participants cp on cp.conversation_id = c.id
    where c.id = p_conversation_id
      and c.deleted_at is null
      and c.status in ('active', 'muted', 'archived')
      and cp.user_id = public.current_app_user_id()
      and cp.status = 'active'
      and public.has_resource_capability(c.care_team_id, 'conversation', c.id, 'conversation.view')
  )
$$;

create or replace function public.prevent_audit_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events are append-only';
end;
$$;

create trigger audit_events_no_update before update on public.audit_events for each row execute function public.prevent_audit_event_mutation();
create trigger audit_events_no_delete before delete on public.audit_events for each row execute function public.prevent_audit_event_mutation();

alter table public.users enable row level security;
alter table public.care_recipients enable row level security;
alter table public.care_teams enable row level security;
alter table public.roles enable row level security;
alter table public.care_team_members enable row level security;
alter table public.permission_grants enable row level security;
alter table public.invitations enable row level security;
alter table public.appointments enable row level security;
alter table public.medications enable row level security;
alter table public.tasks enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.imaging_studies enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;

create policy users_select_self_or_shared_team on public.users
for select using (
  auth.uid() = auth_user_id
  or exists (
    select 1
    from public.care_team_members mine
    join public.care_team_members theirs on theirs.care_team_id = mine.care_team_id
    where mine.user_id = public.current_app_user_id()
      and theirs.user_id = users.id
      and mine.status = 'active'
      and theirs.status = 'active'
  )
);

create policy users_insert_self on public.users
for insert with check (auth.uid() = auth_user_id);

create policy users_update_self on public.users
for update using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

create policy roles_select_authenticated on public.roles
for select using (auth.role() = 'authenticated');

create policy care_teams_select_members on public.care_teams
for select using (public.has_active_team_membership(id));

create policy care_teams_insert_authenticated on public.care_teams
for insert with check (auth.role() = 'authenticated' and created_by = public.current_app_user_id());

create policy care_teams_update_admins on public.care_teams
for update using (public.has_team_capability(id, 'team.manage'))
with check (public.has_team_capability(id, 'team.manage'));

create policy care_recipients_select_permitted on public.care_recipients
for select using (public.can_view_recipient(id));

create policy care_recipients_insert_authenticated on public.care_recipients
for insert with check (auth.role() = 'authenticated' and created_by = public.current_app_user_id());

create policy care_recipients_update_admins on public.care_recipients
for update using (
  exists (
    select 1 from public.care_teams ct
    where ct.care_recipient_id = care_recipients.id
      and public.has_resource_capability(ct.id, 'care_recipient', care_recipients.id, 'recipient.manage')
  )
)
with check (
  exists (
    select 1 from public.care_teams ct
    where ct.care_recipient_id = care_recipients.id
      and public.has_resource_capability(ct.id, 'care_recipient', care_recipients.id, 'recipient.manage')
  )
);

create policy care_team_members_select_members on public.care_team_members
for select using (public.has_active_team_membership(care_team_id));

create policy care_team_members_insert_admins on public.care_team_members
for insert with check (
  public.has_team_capability(care_team_id, 'team.manage')
  or (
    public.team_has_no_members(care_team_id)
    and user_id = public.current_app_user_id()
    and role_id = (select id from public.roles where role_key = 'owner')
    and status = 'active'
  )
);

create policy care_team_members_update_admins on public.care_team_members
for update using (public.has_team_capability(care_team_id, 'team.manage'))
with check (public.has_team_capability(care_team_id, 'team.manage'));

create policy permission_grants_select_admin_or_subject on public.permission_grants
for select using (
  public.has_team_capability(care_team_id, 'permissions.manage')
  or subject_user_id = public.current_app_user_id()
);

create policy permission_grants_insert_admins on public.permission_grants
for insert with check (
  public.has_team_capability(care_team_id, 'permissions.manage')
  and created_by = public.current_app_user_id()
);

create policy permission_grants_update_admins on public.permission_grants
for update using (public.has_team_capability(care_team_id, 'permissions.manage'))
with check (public.has_team_capability(care_team_id, 'permissions.manage'));

create policy invitations_select_admin_or_invited_user on public.invitations
for select using (
  public.has_team_capability(care_team_id, 'invitation.manage')
  or invited_user_id = public.current_app_user_id()
);

create policy invitations_insert_admins on public.invitations
for insert with check (
  public.has_team_capability(care_team_id, 'invitation.manage')
  and invited_by = public.current_app_user_id()
);

create policy invitations_update_admin_or_invited_user on public.invitations
for update using (
  public.has_team_capability(care_team_id, 'invitation.manage')
  or invited_user_id = public.current_app_user_id()
)
with check (
  public.has_team_capability(care_team_id, 'invitation.manage')
  or accepted_by = public.current_app_user_id()
);

create policy appointments_select_permitted on public.appointments
for select using (
  deleted_at is null
  and public.has_resource_capability(care_team_id, 'appointment', id, 'appointment.view')
);

create policy appointments_write_permitted on public.appointments
for all using (public.has_resource_capability(care_team_id, 'appointment', id, 'appointment.manage'))
with check (public.has_resource_capability(care_team_id, 'appointment', id, 'appointment.manage'));

create policy medications_select_permitted on public.medications
for select using (
  deleted_at is null
  and public.has_resource_capability(care_team_id, 'medication', id, 'medication.view')
);

create policy medications_write_permitted on public.medications
for all using (public.has_resource_capability(care_team_id, 'medication', id, 'medication.manage'))
with check (public.has_resource_capability(care_team_id, 'medication', id, 'medication.manage'));

create policy tasks_select_permitted_or_assigned on public.tasks
for select using (
  deleted_at is null
  and (
    public.has_resource_capability(care_team_id, 'task', id, 'task.view')
    or assigned_to = public.current_app_user_id()
  )
);

create policy tasks_write_permitted_or_assigned on public.tasks
for all using (
  public.has_resource_capability(care_team_id, 'task', id, 'task.manage')
  or assigned_to = public.current_app_user_id()
)
with check (
  public.has_resource_capability(care_team_id, 'task', id, 'task.manage')
  or assigned_to = public.current_app_user_id()
);

create policy conversations_select_participants on public.conversations
for select using (public.can_view_conversation(id));

create policy conversations_write_managers on public.conversations
for all using (public.has_resource_capability(care_team_id, 'conversation', id, 'conversation.manage'))
with check (public.has_resource_capability(care_team_id, 'conversation', id, 'conversation.manage'));

create policy conversation_participants_select_visible on public.conversation_participants
for select using (public.can_view_conversation(conversation_id));

create policy conversation_participants_write_managers on public.conversation_participants
for all using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_participants.conversation_id
      and public.has_resource_capability(c.care_team_id, 'conversation', c.id, 'conversation.manage')
  )
)
with check (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_participants.conversation_id
      and public.has_resource_capability(c.care_team_id, 'conversation', c.id, 'conversation.manage')
  )
);

create policy messages_select_participants on public.messages
for select using (deleted_at is null and public.can_view_conversation(conversation_id));

create policy messages_insert_participants on public.messages
for insert with check (
  author_id = public.current_app_user_id()
  and public.can_view_conversation(conversation_id)
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and public.has_resource_capability(c.care_team_id, 'conversation', c.id, 'message.send')
  )
);

create policy messages_update_author on public.messages
for update using (author_id = public.current_app_user_id())
with check (author_id = public.current_app_user_id());

create policy documents_select_permitted on public.documents
for select using (public.can_view_document(id));

create policy documents_write_permitted on public.documents
for all using (public.has_resource_capability(care_team_id, 'document', id, 'document.manage'))
with check (
  public.has_resource_capability(care_team_id, 'document', id, 'document.manage')
  or (
    uploaded_by = public.current_app_user_id()
    and public.has_resource_capability(care_team_id, 'care_recipient', care_recipient_id, 'document.upload')
  )
);

create policy imaging_studies_select_permitted on public.imaging_studies
for select using (
  deleted_at is null
  and (
    public.has_resource_capability(care_team_id, 'imaging_study', id, 'imaging.view')
    or (
      source_document_id is not null
      and public.can_view_document(source_document_id)
    )
  )
);

create policy imaging_studies_write_permitted on public.imaging_studies
for all using (public.has_resource_capability(care_team_id, 'imaging_study', id, 'imaging.upload'))
with check (public.has_resource_capability(care_team_id, 'imaging_study', id, 'imaging.upload'));

create policy notifications_select_own on public.notifications
for select using (user_id = public.current_app_user_id());

create policy notifications_update_own_delivery_state on public.notifications
for update using (user_id = public.current_app_user_id())
with check (user_id = public.current_app_user_id());

create policy audit_events_select_admins on public.audit_events
for select using (
  care_team_id is not null
  and public.has_team_capability(care_team_id, 'audit.view')
);
