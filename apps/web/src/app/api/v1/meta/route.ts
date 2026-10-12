import { jsonOk } from '@/lib/api';
import { INTEGRATION_REGISTRY, COLUMN_REGISTRY } from '@unison/shared';

/** Versioned public API metadata (P3-M14) — no secrets. */
export async function GET() {
  return jsonOk({
    apiVersion: 'v1',
    product: 'UNISON',
    brand: 'UNISON · By Majd Asali',
    capabilities: {
      boards: true,
      messages: true,
      integrations: true,
      workdocs: true,
      timeEntries: true,
      customRoles: true,
      webhooks: true,
      extensions: true,
    },
    columnTypes: Object.keys(COLUMN_REGISTRY),
    integrationProviders: INTEGRATION_REGISTRY.map((p) => p.id),
    auth: {
      modes: ['demo_session', 'supabase_jwt'],
      note: 'Live OAuth/MFA require owner-configured providers — see docs/PRODUCTION_PROVIDERS.md',
    },
    rateLimits: {
      note: 'Enforced in Next middleware for forms/search; API tokens planned with scopes',
    },
  });
}
