-- Phase 3: custom roles, communication, integrations, workdocs, time financial cols, column types

-- ---------------------------------------------------------------------------
-- Widen board_columns.type check for Phase 3 column registry
-- ---------------------------------------------------------------------------
alter table public.board_columns drop constraint if exists board_columns_type_check;
alter table public.board_columns
  add constraint board_columns_type_check check (
    type in (
      'text','long_text','status','priority','people','team','date','time','datetime',
      'date_range','timeline','duration','number','currency','percentage','checkbox',
      'dropdown','link','email','phone','location','tags','files','rating','progress',
      'formula','dependency','relation','mirror','auto_number','created_at','updated_at',
      'created_by','updated_by','week','country','color','image','vote','button','time_tracking'
    )
  );

-- ---------------------------------------------------------------------------
-- Custom roles (overlay grants/denies on built-in base_role)
-- ---------------------------------------------------------------------------
create table if not exists public.custom_roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  base_role text not null check (base_role in ('owner','admin','workspace_admin','member','viewer','guest')),
  grants jsonb not null default '[]'::jsonb,
  denies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

alter table public.custom_roles enable row level security;

drop policy if exists custom_roles_select on public.custom_roles;
create policy custom_roles_select on public.custom_roles
  for select using (public.is_org_member(org_id));

drop policy if exists custom_roles_write on public.custom_roles;
create policy custom_roles_write on public.custom_roles
  for all using (public.has_org_role(org_id, 'admin'))
  with check (public.has_org_role(org_id, 'admin'));

-- ---------------------------------------------------------------------------
-- Communication center
-- ---------------------------------------------------------------------------
create table if not exists public.chat_channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('dm','group','team','workspace','board','project')),
  name text not null,
  topic text,
  team_id uuid references public.teams(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  board_id uuid references public.boards(id) on delete set null,
  member_ids uuid[] not null default '{}',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.chat_channels enable row level security;

drop policy if exists chat_channels_select on public.chat_channels;
create policy chat_channels_select on public.chat_channels
  for select using (
    public.is_org_member(org_id)
    and (auth.uid() = any (member_ids) or public.has_org_role(org_id, 'admin'))
  );

drop policy if exists chat_channels_write on public.chat_channels;
create policy chat_channels_write on public.chat_channels
  for all using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.chat_channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  mention_user_ids uuid[] not null default '{}',
  parent_message_id uuid references public.chat_messages(id) on delete set null,
  link_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.chat_messages enable row level security;

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select using (
    public.is_org_member(org_id)
    and exists (
      select 1 from public.chat_channels c
      where c.id = channel_id
        and (auth.uid() = any (c.member_ids) or public.has_org_role(org_id, 'admin'))
    )
  );

drop policy if exists chat_messages_write on public.chat_messages;
create policy chat_messages_write on public.chat_messages
  for all using (public.has_org_role(org_id, 'member') and author_id = auth.uid())
  with check (public.has_org_role(org_id, 'member') and author_id = auth.uid());

create index if not exists chat_messages_channel_idx on public.chat_messages(channel_id, created_at);

-- ---------------------------------------------------------------------------
-- Integrations (credential refs only — never raw secrets)
-- ---------------------------------------------------------------------------
create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  provider_id text not null,
  status text not null check (status in ('disconnected','connected_mock','error')),
  display_name text not null,
  credential_ref text,
  scopes jsonb not null default '[]'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, provider_id)
);

alter table public.integration_connections enable row level security;

drop policy if exists integration_connections_select on public.integration_connections;
create policy integration_connections_select on public.integration_connections
  for select using (public.is_org_member(org_id));

drop policy if exists integration_connections_write on public.integration_connections;
create policy integration_connections_write on public.integration_connections
  for all using (public.has_org_role(org_id, 'admin'))
  with check (public.has_org_role(org_id, 'admin'));

-- ---------------------------------------------------------------------------
-- Workdocs (incremental block document)
-- ---------------------------------------------------------------------------
create table if not exists public.workdocs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  board_id uuid references public.boards(id) on delete set null,
  item_id uuid references public.board_items(id) on delete set null,
  title text not null,
  body jsonb not null default '{"blocks":[]}'::jsonb,
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workdocs enable row level security;

drop policy if exists workdocs_select on public.workdocs;
create policy workdocs_select on public.workdocs
  for select using (public.is_org_member(org_id));

drop policy if exists workdocs_write on public.workdocs;
create policy workdocs_write on public.workdocs
  for all using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));

-- ---------------------------------------------------------------------------
-- API / extensions registry
-- ---------------------------------------------------------------------------
create table if not exists public.api_app_extensions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('view','widget','action','provider','field')),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.api_app_extensions enable row level security;

drop policy if exists api_app_extensions_select on public.api_app_extensions;
create policy api_app_extensions_select on public.api_app_extensions
  for select using (public.is_org_member(org_id));

drop policy if exists api_app_extensions_write on public.api_app_extensions;
create policy api_app_extensions_write on public.api_app_extensions
  for all using (public.has_org_role(org_id, 'admin'))
  with check (public.has_org_role(org_id, 'admin'));

-- ---------------------------------------------------------------------------
-- Time entries: kind + financial columns (additive)
-- ---------------------------------------------------------------------------
alter table public.time_entries
  add column if not exists kind text not null default 'work'
    check (kind in ('work','travel','break','overtime'));
alter table public.time_entries
  add column if not exists cost_cents int;
alter table public.time_entries
  add column if not exists billable_cents int;
