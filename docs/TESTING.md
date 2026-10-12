# Testing

```bash
pnpm test
pnpm test:e2e
pnpm --filter @unison/security test
```

## Layers
- Unit: validation, billing entitlements, security helpers
- Integration: demo repository tenant isolation
- E2E: Playwright against web demo (boards CRUD)
- Security: cross-tenant denial tests

## Playwright e2e
```bash
pnpm exec playwright install chromium   # once, needs network
pnpm test:e2e
```
If browsers are unavailable in the environment, unit/integration tests still cover tenant isolation, mentions, subitems, and automations. Document skip rather than faking green e2e.

## CI expectation
See [CI.md](./CI.md). On every PR and `main` push: lockfile install, typecheck, lint, unit tests, `test:security` (tenant isolation), web build, mobile validation, desktop scaffold validation, DB schema/RLS validation, secret + credential scan, dependency audit (`pnpm audit --audit-level=high`). Playwright e2e remains local/nightly when browsers are available (`pnpm test:e2e`).
