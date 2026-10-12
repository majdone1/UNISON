-- Additive: auth profile bootstrap, missing RLS policies, private Storage buckets.
-- Target project: unison-production ONLY. Safe on empty or already-migrated schemas.
-- No destructive resets.

-- ---------------------------------------------------------------------------
-- Auth → profiles bootstrap (locale en/ar/he)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_locale text;
begin
  chosen_locale := coalesce(new.raw_user_meta_data->>'locale', 'en');
  if chosen_locale not in ('en', 'ar', 'he') then
    chosen_locale := 'en';
  end if;

  insert into public.profiles (id, email, display_name, avatar_url, locale)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url',
    chosen_locale
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Missing table policies (RLS was enabled without policies = deny-all)
-- ---------------------------------------------------------------------------
drop policy if exists org_invitations_select on public.org_invitations;
create policy org_invitations_select on public.org_invitations
  for select using (
    public.has_org_role(org_id, 'workspace_admin')
    or public.is_platform_staff()
  );

drop policy if exists org_invitations_write on public.org_invitations;
create policy org_invitations_write on public.org_invitations
  for all using (
    public.has_org_role(org_id, 'workspace_admin')
    or public.is_platform_staff()
  )
  with check (
    public.has_org_role(org_id, 'workspace_admin')
    or public.is_platform_staff()
  );

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
  for select using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and public.is_org_member(t.org_id)
    )
  );

drop policy if exists team_members_write on public.team_members;
create policy team_members_write on public.team_members
  for all using (
    exists (
      select 1 from public.teams t
      where t.id = team_id and public.has_org_role(t.org_id, 'workspace_admin')
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id and public.has_org_role(t.org_id, 'workspace_admin')
    )
  );

-- Profiles: members can see teammates in shared orgs (needed for people columns / mentions)
drop policy if exists profiles_select_org_peers on public.profiles;
create policy profiles_select_org_peers on public.profiles
  for select using (
    id = auth.uid()
    or public.is_platform_staff()
    or exists (
      select 1
      from public.org_memberships me
      join public.org_memberships them
        on them.org_id = me.org_id
      where me.user_id = auth.uid()
        and them.user_id = profiles.id
    )
  );

-- ---------------------------------------------------------------------------
-- Private Storage buckets (not public). Paths: {org_id}/{kind}/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'attachments',
    'attachments',
    false,
    52428800,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'text/plain',
      'text/csv',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]
  ),
  (
    'board-files',
    'board-files',
    false,
    104857600,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Helper: first path segment is org uuid
create or replace function public.storage_org_id(object_name text)
returns uuid
language sql
stable
as $$
  select nullif(split_part(object_name, '/', 1), '')::uuid;
$$;

drop policy if exists storage_attachments_select on storage.objects;
create policy storage_attachments_select on storage.objects
  for select using (
    bucket_id in ('attachments', 'board-files')
    and public.is_org_member(public.storage_org_id(name))
  );

drop policy if exists storage_attachments_insert on storage.objects;
create policy storage_attachments_insert on storage.objects
  for insert with check (
    bucket_id in ('attachments', 'board-files')
    and public.has_org_role(public.storage_org_id(name), 'member')
  );

drop policy if exists storage_attachments_update on storage.objects;
create policy storage_attachments_update on storage.objects
  for update using (
    bucket_id in ('attachments', 'board-files')
    and public.has_org_role(public.storage_org_id(name), 'member')
  )
  with check (
    bucket_id in ('attachments', 'board-files')
    and public.has_org_role(public.storage_org_id(name), 'member')
  );

drop policy if exists storage_attachments_delete on storage.objects;
create policy storage_attachments_delete on storage.objects
  for delete using (
    bucket_id in ('attachments', 'board-files')
    and public.has_org_role(public.storage_org_id(name), 'member')
  );

-- ---------------------------------------------------------------------------
-- Optional time entries (hours) — additive; column-based hours remain valid
-- ---------------------------------------------------------------------------
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  board_id uuid references public.boards(id) on delete cascade,
  item_id uuid not null references public.board_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  minutes int not null check (minutes > 0),
  note text,
  worked_on date not null default (timezone('utc', now()))::date,
  created_at timestamptz not null default now()
);

alter table public.time_entries enable row level security;

drop policy if exists time_entries_select on public.time_entries;
create policy time_entries_select on public.time_entries
  for select using (public.is_org_member(org_id));

drop policy if exists time_entries_write on public.time_entries;
create policy time_entries_write on public.time_entries
  for all using (
    public.has_org_role(org_id, 'member')
    and (user_id = auth.uid() or public.has_org_role(org_id, 'admin'))
  )
  with check (
    public.has_org_role(org_id, 'member')
    and user_id = auth.uid()
  );

create index if not exists time_entries_org_idx on public.time_entries(org_id);
create index if not exists time_entries_item_idx on public.time_entries(item_id);
