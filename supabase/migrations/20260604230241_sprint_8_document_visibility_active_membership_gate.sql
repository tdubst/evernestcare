-- Sprint 8 Security repair: explicit document grants must not authorize
-- visibility unless the caller still has an active team membership.

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
  active_membership as (
    select true as is_active
    from document_scope d
    where public.has_active_team_membership(d.care_team_id)
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
      where exists (select 1 from active_membership)
        and (
          (
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
        )
    ),
    false
  )
$$;

revoke all on function public.can_view_document(uuid) from public;
revoke all on function public.can_view_document(uuid) from anon;
revoke all on function public.can_view_document(uuid) from authenticated;
grant execute on function public.can_view_document(uuid) to authenticated;
