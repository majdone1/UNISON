# UNISON Architecture

## Overview
UNISON is a multi-tenant work-management SaaS. One TypeScript monorepo serves web, mobile, and desktop clients against shared packages and a Supabase/PostgreSQL backend.

## System context
- **apps/web** — Next.js App Router UI + Route Handlers (primary API surface in demo mode)
- **apps/mobile** — Expo React Native client calling the same HTTP APIs
- **apps/desktop** — Tauri shell loading the web product + deep links
- **packages/** — shared types, validation, auth/RBAC, billing, security, database adapters, UI
- **supabase/** — SQL migrations, RLS, Edge Functions, seed (local/demo only)

## Tenancy hierarchy
`Platform → Organization → Workspace → Team → Board → Group → Item → Subitem`

Tenant boundary is **organization**. Every org-scoped row carries `org_id`. RLS is deny-by-default; policies require membership or platform staff.

## Runtime modes
1. **Demo mode (default without credentials):** in-process `DemoRepository` with seeded data. No secrets required.
2. **Supabase mode:** set `NEXT_PUBLIC_SUPABASE_URL`, anon key, and service role. Apply migrations. Wire `@unison/database` Supabase client (adapter hook points documented in DATABASE.md).

## Auth & sessions
- Production: Supabase Auth (email/OAuth). Passwords never stored in app tables.
- Demo: switchable seeded users, including platform `super_admin`.
- Support impersonation is auditable and never returns password material.

## API style
Next.js Route Handlers under `/api/*` validate with Zod (`@unison/validation`), authorize via `@unison/auth`, enforce entitlements via `@unison/billing`, and audit sensitive actions.

## Realtime / files
- Realtime: see `docs/REALTIME.md`. Channel helper `board:{boardId}`; demo poll/SSE via `/api/boards/:id/events` and `/stream`. Supabase Realtime live wiring BLOCKED_EXTERNAL.
- Files: Supabase Storage bucket `attachments` with org-scoped paths + signed URLs.

## i18n
Locales `en`, `ar`, `he` with RTL direction helpers in `@unison/shared/i18n` from day one.

## Design
Original UNISON visual identity (ocean ink + chartreuse). Not a Monday.com clone.
