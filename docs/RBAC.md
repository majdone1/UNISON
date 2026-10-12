# RBAC

## Org roles (built-in)
`owner > admin > workspace_admin > member > viewer > guest`

| Action | guest | viewer | member | workspace_admin | admin | owner |
|--------|-------|--------|--------|-----------------|-------|-------|
| View boards (`board:read`) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit items (`board:write`) | | | ✓ | ✓ | ✓ | ✓ |
| Edit structure (`board:structure`) | | | | ✓ | ✓ | ✓ |
| Archive boards (`board:admin`) | | | | | ✓ | ✓ |
| Invite (`org:invite`) | | | | ✓ | ✓ | ✓ |
| Manage workspaces (`workspace:manage`) | | | | ✓ | ✓ | ✓ |
| Manage org/billing (`org:manage`) | | | | | ✓ | ✓ |
| Custom roles (`role:manage`) | | | | | ✓ | ✓ |
| Upload files (`file:write`) | | | ✓ | ✓ | ✓ | ✓ |
| Delete files (`file:delete`) | | | | ✓ | ✓ | ✓ |
| Messages read/write | read | read | ✓ | ✓ | ✓ | ✓ |
| Channel manage | | | | ✓ | ✓ | ✓ |
| Integrations read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Integrations manage | | | | | ✓ | ✓ |
| Automations manage | | | | ✓ | ✓ | ✓ |
| Time write | | | ✓ | ✓ | ✓ | ✓ |
| Time financial read | | | | ✓ | ✓ | ✓ |
| Docs read/write | read | read | ✓ | ✓ | ✓ | ✓ |

Private boards: only creator (+ platform staff) can read.

## Custom roles (Phase 3)
Org admins can define **custom roles** that inherit a `baseRole` and apply `grants` / `denies` overlays. Preview via `/api/roles/:id/preview`. Enforcement uses `@unison/auth` `authorize()` + `previewPermission()`.

## Platform roles
`super_admin`, `support`, `none`
- Read orgs/usage/audit
- Auditable impersonation
- Suspend/reactivate (`super_admin`)

Implemented in `@unison/auth` (`authorize()`, `PERMISSION_CATALOG`).

## MFA architecture
Live MFA is **BLOCKED_EXTERNAL** until Supabase Auth is configured. Planned path: Supabase Auth TOTP / WebAuthn; session claims expose `aal`; sensitive platform actions require `aal2`. Demo mode has no passwords and no MFA challenge.

## Authz rule
UI may hide controls; **every** write path re-checks role + entitlements + org tenancy server-side.
