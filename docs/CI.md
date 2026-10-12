# CI

Production CI for the UNISON monorepo. Demo/mock mode only — no API keys, Supabase secrets, Stripe keys, or signing credentials.

## Workflows

| Path | Purpose |
|------|---------|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | GitHub Actions (and source for Depot migrate) |
| [`.depot/workflows/ci.yml`](../.depot/workflows/ci.yml) | Origin + Depot CI (same jobs, `depot-ubuntu-latest`) |

**Triggers:** every pull request + pushes to `main`.

## Jobs

| Job | What it runs |
|-----|----------------|
| Install · typecheck · lint · unit · tenant | `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:security` |
| Web build | `pnpm --filter @unison/web build` |
| Mobile validation | `pnpm ci:mobile` (config + `tsc`) |
| Desktop build validation | `pnpm ci:desktop` (Tauri scaffold; no signing) |
| DB migration / schema | `pnpm ci:db` + `@unison/database` tests |
| Secrets · credentials · audit | `pnpm ci:secrets`, gitleaks, `pnpm ci:audit` (fails on **critical**; reports remaining Expo-transitive highs) |

Backend/API coverage is included in web unit tests and `@unison/database` / `@unison/security` tenant suites (API lives in Next route handlers).

## Local parity

```bash
corepack enable && corepack prepare pnpm@9.15.9 --activate
pnpm ci:local
```

## Origin checks (Majd)

Native Origin repos do **not** run `.github/workflows` by themselves. To show checks on the draft PR:

1. Open `majd-asali/unison` → **Apps** → connect **Depot** (or Buildkite).
2. Confirm `.depot/workflows/ci.yml` is on the PR branch (already committed).
3. Depot registers triggers after the workflow exists on a branch it watches; first run may require a push after the app is installed.
4. Optional: `depot ci migrate workflows --forge=origin` if you prefer regenerating from `.github/workflows`.
5. Optional ruleset: require the CI check suite before merge (`require_status_checks`).

Until Depot/Buildkite is connected, CI can still be verified locally with `pnpm ci:local`.

## Env in CI

All jobs set `DEMO_MODE=true`, `BILLING_PROVIDER=mock`, and empty Supabase/Stripe vars (see workflow `env`). Never add production secrets to CI for this slice.
