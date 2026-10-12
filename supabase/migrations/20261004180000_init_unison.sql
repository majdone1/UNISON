-- UNISON initial schema + deny-by-default RLS
-- Apply with Supabase CLI or psql. Demo mode does not require this at runtime.

create extension if not exists "pgcrypto";

-- Helpers are created AFTER tables so SQL-language functions validate on Postgres 17+.

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  avatar_url text,
  locale text not null default 'en' check (locale in ('en','ar','he')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('super_admin','support','none')),
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active','suspended')),
  plan_id text not null default 'trial',
  seat_limit int not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','member','guest')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','member','guest')),
  token_hash text not null,
  invited_by uuid references public.profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (org_id, slug)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  visibility text not null default 'workspace' check (visibility in ('private','workspace','org')),
  template_key text,
  position int not null default 0,
  archived_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.board_groups (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text not null default '#1F6F6A',
  position int not null default 0,
  archived_at timestamptz
);

create table public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null,
  position int not null default 0,
  settings jsonb not null default '{}'::jsonb
);

create table public.board_items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  group_id uuid not null references public.board_groups(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  parent_item_id uuid references public.board_items(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'not_started',
  priority text not null default 'none',
  position int not null default 0,
  due_date timestamptz,
  progress numeric not null default 0,
  assignee_ids uuid[] not null default '{}',
  watcher_ids uuid[] not null default '{}',
  values jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.board_views (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null,
  config jsonb not null default '{}'::jsonb,
  position int not null default 0,
  is_default boolean not null default false
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.board_items(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  mention_user_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.board_items(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  item_id uuid references public.board_items(id) on delete cascade,
  actor_user_id uuid references public.profiles(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  impersonator_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id text not null,
  status text not null,
  seats int not null,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  grace_ends_at timestamptz,
  provider text not null default 'mock',
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  trigger jsonb not null,
  actions jsonb not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index boards_org_idx on public.boards(org_id);
create index items_org_idx on public.board_items(org_id);
create index items_board_idx on public.board_items(board_id);
create index notifications_user_idx on public.notifications(user_id);
create index audit_org_idx on public.audit_logs(org_id);

-- ---------------------------------------------------------------------------
-- Helpers (after tables — SQL functions reference platform_roles / org_memberships)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

create or replace function public.is_platform_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_roles pr
    where pr.user_id = auth.uid()
      and pr.role in ('super_admin', 'support')
  );
$$;

create or replace function public.is_org_member(target_org uuid)
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
  ) or public.is_platform_staff();
$$;

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
          when 'member' then 2
          when 'admin' then 3
          when 'owner' then 4
          else 0
        end
      ) >= (
        case min_role
          when 'guest' then 1
          when 'member' then 2
          when 'admin' then 3
          when 'owner' then 4
          else 99
        end
      )
  ) or public.is_platform_staff();
$$;

-- ---------------------------------------------------------------------------
-- RLS: deny by default, then allow org members / platform staff
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.platform_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_memberships enable row level security;
alter table public.org_invitations enable row level security;
alter table public.workspaces enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.boards enable row level security;
alter table public.board_groups enable row level security;
alter table public.board_columns enable row level security;
alter table public.board_items enable row level security;
alter table public.board_views enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.attachments enable row level security;
alter table public.activity_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.automations enable row level security;

-- Profiles
create policy profiles_select_self_or_staff on public.profiles
  for select using (id = auth.uid() or public.is_platform_staff());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());

-- Platform roles (staff only)
create policy platform_roles_staff on public.platform_roles
  for select using (public.is_platform_staff() or user_id = auth.uid());

-- Organizations
create policy orgs_select_member on public.organizations
  for select using (public.is_org_member(id));
create policy orgs_update_admin on public.organizations
  for update using (public.has_org_role(id, 'admin') or public.is_platform_staff());

-- Memberships
create policy memberships_select on public.org_memberships
  for select using (public.is_org_member(org_id));
create policy memberships_admin_write on public.org_memberships
  for all using (public.has_org_role(org_id, 'admin'))
  with check (public.has_org_role(org_id, 'admin'));

-- Generic org-scoped read/write policies
create policy workspaces_all on public.workspaces
  for all using (public.is_org_member(org_id))
  with check (public.has_org_role(org_id, 'member'));

create policy teams_all on public.teams
  for all using (public.is_org_member(org_id))
  with check (public.has_org_role(org_id, 'member'));

create policy boards_select on public.boards
  for select using (public.is_org_member(org_id));
create policy boards_write on public.boards
  for all using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));

create policy groups_all on public.board_groups
  for all using (public.is_org_member(org_id))
  with check (public.has_org_role(org_id, 'member'));

create policy columns_all on public.board_columns
  for all using (public.is_org_member(org_id))
  with check (public.has_org_role(org_id, 'member'));

create policy items_all on public.board_items
  for all using (public.is_org_member(org_id))
  with check (public.has_org_role(org_id, 'member'));

create policy views_all on public.board_views
  for all using (public.is_org_member(org_id))
  with check (public.has_org_role(org_id, 'member'));

create policy comments_all on public.comments
  for all using (public.is_org_member(org_id))
  with check (public.has_org_role(org_id, 'member'));

create policy notifications_own on public.notifications
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy attachments_all on public.attachments
  for all using (public.is_org_member(org_id))
  with check (public.has_org_role(org_id, 'member'));

create policy activity_select on public.activity_events
  for select using (public.is_org_member(org_id));

create policy audit_select on public.audit_logs
  for select using (
    public.is_platform_staff()
    or (org_id is not null and public.has_org_role(org_id, 'admin'))
  );

create policy subscriptions_select on public.subscriptions
  for select using (public.is_org_member(org_id) or public.is_platform_staff());

create policy automations_all on public.automations
  for all using (public.is_org_member(org_id))
  with check (public.has_org_role(org_id, 'admin'));

-- Storage bucket policies are configured in dashboard / follow-up migration.
-- Passwords are never stored in public tables (Supabase Auth owns credentials).
