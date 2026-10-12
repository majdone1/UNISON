-- Phase 2 M6: workspace_admin role + webhook delivery log

alter table public.org_memberships drop constraint if exists org_memberships_role_check;
alter table public.org_memberships
  add constraint org_memberships_role_check
  check (role in ('owner','admin','workspace_admin','member','viewer','guest'));

alter table public.org_invitations drop constraint if exists org_invitations_role_check;
alter table public.org_invitations
  add constraint org_invitations_role_check
  check (role in ('admin','workspace_admin','member','viewer','guest'));

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
          when 'workspace_admin' then 4
          when 'admin' then 5
          when 'owner' then 6
          else 0
        end
      ) >= (
        case min_role
          when 'guest' then 1
          when 'viewer' then 2
          when 'member' then 3
          when 'workspace_admin' then 4
          when 'admin' then 5
          when 'owner' then 6
          else 99
        end
      )
  ) or public.is_platform_staff();
$$;

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  automation_id text not null,
  item_id uuid references public.board_items(id) on delete set null,
  url text not null,
  method text not null,
  status text not null,
  status_code int not null,
  detail text,
  request_body jsonb,
  created_at timestamptz not null default now()
);

alter table public.webhook_deliveries enable row level security;

create policy webhook_deliveries_select on public.webhook_deliveries
  for select using (public.is_org_member(org_id));

create index if not exists webhook_deliveries_org_idx on public.webhook_deliveries(org_id);
