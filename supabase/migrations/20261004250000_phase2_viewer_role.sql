-- Phase 2 M5: viewer org role (read-only between guest and member)

alter table public.org_memberships drop constraint if exists org_memberships_role_check;
alter table public.org_memberships
  add constraint org_memberships_role_check
  check (role in ('owner','admin','member','viewer','guest'));

alter table public.org_invitations drop constraint if exists org_invitations_role_check;
alter table public.org_invitations
  add constraint org_invitations_role_check
  check (role in ('admin','member','viewer','guest'));

create or replace function public.has_org_role(target_org uuid, min_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_memberships m
    where m.org_id = target_org
      and m.user_id = auth.uid()
      and (
        case m.role
          when 'guest' then 1
          when 'viewer' then 2
          when 'member' then 3
          when 'admin' then 4
          when 'owner' then 5
          else 0
        end
      ) >= (
        case min_role
          when 'guest' then 1
          when 'viewer' then 2
          when 'member' then 3
          when 'admin' then 4
          when 'owner' then 5
          else 99
        end
      )
  ) or public.is_platform_staff();
$$;
