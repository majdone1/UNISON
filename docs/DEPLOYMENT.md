# Deployment

**Best path for this stack:** **Vercel** connected to the Origin repo `majd-asali/unison`.  
Origin hosts git/PRs only — it does not serve the Next.js app. Vercel for Origin is the supported host and gives a `*.vercel.app` production URL without inventing a second product.

PR #1 stays **draft**. Do not merge to get a URL — point Vercel’s **Production Branch** at `cursor/unison-saas-foundation-14cc` until `main` is ready.

## Majd — exact click path (production URL)

### 1) Connect Origin → Vercel (one-time)

**Preferred (from the repo):**

1. Open [majd-asali/unison](https://cursor.com/codebase/majd-asali/unison)  
2. **Apps** → connect / add **Vercel** (Pro or Enterprise Vercel team — Hobby cannot deploy private Origin repos)  
3. Import project **`unison`**

**Alternate (from Vercel):**

1. [vercel.com](https://vercel.com) → **Add New…** → **Project**  
2. **Continue with Origin** → select Origin team → repo **`unison`**

### 2) Project settings before first Deploy

| Setting | Value |
|---------|--------|
| Framework Preset | **Next.js** |
| Root Directory | **`apps/web`** (Edit → select `apps/web`) |
| Install / Build | Use `apps/web/vercel.json` (`pnpm install --frozen-lockfile` + `pnpm --filter @unison/web build` from repo root) |
| Node | **20.x** (or newer LTS) |
| Production Branch | **`cursor/unison-saas-foundation-14cc`** (Settings → Git → Production Branch) — avoids merging draft PR #1 |

### 3) Host secrets UI (env **NAMES** only — paste values from Supabase Dashboard / local MCP, **never chat**)

In the Vercel project → **Settings** → **Environment Variables** → add for **Production** (and Preview if desired):

| Name | Notes |
|------|--------|
| `DEMO_MODE` | `false` for live Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` | unison-production API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** — never expose to the browser |
| `NEXT_PUBLIC_APP_URL` | set to the production URL after first deploy (e.g. `https://<project>.vercel.app`), then redeploy |
| `NEXT_PUBLIC_APP_NAME` | optional; defaults to `UNISON` |
| `BILLING_PROVIDER` | leave `mock` until Stripe is wired |
| `RATE_LIMIT_ENABLED` | `true` recommended |
| `CSP_ENABLED` | `true` recommended |

Full optional provider **names**: `docs/PRODUCTION_PROVIDERS.md` and root `.env.example`.  
CI/local keep `DEMO_MODE=true`.

### 4) Deploy → copy production URL

1. Vercel project → **Deployments** → **Deploy** (or push to the Production Branch)  
2. Wait for green build  
3. Open the **Production** domain (`https://<project>.vercel.app`) — that is the production URL  
4. Smoke: `GET /api/health` → `ok: true`, `demoMode: false`, `supabaseConfigured: true`

### 5) Supabase Auth Site URL (after you have the URL)

1. [Supabase Dashboard](https://supabase.com/dashboard/project/dskjtdqtkfifqdydnnvf) → **unison-production**  
2. **Authentication** → **Providers** → enable **Email**  
3. **Authentication** → **URL Configuration**:  
   - **Site URL** = `NEXT_PUBLIC_APP_URL` (the Vercel production URL)  
   - **Redirect URLs** include `{NEXT_PUBLIC_APP_URL}/auth/callback`

App callback route: `/auth/callback` (exchanges Auth `code` for a session cookie).

## Auth gate (live mode)

With `DEMO_MODE=false` and Supabase credentials set, `/app/**` requires a Supabase session:
`apps/web/src/middleware.ts` verifies it (`auth.getUser()`) and redirects anonymous visitors to
`/login?next=…`. API routes return `401 AUTH_REQUIRED`. `/login` supports email + password and an
email sign-in link (existing users only; the link lands on `/auth/callback`). A signed-in user without
an `org_memberships` row is sent to `/login?error=no_org` — invite them or insert the membership.

If `DEMO_MODE=false` but the Supabase URL/anon key are missing, the app silently falls back to
in-memory demo mode. Always confirm `GET /api/health` shows `demoMode: false`.

## Web (local / CI)

```bash
pnpm install --frozen-lockfile
DEMO_MODE=true pnpm --filter @unison/web build
```

## Supabase

Project **unison-production** (`dskjtdqtkfifqdydnnvf`): migrations + private `attachments` / `board-files` buckets already applied. Owner still sets Auth Email + host env as above.

## Mobile / Desktop

See `MOBILE_RELEASE.md` and `DESKTOP_RELEASE.md`.

## Demo caution

`DEMO_MODE=true` is for local/dev/CI only. Production host must use `DEMO_MODE=false` plus Supabase URL/anon/service-role in the host secrets UI — never paste secret **values** into chat or commits.
