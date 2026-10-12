# UNISON

Multi-tenant work management for teams that move together.  
**Work in concert.**

UNISON is a production-oriented TypeScript monorepo (web + mobile + desktop) with shared accounts, orgs, permissions, subscriptions, and APIs. Original product UI — not a Monday.com clone.

## Stack

| Surface | Tech |
|---------|------|
| Web | Next.js, TypeScript, Tailwind, shadcn-style `@unison/ui` |
| Mobile | React Native + Expo |
| Desktop | Tauri shell |
| Backend | Supabase (Postgres/Auth/Storage/Realtime) + Next Route Handlers |
| Monorepo | pnpm workspaces + Turborepo |

## Quick start (demo mode — no secrets)

```bash
corepack enable
pnpm install
pnpm dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

Demo mode uses an in-memory repository with seeded org/board data. Copy `.env.example` → `.env` when you have Supabase/Stripe credentials.

### Useful scripts

```bash
pnpm install          # install all workspaces
pnpm dev              # web on :43127
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:security    # multi-tenant isolation helpers
pnpm ci:local         # full CI parity (demo mode, no secrets)
pnpm db:seed          # reset local demo seed
```

CI workflows: `.github/workflows/ci.yml` (GitHub Actions) and `.depot/workflows/ci.yml` (Origin + Depot). Details in [docs/CI.md](docs/CI.md).

### Demo users

| Email | Role |
|-------|------|
| owner@unison.demo | Org owner |
| member@unison.demo | Member |
| guest@unison.demo | Guest |
| support@unison.demo | Platform super_admin |

Switch users from **Platform** in the app shell.

## Docs

- [ARCHITECTURE](docs/ARCHITECTURE.md)
- [DATABASE](docs/DATABASE.md)
- [SECURITY](docs/SECURITY.md)
- [THREAT_MODEL](docs/THREAT_MODEL.md)
- [RBAC](docs/RBAC.md)
- [BILLING](docs/BILLING.md)
- [DEPLOYMENT](docs/DEPLOYMENT.md)
- [MOBILE_RELEASE](docs/MOBILE_RELEASE.md)
- [DESKTOP_RELEASE](docs/DESKTOP_RELEASE.md)
- [TESTING](docs/TESTING.md)
- [OPERATIONS](docs/OPERATIONS.md)
- [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md)

## Security note

No ISO / SOC 2 / HIPAA certification is claimed. RLS is deny-by-default; see `docs/SECURITY.md`.

## License

Proprietary — all rights reserved unless otherwise stated.
