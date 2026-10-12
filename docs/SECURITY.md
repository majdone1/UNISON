# Security

## Principles
- Deny-by-default RLS
- Server-side RBAC + entitlement checks
- Zod validation on mutating APIs
- Security headers / CSP via middleware (`@unison/security`)
- Rate-limit architecture (`MemoryRateLimiter`; Redis in production)
- Audit logs for admin/impersonation/billing-sensitive actions
- Secrets only via env; `.env.example` names only
- Passwords never exposed (Auth provider owns credentials)

## OWASP-minded controls
Input validation, output encoding via React, CSRF via same-site cookies in Supabase mode, least privilege service role (server-only), secure file paths per org.

## Not claimed
No ISO/SOC2/HIPAA certification claims.
