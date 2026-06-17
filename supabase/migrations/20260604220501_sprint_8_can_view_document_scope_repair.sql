-- Sprint 8 repair: preserve baseline document visibility for non-placeholder rows.
--
-- The placeholder migration introduced value-safe vault placeholder visibility, but
-- can_view_document(uuid) is shared by document RLS and imaging source-document
-- visibility. Non-placeholder rows must keep the original restricted/document
-- grant semantics.

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
        (
          coalesce(d.is_vault_placeholder, false) <> true
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
            or public.has_resource_capability(
              d.care_team_id,
              'document',
              d.id,
              'document.view'
            )
          )
        )
        or (
          d.is_vault_placeholder = true
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
              'document',
              d.id,
              'document.view'
            )
            or public.has_resource_capability(
              d.care_team_id,
              'document',
              d.id,
              'document.manage'
            )
            or public.has_resource_capability(
              d.care_team_id,
              'care_recipient',
              d.care_recipient_id,
              'document.manage'
            )
          )
        )
      )
  )
$$;

revoke all on function public.can_view_document(uuid) from public;
revoke all on function public.can_view_document(uuid) from anon;
revoke all on function public.can_view_document(uuid) from authenticated;
grant execute on function public.can_view_document(uuid) to authenticated;
