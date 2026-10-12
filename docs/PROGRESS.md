# UNISON Progress

**Branch:** `cursor/unison-saas-foundation-14cc`  
**Brand:** UNISON · By Majd Asali  
**Mode:** Demo default (`DEMO_MODE=true`).

Statuses: `DONE` | `PARTIAL` | `BLOCKED_EXTERNAL` | `NOT_STARTED` | `LANDED`

## Current tip

Origin PR #1 **draft**. Do not merge / mark ready unless asked. Tip includes production-deploy readiness (`apps/web/vercel.json`, `/auth/callback`, `docs/DEPLOYMENT.md`).  
Supabase MCP applied all migrations to **unison-production** (`dskjtdqtkfifqdydnnvf`); RLS verify SQL all `ok`. Web build + CI/local stay on `DEMO_MODE=true`.

## Phase 2

M1–M6.1 + S1 **LANDED** (prior).

## Phase 3 milestone log

| Milestone | Scope | Status | Evidence |
|-----------|-------|--------|----------|
| **P3-M1** | Audit docs | **LANDED** | capability/gap/plan docs |
| **P3-M2** | Roles / permissions | **LANDED** | auth catalog + custom roles UI |
| **P3-M3** | Column registry + time | **LANDED** | registry + time API |
| **P3-M4** | Advanced views + realtime | **LANDED** | calendar month, kanban DnD, gantt/pivot/map, revision poll |
| **P3-M5** | Messages | **LANDED** | channels/DMs |
| **P3-M6** | Notifications | **PARTIAL** | desktop/digest/muteMessage prefs; email/push mock |
| **P3-M7** | Files / Workdocs | **PARTIAL** | Workdocs + mock signed URLs |
| **P3-M8** | Automations | **LANDED** | `notify.channel` + `integration.slack` mock |
| **P3-M9** | Integrations + Slack | **LANDED** | Integrations Center |
| **P3-M10** | Other adapters | **LANDED** | mock registry |
| **P3-M11** | Dashboards/forms/My Work | **PARTIAL** | dashboard widgets + time/docs/channels |
| **P3-M12** | Mobile offline | **PARTIAL** | offline queue + sync UI |
| **P3-M13** | Desktop | **PARTIAL** | shell notes; Builder external |
| **P3-M14** | API/extensions | **PARTIAL** | `/api/v1/meta` + `/api/v1/extensions` |
| **P3-M15** | Security harden | **PARTIAL** | tinypool + RBAC tests; remote EXECUTE/search_path harden |
| **P3-M16** | Provider readiness | **LANDED** | `PRODUCTION_PROVIDERS.md` |
| **P3-M17** | Supabase production schema | **LANDED** | migrations + RLS verify on **unison-production** |
| **P3-M18** | Production web deploy readiness | **LANDED** | Vercel+Origin path documented; `apps/web/vercel.json`; `/auth/callback`; build green |

## Completed vs remaining (Supabase)

| Done | Remaining (Majd — Dashboard / host secrets) |
|------|-----------------------------------------------|
| Migrations + private storage buckets on **unison-production** | Auth → Providers → enable **Email**; Site URL + redirect = `{NEXT_PUBLIC_APP_URL}/auth/callback` |
| RLS verify SQL all `ok` | Set **Vercel** host env **names**: `DEMO_MODE=false`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, then `NEXT_PUBLIC_APP_URL` (values outside chat) |
| Adapter seam + `DEMO_MODE` default for CI/local | Stripe / email / push / OAuth / Slack / signing still mock until separately configured |
| Deploy docs + Vercel monorepo config + Auth callback route | **Owner:** Origin repo **Apps → Vercel** → Root Directory `apps/web` → Production Branch `cursor/unison-saas-foundation-14cc` → Deploy (exact path: `docs/DEPLOYMENT.md`) |

## Blocked external (Majd)

1. **Next for production URL:** connect Vercel to `majd-asali/unison` and Deploy (see `docs/DEPLOYMENT.md`) — do **not** merge PR #1  
2. Auth Email + Site URL on unison-production; host env values in Vercel secrets UI (never chat)  
3. Stripe/email/push/OAuth/Slack live/signing — env **names** only in `docs/PRODUCTION_PROVIDERS.md`

## Working rules

- `pnpm ci:local` after meaningful changes  
- Keep PR #1 draft; never merge to main unless asked  
- Never ask for secrets in chat  
