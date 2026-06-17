-- Restrict app profile row reads to the authenticated user's own profile.
-- Shared team member display data should move through an explicit projection/RPC
-- before broader collaboration flows.

drop policy if exists users_select_self_or_shared_team on public.users;

create policy users_select_self on public.users
for select using (auth.uid() = auth_user_id);
