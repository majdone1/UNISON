-- RLS (enabled on every public table) decides row access; these grants only let the API roles
-- reach the tables. Newer Supabase projects no longer auto-grant table privileges. anon gets none.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
