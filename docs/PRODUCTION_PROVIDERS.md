# Production provider connection readiness

**Status:** Architecture + mocks landed in Phase 3. Live credentials are **owner-side** — never paste secrets into chat or commits.

PR #1 stays **draft**. Keep `DEMO_MODE=true` until replacements are verified.

## Checklist (Majd)

| Provider | What to do | Env var **names** only | Where |
|----------|------------|------------------------|-------|
| Supabase Auth/DB/Storage/Realtime | **Schema applied** on **unison-production** (RLS verify ok). Remaining: Auth → Providers → Email; set host env values from Dashboard/MCP (never chat) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_MODE` | Vercel/host secrets + Supabase Dashboard |
| Stripe billing | Create products/prices; point webhook to `/api/billing/webhook` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `BILLING_PROVIDER` | Stripe Dashboard + host |
| Email | Configure transactional provider | `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` | Host secrets |
| Push (mobile) | FCM / APNs | `PUSH_PROVIDER`, `FCM_SERVER_KEY` / APNs key path vars | Host + store consoles |
| Desktop notifications | OS bridge when Tauri builder enabled | (uses same session; no extra secret for demo) | Local signing later |
| OAuth (Google/Microsoft/Apple) | Create OAuth apps; redirect to Auth callback | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`, `APPLE_OAUTH_CLIENT_ID`, `APPLE_OAUTH_CLIENT_SECRET` | IdP consoles + Supabase Auth |
| Slack (first integration) | Create Slack app; install to workspace | `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET` | Slack API + host |
| Other integrations | See Integrations Center cards for each provider's env names | per-provider `*_CLIENT_ID` / `*_CLIENT_SECRET` | Provider consoles |
| Webhook signing | Shared secret for outbound HMAC | `WEBHOOK_SIGNING_SECRET` | Host |
| Mobile signing | Apple/Google release | store certs / keystores (pipeline secrets) | `docs/MOBILE_RELEASE.md` |
| Desktop signing | Apple/Windows codesign | pipeline secrets | `docs/DESKTOP_RELEASE.md` |

## Demo vs production

| Mode | Behavior |
|------|----------|
| `DEMO_MODE=true` (default) | In-memory `DemoRepository`; mock email/push/desktop/Slack connect; no network payment |
| `DEMO_MODE=false` + Supabase env | `SupabaseRepository` + RLS; still mock Stripe/email/push until those envs set |

**Never** claim production delivery success for email/push/Slack/Stripe while adapters are mock.

## Verification after owner wiring

1. Set env **names** in host (values outside chat) — `DEMO_MODE=false` + Supabase URL/anon (+ service role server-only)  
2. Migrations already on **unison-production**; only push **new** additive SQL if added later  
3. Auth → Providers → enable Email; smoke login, board write, re-run RLS isolation SQL  
4. Keep PR draft until Depot green on tip  
5. Stripe/email/push/Slack remain mock until their rows above are completed

## Related docs

- `docs/DEPLOYMENT.md`, `docs/BILLING.md`, `docs/SECURITY.md`, `docs/CI.md`  
- Integrations UI: `/app/integrations`  
- API meta: `GET /api/v1/meta`  
