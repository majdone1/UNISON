-- Additive security hardening for unison-production (advisor WARN remediations).
-- Fixes mutable search_path on helpers; tightens EXECUTE on SECURITY DEFINER RPCs.
-- Does not drop tables/data. Safe to re-run.

-- ---------------------------------------------------------------------------
-- search_path on non-definer helpers
-- ---------------------------------------------------------------------------
create or replace function public.current_user_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select auth.uid();
$$;

create or replace function public.storage_org_id(object_name text)
returns uuid
language sql
stable
set search_path = public
as $$
  select nullif(split_part(object_name, '/', 1), '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- EXECUTE grants: RLS helpers usable by authenticated; not by anon/public RPC
-- handle_new_user is trigger-only — revoke from API roles
-- ---------------------------------------------------------------------------
revoke all on function public.current_user_id() from public;
revoke all on function public.storage_org_id(text) from public;
revoke all on function public.is_platform_staff() from public;
revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text) from public;
revoke all on function public.handle_new_user() from public;

grant execute on function public.current_user_id() to authenticated;
grant execute on function public.storage_org_id(text) to authenticated;
grant execute on function public.is_platform_staff() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text) to authenticated;

revoke execute on function public.current_user_id() from anon;
revoke execute on function public.storage_org_id(text) from anon;
revoke execute on function public.is_platform_staff() from anon;
revoke execute on function public.is_org_member(uuid) from anon;
revoke execute on function public.has_org_role(uuid, text) from anon;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- Supabase may ship rls_auto_enable; revoke API execute if present
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable' and p.pronargs = 0
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public';
    execute 'revoke execute on function public.rls_auto_enable() from anon';
    execute 'revoke execute on function public.rls_auto_enable() from authenticated';
  end if;
end $$;
