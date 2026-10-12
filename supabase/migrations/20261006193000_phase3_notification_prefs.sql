-- Phase 3 notification preference columns (additive)
alter table public.notification_preferences
  add column if not exists desktop boolean not null default true;
alter table public.notification_preferences
  add column if not exists digest_email boolean not null default false;
alter table public.notification_preferences
  add column if not exists mute_message boolean not null default false;
