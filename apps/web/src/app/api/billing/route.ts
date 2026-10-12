import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';
import { PLANS } from '@unison/billing';

export async function GET() {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    return jsonOk({
      subscription: await repo.getSubscription(session.org.id),
      entitlements: await repo.getEntitlements(),
      usage: await repo.usageSummary(session.org.id),
      plans: PLANS,
    });
  } catch (error) {
    return mapRepoError(error);
  }
}
