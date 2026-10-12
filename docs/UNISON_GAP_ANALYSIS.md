# UNISON Gap Analysis — Phase 3

**Verified against code** on `cursor/unison-saas-foundation-14cc` (baseline tip `b159850`).  
Companion: `docs/MONDAY_CAPABILITY_AUDIT.md`, `docs/PHASE3_IMPLEMENTATION_PLAN.md`.

## Already strong (do not redo)

| Area | Why keep |
|------|----------|
| Monorepo + turbo/pnpm | Working |
| Demo RBAC (viewer, workspace_admin, column writeMinRole) | Tested |
| Board grid core + item detail + threads/reactions | Working |
| FilterBuilder + saved views + workload/chart | Working |
| Automations demo runner + webhook mock log | Working |
| Forms landing + rate limits | Working |
| Cross-tenant / security unit tests | Working |
| Migrations + RLS SQL (8 files) | Repo-complete |
| SupabaseRepository core CRUD + DEMO_MODE | Wired |
| Depot CI (demo matrix) | Connected |

## Highest-impact gaps (code-backed)

1. **Communication center missing** — only item comments; no DMs/channels/presence  
2. **Integrations Center missing** — only `webhook.http` mock  
3. **Custom roles / message+integration permission scopes** incomplete  
4. **Column registry** incomplete (many types schema-only; no currency/%/vote/button/time-tracking column UX)  
5. **`time_entries` unused** by app despite SQL  
6. **Non-table views** shallow (calendar list, timeline bars, kanban no DnD)  
7. **Realtime helpers unwired** in board UI  
8. **DemoRepository cast** on ~50 routes — live mode breaks extras  
9. **Mobile thin / desktop stub**  
10. **Workdocs / AI / Apps framework** missing  
11. **Provider live apply** (Supabase/Stripe/email/push/OAuth/signing) — owner  
12. **`ci:audit` tinypool** critical via vitest (fix in Phase 3 deps)

## Gap → milestone map

| Gap | Milestone |
|-----|-----------|
| Audit docs + architecture notes | P3-M1 |
| Roles/teams/granular perms + custom role model | P3-M2 |
| Column registry + formulas + time engine | P3-M3 |
| Grid productivity + connected boards + advanced views | P3-M4 |
| Communication center | P3-M5 |
| Unified notifications | P3-M6 |
| Files + Workdocs architecture | P3-M7 |
| Automation expansion | P3-M8 |
| Integrations Center + Slack adapter | P3-M9 |
| Remaining integration adapters | P3-M10 |
| Dashboards/forms/search/My Work/reporting | P3-M11 |
| Mobile UX + offline/realtime | P3-M12 |
| Desktop hardening | P3-M13 |
| API/webhooks/extensions | P3-M14 |
| Security/perf/admin/billing harden | P3-M15 |
| Production provider readiness docs | P3-M16 |

## External blocks (continue other work)

| Block | Owner action | Env names (no values) |
|-------|--------------|------------------------|
| Live DB/Auth/Storage | Apply migrations to **unison-production**; set host secrets | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_MODE` |
| Stripe | Dashboard + webhook endpoint | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `BILLING_PROVIDER` |
| Email | Provider project | `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` |
| Push | FCM/APNs | `PUSH_PROVIDER`, `PUSH_SERVER_KEY` / platform certs |
| OAuth | Google/Microsoft/Apple apps | `*_OAUTH_CLIENT_ID`, `*_OAUTH_CLIENT_SECRET` |
| Signing | Apple/Google/Windows | release pipeline secrets (names in `docs/MOBILE_RELEASE.md` / `DESKTOP_RELEASE.md`) |

## Order adjustments

Default P3-M1…M16 retained. **P3-M15 tinypool override** pulled forward with M1 deps touch so `ci:local` can go green early.
