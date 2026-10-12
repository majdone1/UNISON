# Phase 2 progress

Store docs:
- Gap analysis / plan in Project store `docs/phase-2-*.md`

## M1 (landed) — A–D
Structure authz · boards · dynamic columns · spreadsheet grid

## M2 (landed) — E–J
| Slice | Notes |
|-------|--------|
| **E** | `ItemDetailPanel` tabs: Overview / Columns / Updates / Files / Subitems / Activity |
| **F** | Updates (comments+mentions), mock file upload/download/delete + validation, activity |
| **G** | Safe formula engine (`IF`, arithmetic, `{Field}`, `DURATION_HOURS`); auto-recalc; duration sample cols |
| **H** | Filter DSL + personal/shared saved views API/UI |
| **I** | Notification preferences (mute automation/mentions, channel toggles) |
| **J** | WHEN/IF/THEN builder, conditions, execution history, loop depth guard, recipes |

## M3 (landed) — K–O
| Slice | Notes |
|-------|--------|
| **K** | My Work buckets (today/upcoming/overdue/completed/by-board); search hardened (control-char strip, private-board + cross-tenant isolation) |
| **L** | Mobile: item tabs, column/status edit, camera/files stub, notification deep-link parser → board/item |
| **M** | Dashboard widgets from authorized data; Forms settings + API; submit → `createItem` (+ `item.created` automations) |
| **N** | Billing usage meters (seats/boards/storage/automations); platform org usage includes forms/runs |
| **O** | BoardGrid a11y (`role=grid`/headers/cells); stricter form-submit + search rate limits; `phase2-klmno` tests; forms migration |

**Migrations:** `20261004210000_phase2_columns.sql`, `20261004220000_phase2_views_automations.sql`, `20261004230000_phase2_forms.sql`

Still mocked: Supabase Auth/DB/Realtime/Storage, Stripe, email/push providers.

## M4 (landed) — D/F production depth
| Slice | Notes |
|-------|--------|
| **D** | Column resize (persist width); arrow-key cell focus; Enter edit; Cmd/Ctrl+C/V clipboard via cell API |
| **F** | Comment `parentCommentId` replies (1 level); emoji reaction toggles; activity `comment.replied` |

**Migrations:** `20261004240000_phase2_comment_threads.sql`

Brand footer: `UNISON · By Majd Asali` (app shell + landing + mobile).

## M5 (landed) — H / A / C / M
| Slice | Notes |
|-------|--------|
| **H** | AND/OR `FilterBuilder` → FilterGroup DSL → saved personal/shared views |
| **A** | `viewer` role (read-only); `file:write`; column `writeMinRole` (priority admin-only demo) |
| **C** | Status/priority label admin UI; relation column linking same-board items |
| **M** | `/f/[formId]` landing; honeypot + submit cap; form GET/POST rate limits |

**Migrations:** `20261004250000_phase2_viewer_role.sql`

See also `docs/PROGRESS.md` and `docs/IMPLEMENTATION_PLAN.md`.
