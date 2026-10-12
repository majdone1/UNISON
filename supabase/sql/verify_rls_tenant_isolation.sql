-- Run in Supabase SQL Editor on project unison-production ONLY.
-- Does not print secrets. Expect every check_name to return ok = true.

with checks as (
  select 'rls_enabled_core' as check_name,
    (
      select bool_and(c.relrowsecurity)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (
          'profiles','organizations','org_memberships','workspaces','teams',
          'boards','board_groups','board_columns','board_items','board_views',
          'comments','notifications','attachments','activity_events','audit_logs',
          'subscriptions','automations','board_forms','webhook_deliveries',
          'automation_runs','notification_preferences','time_entries'
        )
    ) as ok
  union all
  select 'helpers_exist',
    (
      select count(*) = 3
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('is_org_member','has_org_role','is_platform_staff')
    )
  union all
  select 'storage_buckets_private',
    (
      select count(*) = 2 and bool_and(not public)
      from storage.buckets
      where id in ('attachments','board-files')
    )
  union all
  select 'storage_policies_present',
    (
      select count(*) >= 4
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname like 'storage_attachments_%'
    )
  union all
  select 'auth_profile_trigger',
    (
      select exists (
        select 1 from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'auth' and c.relname = 'users' and t.tgname = 'on_auth_user_created'
      )
    )
)
select * from checks order by check_name;
