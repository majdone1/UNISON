# UNISON Desktop (Tauri)

Runnable shell that wraps `apps/web`.

```bash
pnpm --filter @unison/web dev
# then
cargo tauri dev   # from apps/desktop/src-tauri when CLI installed
```

Deep-link scheme `unison://` and notification strategy: `docs/DESKTOP_RELEASE.md`.
