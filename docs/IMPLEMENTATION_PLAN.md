# UNISON Implementation Plan

Companion to store docs:
- `/cursor/stores/.../docs/phase-2-plan.md`
- `/cursor/stores/.../docs/phase-2-gap-analysis.md`

## Principles

1. Extend working demo APIs — do not replace with mockups  
2. Server authz + tenant isolation on every write path  
3. Additive SQL migrations only  
4. Live providers stay adapter-mocked until Majd configures secrets  
5. Keep Origin PR #1 draft; never merge/mark ready unless asked  

## Completed

- **M1–M4** — see `docs/PROGRESS.md`

## Completed — M5 (H / A / C / M)

| Work | Deliverable |
|------|-------------|
| H | AND/OR `FilterBuilder` UI → `FilterGroup` DSL → `applyViewConfig` + save personal/shared views |
| A | `viewer` org role; `file:write`; column `settings.permissions.writeMinRole` server checks |
| C | Status/priority label admin UI; relation column linking same-board items |
| M | `/f/[formId]` landing; honeypot + submit cap; stricter form GET/POST rate limits |
| Tests | `phase2-m5` + auth viewer tests |
| SQL | `20261004250000_phase2_viewer_role.sql` |

## Active — M6 (H / C / A / J / CSV)

| Work | Deliverable |
|------|-------------|
| H | Workload + chart board views from authorized item data |
| C | Cross-board relation column (`relatedBoardId`) tenant-scoped candidates |
| A | `workspace_admin` rank; `workspace:manage`; invite role caps; UI wiring |
| J | `webhook.http` action + `MockHttpWebhookAdapter` + delivery log (no network) |
| CSV | Board CSV export/import helpers + API |
| Tests | `phase2-m6` + auth workspace_admin |
| SQL | `20261004260000_phase2_workspace_admin_webhooks.sql` |

## Next candidates (after M6)

- Dependency graph UX depth  
- Live webhook adapter (needs provider secrets)  
- Deeper analytics / dashboards  

## External gate (stop when only secrets remain)

| Need | Majd action | Where | After |
|------|-------------|-------|-------|
| Auth/DB/RLS/Realtime/Storage | Supabase project + env | `.env` / Vercel; apply migrations | Wire adapter |
| Billing | Stripe keys + webhook secret | server env | Live checkout |
| Email/Push | Provider keys | server env | Replace mocks |
| Signing | Apple/Google/Windows certs | release pipelines | Real builds |

## Verification

```bash
pnpm ci:local
```
