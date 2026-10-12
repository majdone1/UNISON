-- Phase 2: board-connected forms (create item on submit)

create table if not exists public.board_forms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  description text,
  field_keys jsonb not null default '[]'::jsonb,
  visibility text not null default 'private'
    check (visibility in ('private', 'public')),
  enabled boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  submission_count integer not null default 0
);

alter table public.board_forms enable row level security;

create policy board_forms_select on public.board_forms
  for select using (
    public.is_org_member(org_id)
    or visibility = 'public'
  );

create policy board_forms_insert on public.board_forms
  for insert with check (
    public.has_org_role(org_id, 'admin')
    or public.is_platform_staff()
  );

create policy board_forms_update on public.board_forms
  for update using (
    public.has_org_role(org_id, 'admin')
    or public.is_platform_staff()
  );

create policy board_forms_delete on public.board_forms
  for delete using (
    public.has_org_role(org_id, 'admin')
    or public.is_platform_staff()
  );

create index if not exists board_forms_org_idx on public.board_forms(org_id);
create index if not exists board_forms_board_idx on public.board_forms(board_id);
