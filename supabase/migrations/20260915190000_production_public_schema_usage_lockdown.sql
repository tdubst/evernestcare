-- Prevent arbitrary database roles from reaching public-schema functions through
-- PostgreSQL's default PUBLIC schema privilege. Supabase API roles retain access.

revoke usage on schema public from public;

grant usage on schema public to anon;
grant usage on schema public to authenticated;
grant usage on schema public to service_role;
