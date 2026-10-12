# Threat Model

## Assets
Tenant data (boards/items/files), auth sessions, billing state, platform admin powers, audit integrity.

## Adversaries
External attacker, malicious tenant member, compromised support operator, confused deputy via webhooks.

## Key threats & mitigations
| Threat | Mitigation |
|--------|------------|
| Cross-tenant read/write | RLS + `assertOrgAccess` + security tests |
| Privilege escalation | Role rank checks; platform roles separate |
| Impersonation abuse | Audited; staff-only; no password access |
| Webhook forgery | Stripe signature verification when keys present |
| File exfil | Org-prefixed storage paths + signed URLs |
| XSS/clickjacking | CSP, frame deny, React escaping |
| Abuse/DoS | Rate limit architecture |

## Residual risk
Demo mode has no network auth boundary — local only.
