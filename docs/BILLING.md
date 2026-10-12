# Billing

## Plans
trial, starter, growth, scale, enterprise — defined in `@unison/billing`.

## Enforcement
Server-side entitlements (`resolveEntitlements`) gate board creation, invites, and suspended orgs.

## Providers
- **mock** (default): checkout session IDs without Stripe
- **stripe**: `BLOCKED_EXTERNAL` until keys exist; webhook-driven status transitions (paid, past_due → grace, suspended)

## Lifecycle
trial → active → past_due → grace → suspended / cancelled
