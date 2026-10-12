# Monday Capability Audit — UNISON

**Branch:** `cursor/unison-saas-foundation-14cc`  
**Tip audited:** `b159850` (+ Phase 3 commits after)  
**Brand:** UNISON · By Majd Asali  
**Rule:** Monday.com is a **capability benchmark only** — never copy proprietary UI, assets, or text.

Statuses: `✅ COMPLETE` · `🟡 PARTIAL` · `❌ MISSING` · `⭐ UNISON IMPROVEMENT`

Verification: **code-first** (demo repository is the working product surface; live Supabase is core-CRUD + SQL).

| # | Capability | Status | Evidence (code) | Notes |
|---|------------|--------|-----------------|-------|
| 1 | Work management core (orgs→items) | 🟡 | `demo-store.ts`, board APIs | Hierarchy + archive/trash/templates; favorites/recent/folders light |
| 2 | Professional spreadsheet grid | 🟡 | `board-grid.tsx` | Virtualized, resize, keyboard, clipboard; DnD cols/items PARTIAL |
| 3 | Typed column engine | 🟡 | `types` ColumnType (33), `column-values.ts` | Core editors strong; many types schema-only |
| 4 | Status & priority customization | 🟡 | label admin UI, `writeMinRole` | Per-board labels; multilingual labels thin |
| 5 | Formula engine | 🟡 | `packages/shared/src/formula.ts` | Safe deterministic; dependency graph depth limited |
| 6 | Time / work hours engine | 🟡 | SQL `time_entries`; no app UI/API yet | Schema ahead of product |
| 7 | Connected boards / relations | 🟡 | cross-board relation + candidates API | Mirrors/M:N depth thin |
| 8 | Views (table…chart) | 🟡 | `board-view.tsx`, workload/chart | Table deep; kanban/calendar/timeline light; no Gantt/map/cards/pivot |
| 9 | My Work | 🟡 | `/api/my-work`, `/app/my-work` | Buckets exist; filters/productivity polish PARTIAL |
| 10 | Global search | 🟡 | `/api/search` | Tenant + ACL aware; indexing-ready only |
| 11 | Dashboards & reporting | 🟡 | `/app/dashboard` | Org widgets; board dashboard view unused |
| 12 | Forms | 🟡 | `/f/[formId]`, honeypot, rate limits | Field mapping thin; not full builder |
| 13 | Communication center | ❌ | Item comments only | No DMs/channels/presence (Phase 3 target) |
| 14 | Unified notifications | 🟡 | in-app store + mock email/push/desktop | Real delivery BLOCKED_EXTERNAL |
| 15 | Roles & granular permissions | 🟡 | 6 org roles + platform; `authorize()` | Custom roles / message scopes Phase 3 |
| 16 | Files & documents | 🟡 | attachments mock + storage RLS SQL | Signed URL live apply external |
| 17 | Workdoc / collaborative docs | ❌ | — | Architecture track Phase 3 |
| 18 | Automations WHEN/IF/THEN | 🟡 | `automation-runner.ts` | Demo-rich; live runner unwired |
| 19 | Integrations Center | ❌ | webhook.http mock only | Slack-first registry Phase 3 |
| 20 | API / webhooks / extensions | 🟡 | REST routes + webhook log | Versioned API + Apps framework Phase 3 |
| 21 | Import / export | 🟡 | CSV board export/import | Excel/mapping UI MISSING |
| 22 | Mobile Android/iOS | 🟡 | `apps/mobile/App.tsx` | Field-work thin client; offline thin |
| 23 | Desktop Win/macOS | 🟡 | Tauri scaffold | Runtime shell stub; signing external |
| 24 | Auth & accounts | 🟡 | Demo session switch | Password/OAuth/MFA/SSO BLOCKED_EXTERNAL |
| 25 | Realtime sync | 🟡 | poll/SSE/helpers | Board UI not subscribed |
| 26 | i18n / RTL | 🟡 | en/ar/he + dir | Catalog shallow |
| 27 | AI-ready architecture | ❌ | — | Optional provider-neutral Phase 3 |
| 28 | Administration | 🟡 | org settings + platform page | Data retention / custom roles thin |
| 29 | Security (RLS/IDOR/rates) | 🟡 | migrations + security tests | Live RLS apply external |
| 30 | Audit log | 🟡 | `audit_logs` + platform audit API | Coverage of sensitive actions PARTIAL |
| 31 | Billing | 🟡 | plans + MockBillingProvider | Stripe BLOCKED_EXTERNAL |
| 32 | Design / UX | ⭐ | Manrope/Syne, ocean/chartreuse | Original UNISON — not Monday clone |
| 33 | Performance | 🟡 | grid virtualization | Large-tenant query discipline PARTIAL |
| 34 | Testing / CI | 🟡 | `ci:local` demo matrix | e2e not in CI; live DB job MISSING |
| 35 | Production providers | 🟡 | adapters + env names | Apply/configure = owner |

## UNISON improvements (⭐)

- Premium original visual system (not a Monday lookalike)
- Demo-safe full product path with strong tenant/RBAC negative tests
- Column `writeMinRole` + viewer / workspace_admin ranks
- Safe formula sandbox (no eval)
- Form abuse controls (honeypot + rate limits) early
- Dual-backend seam (`DEMO_MODE`) without discarding demo when live is incomplete
