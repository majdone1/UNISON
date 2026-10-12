# Desktop Release

Tauri 2 shell in `apps/desktop`.

## Architecture
- Window loads the UNISON web app (`http://127.0.0.1:43127` in dev; packaged URL in prod).
- Shared auth/session cookies or token handoff via deep link.
- OS notifications bridge mock adapters in `@unison/shared` → Tauri notification plugin when signed builds exist.

## Deep-link / auth strategy
Scheme: `unison://`

| Link | Purpose |
|------|---------|
| `unison://auth/callback?code=…` | OAuth / magic-link return (Supabase) |
| `unison://board/{boardId}?item={itemId}` | Open board/item |
| `unison://notifications` | Notification center |

**Demo mode:** deep links can open the web routes directly (`/app/boards/…`).  
**Production:** validate `code` with Supabase Auth exchange; never embed secrets in the link.

Configured in `apps/desktop/src-tauri/tauri.conf.json` → `plugins.deep-link.desktop.schemes`.

## Notifications wiring
1. Web/API creates in-app notification (+ mock email/push/desktop adapters).
2. Desktop shell subscribes to a local event or polls `/api/notifications`.
3. On unread, call Tauri `notification` plugin (`title`/`body`/`href`).
4. Click focuses window and navigates to `href`.

Signing + notarization required before shipping notification entitlements on macOS (**BLOCKED_EXTERNAL**).

## Dev (runnable shell stub)
```bash
# terminal 1
pnpm --filter @unison/web dev

# terminal 2 — once tauri-cli installed
cd apps/desktop/src-tauri
cargo install tauri-cli --version "^2" --locked
cargo tauri dev
```

Without Tauri CLI, `pnpm --filter @unison/desktop tauri:dev` prints the same instructions. The Rust `main.rs` stub documents the shell entrypoint.

## Packaging / signing (BLOCKED_EXTERNAL)
- macOS: Developer ID + notarization
- Windows: Authenticode
- Updater: public endpoint + private key (never commit)

See also `docs/DEPLOYMENT.md`.
