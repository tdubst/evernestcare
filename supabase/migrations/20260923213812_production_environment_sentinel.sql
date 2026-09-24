-- Managed Supabase projects do not permit persistent arbitrary database GUCs.
-- Store the operator-controlled environment sentinel in a locked private table.

create schema if not exists private;

create table if not exists private.environment_sentinel (
  singleton boolean primary key default true check (singleton),
  environment text not null check (environment in ('staging', 'production')),
  configured_at timestamptz not null default now()
);

revoke all on table private.environment_sentinel from public;
revoke all on table private.environment_sentinel from anon;
revoke all on table private.environment_sentinel from authenticated;
revoke all on table private.environment_sentinel from service_role;

create or replace function private.environment_is_staging()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select coalesce((
    select sentinel.environment = 'staging'
    from private.environment_sentinel sentinel
    where sentinel.singleton
  ), false)
$function$;

revoke all on function private.environment_is_staging() from public;
revoke all on function private.environment_is_staging() from anon;
revoke all on function private.environment_is_staging() from authenticated;
revoke all on function private.environment_is_staging() from service_role;
revoke all on function private.environment_is_staging() from evernest_account_closure_operator;

do $environment_guard_repair$
declare
  target_function regprocedure;
  function_definition text;
  repaired_definition text;
  replacement_count integer;
  old_guard constant text :=
    'pg_catalog.current_setting(''app.environment'', true) is distinct from ''staging''';
  new_guard constant text := 'not private.environment_is_staging()';
begin
  foreach target_function in array array[
    'private.close_synthetic_staging_account(uuid,uuid,text)'::regprocedure,
    'private.verify_synthetic_staging_account_closure(uuid,uuid,text)'::regprocedure
  ]
  loop
    function_definition := pg_catalog.pg_get_functiondef(target_function);
    replacement_count := (
      pg_catalog.length(function_definition)
      - pg_catalog.length(pg_catalog.replace(function_definition, old_guard, ''))
    ) / pg_catalog.length(old_guard);

    if replacement_count <> 1 then
      raise exception using
        errcode = 'P0001',
        message = pg_catalog.format(
          'expected one managed-incompatible environment guard in %s, found %s',
          target_function,
          replacement_count
        );
    end if;

    repaired_definition := pg_catalog.replace(function_definition, old_guard, new_guard);
    execute repaired_definition;
  end loop;
end
$environment_guard_repair$;
