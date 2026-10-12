import { billingDemoStateSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

/** Demo-only billing state machine — no Stripe. */
export async function POST(request: Request) {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    const parsed = billingDemoStateSchema.safeParse({
      ...(await request.json()),
      orgId: session.org.id,
    });
    if (!parsed.success) return jsonError(parsed.error.message);
    if (!parsed.data.planId && !parsed.data.status) {
      return jsonError('planId or status required');
    }
    const subscription = await repo.setBillingDemoState(parsed.data);
    return jsonOk({
      subscription,
      entitlements: await repo.getEntitlements(),
      note: 'Mock billing state applied server-side; feature gates use entitlements',
    });
  } catch (error) {
    return mapRepoError(error);
  }
}
