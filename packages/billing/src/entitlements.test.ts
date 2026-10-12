import { describe, expect, it } from 'vitest';
import { resolveEntitlements } from './index';
import type { Organization, Subscription } from '@unison/types';

describe('resolveEntitlements', () => {
  const org: Organization = {
    id: '00000000-0000-4000-a000-000000000001',
    name: 'Acme',
    slug: 'acme',
    status: 'active',
    planId: 'trial',
    seatLimit: 10,
    createdAt: new Date().toISOString(),
  };

  const subscription: Subscription = {
    id: 'sub',
    orgId: org.id,
    planId: 'trial',
    status: 'trialing',
    seats: 10,
    provider: 'mock',
  };

  it('allows board create under limit', () => {
    const e = resolveEntitlements({
      org,
      subscription,
      seatUsage: 2,
      boardUsage: 1,
    });
    expect(e.canCreateBoard).toBe(true);
    expect(e.canInvite).toBe(true);
  });

  it('blocks when org suspended', () => {
    const e = resolveEntitlements({
      org: { ...org, status: 'suspended' },
      subscription,
      seatUsage: 1,
      boardUsage: 1,
    });
    expect(e.isSuspended).toBe(true);
    expect(e.canCreateBoard).toBe(false);
    expect(e.canWriteItems).toBe(false);
  });

  it('blocks writes when past_due but still allows read entitlements shape', () => {
    const e = resolveEntitlements({
      org,
      subscription: { ...subscription, status: 'past_due' },
      seatUsage: 1,
      boardUsage: 1,
    });
    expect(e.isPastDue).toBe(true);
    expect(e.canCreateBoard).toBe(false);
    expect(e.canWriteItems).toBe(false);
    expect(e.canInvite).toBe(false);
    expect(e.canRunAutomations).toBe(false);
  });

  it('blocks after cancel', () => {
    const e = resolveEntitlements({
      org,
      subscription: { ...subscription, status: 'cancelled', planId: 'starter' },
      seatUsage: 1,
      boardUsage: 1,
    });
    expect(e.isSuspended).toBe(true);
    expect(e.canCreateBoard).toBe(false);
  });
});
