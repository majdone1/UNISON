import { MockBillingProvider, PLANS } from '@unison/billing';
import { planIdSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      planId?: string;
      seats?: number;
      applyImmediately?: boolean;
    };
    const planId = planIdSchema.safeParse(body.planId);
    if (!planId.success) return jsonError('Invalid plan');
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    const provider = new MockBillingProvider();
    const seats = body.seats ?? PLANS[planId.data].seatLimit;
    const checkout = provider.createCheckoutSession({
      orgId: session.org.id,
      planId: planId.data,
      seats,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:43127'}/app/settings/billing`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:43127'}/app/settings/billing`,
    });
    let subscription = null;
    if (body.applyImmediately !== false) {
      subscription = await repo.applyBillingEvent({
        type: 'checkout.completed',
        orgId: session.org.id,
        planId: planId.data,
        seats,
      });
    }
    return jsonOk({
      ...checkout,
      provider: 'mock',
      subscription,
      entitlements: await repo.getEntitlements(),
      note: 'Stripe keys BLOCKED_EXTERNAL — mock checkout applies server-side when applyImmediately',
    });
  } catch (error) {
    return mapRepoError(error);
  }
}
