# IMPLEMENTATION_STATUS

Statuses: `DONE` | `PARTIAL` | `BLOCKED_EXTERNAL` | `NOT_STARTED`  
Rule: never mark `DONE` without working verification.

| Area | Status | Evidence / notes |
|------|--------|------------------|
| Monorepo tooling | DONE | pnpm/turbo scripts |
| **CI (PR + main)** | PARTIAL | Depot connected; keep draft |
| Docs | DONE | PROGRESS + IMPLEMENTATION_PLAN + PHASE2 |
| Design system | PARTIAL | Brand footer `UNISON · By Majd Asali` |
| DB schema + RLS SQL | DONE | + viewer role migration |
| Live Supabase RLS | PARTIAL | SQL ready; apply on **unison-production** (Majd) — Cloud Agent has no Supabase MCP |
| Supabase adapter | PARTIAL | `SupabaseRepository` + `getServerRepo`; DEMO_MODE default |
| Auth (demo) | PARTIAL | **viewer** + structure/write/file gates |
| Boards / items | PARTIAL | Archive/restore + trash UI |
| **Dynamic columns (C)** | PARTIAL | Label admin + relation column |
| **Spreadsheet grid (D)** | PARTIAL | M4 depth + read-only for viewers |
| **Item detail (E)** | PARTIAL | Tabbed panel |
| **Updates/files (F)** | PARTIAL | Threads + reactions; file:write |
| Formula / views / notifs / automations | PARTIAL | M2 |
| **Filters (H)** | PARTIAL | AND/OR builder + saved views |
| My Work / search / mobile / billing | PARTIAL | M3 |
| **Forms (M)** | PARTIAL | Landing `/f/[id]` + abuse limits |
| Hardening | PARTIAL | form rate limits tightened |
| Cross-tenant tests | DONE | |
| Unit / ci:local | DONE | Phase 3 suite + tinypool override |
| Playwright e2e | PARTIAL | prior smoke |
| Stripe / email / signing | BLOCKED_EXTERNAL | |
| Communication center | PARTIAL | Channels/DMs demo |
| Integrations Center | PARTIAL | Mock OAuth registry |
| Custom roles | PARTIAL | Overlay grants/denies |
| Time engine | PARTIAL | API + financial redaction |
| Workdocs | PARTIAL | Block docs demo |
| Column registry | PARTIAL | Phase 3 types registered |

## Verification log

| Check | Result | When |
|-------|--------|------|
| Phase 2 M1–M6 + S1 | pass | 2026-10-04 |
| Phase 3 P3-M1…M16 slice `pnpm ci:local` | pass | 2026-10-06 |

## Manual actions (Majd)

1. ~~Connect Depot/Buildkite~~ **done**  
2. Sync tip onto `majd-asali/unison` if agent push 403  
3. Apply `supabase/migrations/*` to **unison-production**; run `supabase/sql/verify_rls_tenant_isolation.sql`; set env (`DEMO_MODE=false` + URL/keys) in host secrets  
4. Stripe / email credentials when enabling those providers  
