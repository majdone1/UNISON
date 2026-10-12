# Operations

## Health
`GET /api/health` — service liveness + whether Supabase is configured.

## Audit
`audit_logs` / demo audit trail for board/item mutations, suspend, impersonation.

## Support
Platform console impersonation is auditable. Never request or display passwords.

## Incidents
Rotate Supabase service role / Stripe webhook secrets via provider dashboards. Revoke sessions in Supabase Auth.
