import type {
  Entitlements,
  Organization,
  PlanDefinition,
  PlanId,
  Subscription,
  SubscriptionStatus,
} from '@unison/types';

export const PLANS: Record<PlanId, PlanDefinition> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    seatLimit: 10,
    boardLimit: 20,
    storageGb: 5,
    automationsEnabled: true,
    ssoEnabled: false,
    priceMonthlyUsd: 0,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    seatLimit: 15,
    boardLimit: 50,
    storageGb: 25,
    automationsEnabled: true,
    ssoEnabled: false,
    priceMonthlyUsd: 12,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    seatLimit: 50,
    boardLimit: 250,
    storageGb: 100,
    automationsEnabled: true,
    ssoEnabled: false,
    priceMonthlyUsd: 24,
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    seatLimit: 200,
    boardLimit: 1000,
    storageGb: 500,
    automationsEnabled: true,
    ssoEnabled: true,
    priceMonthlyUsd: 42,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    seatLimit: 10000,
    boardLimit: 100000,
    storageGb: 5000,
    automationsEnabled: true,
    ssoEnabled: true,
    priceMonthlyUsd: 0,
  },
};

export function getPlan(planId: PlanId): PlanDefinition {
  return PLANS[planId];
}

export function resolveEntitlements(input: {
  org: Organization;
  subscription: Subscription;
  seatUsage: number;
  boardUsage: number;
}): Entitlements {
  const plan = getPlan(input.subscription.planId);
  const suspended =
    input.org.status === 'suspended' ||
    input.subscription.status === 'suspended' ||
    input.subscription.status === 'cancelled';
  const pastDueBlocked = input.subscription.status === 'past_due';

  const writeBlocked = suspended || pastDueBlocked;
  return {
    planId: plan.id,
    seats: plan.seatLimit,
    boards: plan.boardLimit,
    storageGb: plan.storageGb,
    automations: plan.automationsEnabled && !writeBlocked,
    sso: plan.ssoEnabled && !suspended,
    canCreateBoard: !writeBlocked && input.boardUsage < plan.boardLimit,
    canInvite: !suspended && !pastDueBlocked && input.seatUsage < plan.seatLimit,
    canWriteItems: !writeBlocked,
    canRunAutomations: plan.automationsEnabled && !writeBlocked,
    isSuspended: suspended,
    isPastDue: pastDueBlocked,
  };
}

export type BillingWebhookEvent =
  | { type: 'checkout.completed'; orgId: string; planId: PlanId; seats: number }
  | { type: 'invoice.paid'; orgId: string }
  | { type: 'invoice.payment_failed'; orgId: string }
  | { type: 'subscription.updated'; orgId: string; planId: PlanId; status: SubscriptionStatus }
  | { type: 'subscription.deleted'; orgId: string };

/** Mock provider — no Stripe keys required. Server-side only. */
export class MockBillingProvider {
  readonly name = 'mock' as const;

  createCheckoutSession(input: {
    orgId: string;
    planId: PlanId;
    seats: number;
    successUrl: string;
    cancelUrl: string;
  }): { url: string; sessionId: string } {
    const sessionId = `mock_cs_${input.orgId}_${input.planId}`;
    const url = `${input.successUrl}?session_id=${sessionId}&plan=${input.planId}&seats=${input.seats}`;
    return { url, sessionId };
  }

  parseWebhook(payload: unknown): BillingWebhookEvent | null {
    if (!payload || typeof payload !== 'object') return null;
    const event = payload as BillingWebhookEvent;
    if (!('type' in event) || !('orgId' in event)) return null;
    return event;
  }

  applyEvent(subscription: Subscription, event: BillingWebhookEvent): Subscription {
    const next = { ...subscription };
    switch (event.type) {
      case 'checkout.completed':
        next.planId = event.planId;
        next.seats = event.seats;
        next.status = 'active';
        next.provider = 'mock';
        break;
      case 'invoice.paid':
        next.status = 'active';
        next.graceEndsAt = null;
        break;
      case 'invoice.payment_failed':
        next.status = 'past_due';
        next.graceEndsAt = new Date(Date.now() + 7 * 86400000).toISOString();
        break;
      case 'subscription.updated':
        next.planId = event.planId;
        next.status = event.status;
        break;
      case 'subscription.deleted':
        next.status = 'cancelled';
        break;
      default:
        break;
    }
    return next;
  }
}
