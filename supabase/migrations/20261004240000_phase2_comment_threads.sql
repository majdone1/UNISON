-- Phase 2 M4: comment reply threads + reactions

alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade,
  add column if not exists reactions jsonb not null default '{}'::jsonb;

create index if not exists comments_parent_idx on public.comments(parent_comment_id);
create index if not exists comments_item_idx on public.comments(item_id);
