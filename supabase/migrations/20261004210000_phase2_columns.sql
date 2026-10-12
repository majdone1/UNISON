-- Phase 2: dynamic column metadata (additive; safe on existing init schema)

alter table public.board_columns
  add column if not exists width int not null default 140,
  add column if not exists is_hidden boolean not null default false;

-- Widen allowed column types for dynamic boards (settings jsonb holds labels/formula)
alter table public.board_columns drop constraint if exists board_columns_type_check;
alter table public.board_columns
  add constraint board_columns_type_check check (
    type in (
      'text','long_text','status','priority','people','team','date','time','datetime',
      'date_range','timeline','duration','number','checkbox','dropdown','link','email',
      'phone','location','tags','files','rating','progress','formula','dependency',
      'relation','mirror','auto_number','created_at','updated_at','created_by','updated_by'
    )
  );

create index if not exists board_columns_board_idx on public.board_columns(board_id);
