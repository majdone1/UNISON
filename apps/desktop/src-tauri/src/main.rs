#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! UNISON desktop shell (Windows + macOS)
//!
//! Phase 3 hardening notes:
//! - Deep links: `unison://auth/callback`, `unison://board/{id}`, `unison://item/{id}`,
//!   `unison://messages`, `unison://notifications`
//! - Shared backend: same Next.js API as web (`http://127.0.0.1:43127` in demo)
//! - Notifications: bridge `/api/notifications` → OS notification plugin when Tauri Builder enabled
//! - Secure session: OS keychain / webview cookie jar — never embed service-role keys in the binary
//! - Updates: use signed updater artifacts (see docs/DESKTOP_RELEASE.md)
//!
//! Full `tauri::Builder` + window chrome lands when `tauri-cli` + signing secrets are available
//! (BLOCKED_EXTERNAL). Until then this binary documents the entrypoint for CI smoke.

fn main() {
    println!("UNISON desktop shell");
    println!("Brand: UNISON · By Majd Asali");
    println!("Deep-link scheme: unison://");
    println!("Dev API/UI: http://127.0.0.1:43127");
    println!("Clients share one backend (web/desktop/mobile) — no business-logic fork.");
    println!("See docs/DESKTOP_RELEASE.md and docs/PRODUCTION_PROVIDERS.md.");
}
