-- Phase 2: saved view visibility + automation run history + notification prefs

alter table public.board_views
  add column if not exists visibility text not null default 'shared'
    check (visibility in ('personal','shared')),
  add column if not exists owner_user_id uuid references public.profiles(id) on delete set null;

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  automation_id text not null,
  item_id uuid references public.board_items(id) on delete set null,
  trigger_type text not null,
  actions_fired jsonb not null default '[]'::jsonb,
  status text not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.automation_runs enable row level security;

create policy automation_runs_select on public.automation_runs
  for select using (public.is_org_member(org_id));

create table if not exists public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  in_app boolean not null default true,
  email boolean not null default true,
  push boolean not null default true,
  mute_assign boolean not null default false,
  mute_mention boolean not null default false,
  mute_automation boolean not null default false,
  primary key (user_id, org_id)
);

alter table public.notification_preferences enable row level security;

create policy notification_prefs_own on public.notification_preferences
  for all using (user_id = auth.uid() or public.is_platform_staff())
  with check (user_id = auth.uid() or public.is_platform_staff());

create index if not exists automation_runs_org_idx on public.automation_runs(org_id);
