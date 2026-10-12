import { MockBillingProvider } from '@unison/billing';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

/** Mock Stripe webhook sink for demo upgrade/downgrade/cancel/past_due. */
export async function POST(request: Request) {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const provider = new MockBillingProvider();
    const event = provider.parseWebhook(await request.json());
    if (!event) return jsonError('Invalid webhook payload');
    const subscription = await repo.applyBillingEvent(event);
    return jsonOk({ subscription, entitlements: await repo.getEntitlements() });
  } catch (error) {
    return mapRepoError(error);
  }
}
