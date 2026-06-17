# Hydrate Permission Context Negative Fixtures

These fixtures cover negative advisory-permission semantics for `public.hydrate_permission_context()`.
Use only newly created synthetic auth users. Do not reuse approved baseline Test User A/B.

Do not report synthetic email addresses, tokens, passwords, care labels, payloads, or raw SQL errors in QA evidence.
Report aliases, status codes, capability-key presence/absence, and whether returned IDs were null for fail-closed cases.

## Fixture Aliases

Create six new synthetic Supabase Auth users in the synthetic QA project. Record their `auth.users.id`
values privately and substitute them in the setup SQL below.

- `QA_NEG_REVOKED`: revoked membership fail-closed
- `QA_NEG_LEFT`: left membership fail-closed
- `QA_NEG_MULTI`: multiple active memberships fail-closed
- `QA_NEG_DENY`: explicit deny overrides role allow
- `QA_NEG_EXPIRED_GRANT`: expired allow grant is ignored
- `QA_NEG_REVOKED_GRANT`: revoked allow grant is ignored

## Setup SQL

Run this from a privileged SQL channel against the synthetic QA project after replacing every
`00000000-0000-0000-0000-00000000000X` placeholder with the corresponding synthetic auth user UUID.

```sql
begin;

create temp table qa_permission_fixture_auth (
  alias text primary key,
  auth_user_id uuid not null
) on commit drop;

insert into qa_permission_fixture_auth(alias, auth_user_id)
values
  ('QA_NEG_REVOKED', '00000000-0000-0000-0000-000000000001'),
  ('QA_NEG_LEFT', '00000000-0000-0000-0000-000000000002'),
  ('QA_NEG_MULTI', '00000000-0000-0000-0000-000000000003'),
  ('QA_NEG_DENY', '00000000-0000-0000-0000-000000000004'),
  ('QA_NEG_EXPIRED_GRANT', '00000000-0000-0000-0000-000000000005'),
  ('QA_NEG_REVOKED_GRANT', '00000000-0000-0000-0000-000000000006');

do $$
begin
  if exists (
    select 1
    from public.users u
    join qa_permission_fixture_auth f on f.auth_user_id = u.auth_user_id
    where exists (
      select 1 from public.care_team_members ctm where ctm.user_id = u.id
    )
    or exists (
      select 1 from public.care_recipients cr where cr.created_by = u.id
    )
    or exists (
      select 1 from public.care_teams ct where ct.created_by = u.id
    )
  ) then
    raise exception 'Use newly created synthetic auth users only. One or more supplied auth users already has app data.';
  end if;
end $$;

insert into public.users(auth_user_id, email, display_name, status)
select
  auth_user_id,
  lower(alias) || '@synthetic.invalid',
  null,
  'active'
from qa_permission_fixture_auth
on conflict (auth_user_id) do update
set
  deleted_at = null,
  display_name = null,
  email = excluded.email,
  status = 'active',
  updated_at = now();

do $$
declare
  v_alias text;
  v_app_user_id uuid;
  v_recipient_id uuid;
  v_role_id uuid;
  v_second_recipient_id uuid;
  v_second_team_id uuid;
  v_team_id uuid;
begin
  for v_alias in
    select alias from qa_permission_fixture_auth order by alias
  loop
    select u.id into v_app_user_id
    from public.users u
    join qa_permission_fixture_auth f on f.auth_user_id = u.auth_user_id
    where f.alias = v_alias;

    insert into public.care_recipients(
      created_by,
      display_name,
      onboarding_state,
      relationship_context,
      status
    )
    values (
      v_app_user_id,
      'Synthetic permission fixture',
      jsonb_build_object('source', 'qa_permission_negative_fixture', 'alias', v_alias),
      'Synthetic QA fixture',
      'active'
    )
    returning id into v_recipient_id;

    insert into public.care_teams(
      care_recipient_id,
      created_by,
      name,
      status
    )
    values (
      v_recipient_id,
      v_app_user_id,
      'Synthetic permission fixture team',
      'active'
    )
    returning id into v_team_id;

    update public.care_recipients
    set primary_care_team_id = v_team_id
    where id = v_recipient_id;

    select id into v_role_id
    from public.roles
    where role_key = case
      when v_alias in ('QA_NEG_EXPIRED_GRANT', 'QA_NEG_REVOKED_GRANT') then 'viewer'
      else 'owner'
    end;

    insert into public.care_team_members(
      care_team_id,
      invited_by,
      joined_at,
      revoked_at,
      role_id,
      status,
      user_id
    )
    values (
      v_team_id,
      v_app_user_id,
      case when v_alias = 'QA_NEG_REVOKED' then null else now() end,
      case when v_alias = 'QA_NEG_REVOKED' then now() else null end,
      v_role_id,
      case
        when v_alias = 'QA_NEG_REVOKED' then 'revoked'
        when v_alias = 'QA_NEG_LEFT' then 'left'
        else 'active'
      end,
      v_app_user_id
    );

    if v_alias = 'QA_NEG_MULTI' then
      insert into public.care_recipients(
        created_by,
        display_name,
        onboarding_state,
        relationship_context,
        status
      )
      values (
        v_app_user_id,
        'Synthetic permission fixture',
        jsonb_build_object('source', 'qa_permission_negative_fixture', 'alias', v_alias, 'ordinal', 2),
        'Synthetic QA fixture',
        'active'
      )
      returning id into v_second_recipient_id;

      insert into public.care_teams(
        care_recipient_id,
        created_by,
        name,
        status
      )
      values (
        v_second_recipient_id,
        v_app_user_id,
        'Synthetic permission fixture team',
        'active'
      )
      returning id into v_second_team_id;

      update public.care_recipients
      set primary_care_team_id = v_second_team_id
      where id = v_second_recipient_id;

      insert into public.care_team_members(
        care_team_id,
        invited_by,
        joined_at,
        role_id,
        status,
        user_id
      )
      values (
        v_second_team_id,
        v_app_user_id,
        now(),
        v_role_id,
        'active',
        v_app_user_id
      );
    end if;

    if v_alias = 'QA_NEG_DENY' then
      insert into public.permission_grants(
        capability,
        care_recipient_id,
        care_team_id,
        created_by,
        effect,
        reason,
        resource_id,
        resource_type,
        subject_user_id
      )
      values (
        'medication.log',
        v_recipient_id,
        v_team_id,
        v_app_user_id,
        'deny',
        'synthetic-negative-permission-fixture',
        v_recipient_id,
        'care_recipient',
        v_app_user_id
      );
    elsif v_alias = 'QA_NEG_EXPIRED_GRANT' then
      insert into public.permission_grants(
        capability,
        care_recipient_id,
        care_team_id,
        created_by,
        effect,
        expires_at,
        reason,
        resource_id,
        resource_type,
        starts_at,
        subject_user_id
      )
      values (
        'vitals.log',
        v_recipient_id,
        v_team_id,
        v_app_user_id,
        'allow',
        now() - interval '1 hour',
        'synthetic-negative-permission-fixture',
        v_recipient_id,
        'care_recipient',
        now() - interval '2 hours',
        v_app_user_id
      );
    elsif v_alias = 'QA_NEG_REVOKED_GRANT' then
      insert into public.permission_grants(
        capability,
        care_recipient_id,
        care_team_id,
        created_by,
        effect,
        reason,
        resource_id,
        resource_type,
        revoked_at,
        revoked_by,
        subject_user_id
      )
      values (
        'vitals.log',
        v_recipient_id,
        v_team_id,
        v_app_user_id,
        'allow',
        'synthetic-negative-permission-fixture',
        v_recipient_id,
        'care_recipient',
        now(),
        v_app_user_id,
        v_app_user_id
      );
    end if;
  end loop;
end $$;

commit;
```

## QA RPC Checks

Sign in as each synthetic fixture user and call:

```http
POST /rest/v1/rpc/hydrate_permission_context
Content-Type: application/json

{}
```

Expected results:

| Alias | Expected status | Expected metadata behavior | Capability assertion |
| --- | --- | --- | --- |
| `QA_NEG_REVOKED` | `boundary_unavailable` | all IDs/role/membership/version null; `advisory_capabilities = []` | none |
| `QA_NEG_LEFT` | `boundary_unavailable` | all IDs/role/membership/version null; `advisory_capabilities = []` | none |
| `QA_NEG_MULTI` | `multiple_active_memberships` | all IDs/role/membership/version null; `advisory_capabilities = []` | none |
| `QA_NEG_DENY` | `ready` | metadata IDs present; no user rows or labels returned | `medication.log` absent |
| `QA_NEG_EXPIRED_GRANT` | `ready` | metadata IDs present; no user rows or labels returned | `vitals.log` absent |
| `QA_NEG_REVOKED_GRANT` | `ready` | metadata IDs present; no user rows or labels returned | `vitals.log` absent |

For all cases, confirm response includes no email, display name, care label, raw grant reason, invitation details,
payload, note text, document/message metadata, token, secret, or raw SQL error.

## Audit-Safe Cleanup SQL

Run after QA captures evidence. Replace the auth UUID placeholders with the same synthetic auth user UUIDs.

This cleanup intentionally retires fixture rows instead of physically deleting them. Do not disable audit
triggers and do not update/delete `audit_events`. The retired rows remain useful for audit continuity and are
kept inert by revoked memberships, revoked grants, archived care boundaries, and disabled/banned Auth users.

```sql
begin;

create temp table qa_permission_fixture_auth (
  alias text primary key,
  auth_user_id uuid not null
) on commit drop;

insert into qa_permission_fixture_auth(alias, auth_user_id)
values
  ('QA_NEG_REVOKED', '00000000-0000-0000-0000-000000000001'),
  ('QA_NEG_LEFT', '00000000-0000-0000-0000-000000000002'),
  ('QA_NEG_MULTI', '00000000-0000-0000-0000-000000000003'),
  ('QA_NEG_DENY', '00000000-0000-0000-0000-000000000004'),
  ('QA_NEG_EXPIRED_GRANT', '00000000-0000-0000-0000-000000000005'),
  ('QA_NEG_REVOKED_GRANT', '00000000-0000-0000-0000-000000000006');

with fixture_users as (
  select u.id
  from public.users u
  join qa_permission_fixture_auth f on f.auth_user_id = u.auth_user_id
)
update public.permission_grants pg
set
  revoked_at = coalesce(pg.revoked_at, now()),
  revoked_by = coalesce(pg.revoked_by, pg.created_by),
  updated_at = now()
where (
    pg.created_by in (select id from fixture_users)
    or pg.subject_user_id in (select id from fixture_users)
    or pg.revoked_by in (select id from fixture_users)
  )
  and pg.revoked_at is null;

with fixture_users as (
  select u.id
  from public.users u
  join qa_permission_fixture_auth f on f.auth_user_id = u.auth_user_id
)
update public.care_team_members ctm
set
  revoked_at = coalesce(ctm.revoked_at, now()),
  revoked_by = coalesce(ctm.revoked_by, ctm.user_id),
  status = case when ctm.status = 'left' then 'left' else 'revoked' end,
  updated_at = now()
where (
    ctm.user_id in (select id from fixture_users)
    or ctm.invited_by in (select id from fixture_users)
    or ctm.revoked_by in (select id from fixture_users)
  )
  and ctm.status = 'active';

with fixture_users as (
  select u.id
  from public.users u
  join qa_permission_fixture_auth f on f.auth_user_id = u.auth_user_id
)
update public.care_recipients cr
set
  archived_at = coalesce(cr.archived_at, now()),
  archived_by = coalesce(cr.archived_by, cr.created_by),
  status = case when cr.status = 'deleted' then 'deleted' else 'archived' end,
  updated_at = now()
where cr.created_by in (select id from fixture_users)
  and cr.status not in ('archived', 'deleted');

with fixture_users as (
  select u.id
  from public.users u
  join qa_permission_fixture_auth f on f.auth_user_id = u.auth_user_id
)
update public.care_teams ct
set
  archived_at = coalesce(ct.archived_at, now()),
  archived_by = coalesce(ct.archived_by, ct.created_by),
  status = case when ct.status = 'dissolved' then 'dissolved' else 'archived' end,
  updated_at = now()
where ct.created_by in (select id from fixture_users)
  and ct.status not in ('archived', 'dissolved');

with fixture_users as (
  select u.id
  from public.users u
  join qa_permission_fixture_auth f on f.auth_user_id = u.auth_user_id
)
update public.users u
set
  avatar_url = null,
  deleted_at = coalesce(u.deleted_at, now()),
  display_name = null,
  status = 'deleted',
  updated_at = now()
from qa_permission_fixture_auth f
where u.auth_user_id = f.auth_user_id;

commit;
```

Disable or ban the matching synthetic Auth users through the Supabase Auth admin surface after this SQL runs.
Do not delete or mutate `audit_events`. Synthetic audit rows created by setup and retirement remain by design.
Do not physically delete fixture users, teams, or recipients unless a future migration creates an approved
test-fixture lifecycle that preserves audit references without trigger bypass.
