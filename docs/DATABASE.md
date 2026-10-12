# Database

## Engine
PostgreSQL via Supabase. Schema lives in `supabase/migrations/`.

**Production target project name:** `unison-production` only (`dskjtdqtkfifqdydnnvf`, `eu-west-1`). Do not apply migrations to any other Supabase project.

**Remote schema (2026-10-06):** All `supabase/migrations/*` applied via Supabase MCP `apply_migration` (additive DDL). `supabase/sql/verify_rls_tenant_isolation.sql` returned all `ok = true`. Local/CI still use `DEMO_MODE=true`.

## Core tables
profiles, platform_roles, organizations, org_memberships, org_invitations, workspaces, teams, team_members, boards, board_groups, board_columns, board_items, board_views, comments, notifications, attachments, activity_events, audit_logs, subscriptions, automations, board_forms, webhook_deliveries, automation_runs, notification_preferences, time_entries.

## RLS
Enabled on all tenant tables. Deny-by-default. Helpers:
- `is_org_member(org_id)`
- `has_org_role(org_id, min_role)` — includes `viewer` + `workspace_admin`
- `is_platform_staff()`

Storage buckets `attachments` and `board-files` are **private** (org-prefixed paths + RLS).

## Adapter (demo → production seam)

Route Handlers call `getServerRepo()` / `getRepository()` from `@unison/database`.

| Mode | When | Implementation |
|------|------|----------------|
| **demo** | `DEMO_MODE=true` (default) or missing Supabase URL/anon key | `DemoRepository` in-memory seed |
| **supabase** | `DEMO_MODE=false` + URL + anon key | `SupabaseRepository` → PostgREST + RLS |

### Hook points (`ADAPTER_HOOKS`)
1. `getSession` → `auth.getUser()` + `org_memberships` + `platform_roles`
2. Boards/items CRUD → tables with `org_id`, RLS enforced
3. Comments / notifications → respective tables
4. Attachments → Storage bucket `attachments`, path `{orgId}/{kind}/…`
5. Realtime → `board:{boardId}` postgres_changes
6. Billing webhooks → service-role updates (never expose service key to clients)

Local/CI keep `DEMO_MODE=true`. Never commit secrets.

## Local demo
`pnpm db:seed` resets the in-memory store. **Never use demo seed in production.**

## Apply migrations

Target **unison-production** only. **Baseline schema is already applied** on that project (MCP, 2026-10-06). For future additive files:

### Option A — Supabase CLI (linked project)
```bash
# From repo root, with CLI logged in and linked to unison-production
supabase link --project-ref dskjtdqtkfifqdydnnvf
supabase db push
```

### Option B — SQL Editor
1. Open Supabase Dashboard → project **unison-production** → SQL Editor  
2. Run only **new** files in `supabase/migrations/` not yet in Dashboard → Database → Migrations  
3. Re-run `supabase/sql/verify_rls_tenant_isolation.sql` and confirm every `ok` is `true`

### Env for live mode (local / Vercel — never paste values into chat)
```
DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=   # from Dashboard / MCP get_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # from Dashboard / MCP get_publishable_keys (anon or publishable)
SUPABASE_SERVICE_ROLE_KEY=   # server only — never in client bundles
```

### Owner Auth click-path (required before live login)
Dashboard → **unison-production** → **Authentication** → **Providers** → enable **Email**.  
Redirect / Site URL = `NEXT_PUBLIC_APP_URL` + `/auth/callback`.

## Verify RLS
```bash
pnpm ci:db   # static migration checks (no live project)
# Live: run supabase/sql/verify_rls_tenant_isolation.sql in SQL Editor
```
