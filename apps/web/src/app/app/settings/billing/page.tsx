'use client';

import { useEffect, useState } from 'react';
import { Badge, Button } from '@unison/ui';
import { PLANS } from '@unison/billing';
import type { Entitlements, PlanId, Subscription } from '@unison/types';

export default function BillingPage() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<{
    seats: { used: number; limit: number };
    boards: { used: number; limit: number };
    storageGb: { used: number; limit: number };
    automations: { enabled: number; runs: number; allowed: boolean };
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/billing');
    const data = await res.json();
    if (res.ok) {
      setEntitlements(data.entitlements);
      setSubscription(data.subscription);
      setUsage(data.usage ?? null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function checkout(planId: PlanId) {
    setError(null);
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, applyImmediately: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Checkout failed');
      return;
    }
    setMessage(`Upgraded to ${planId} (mock). Gates refreshed server-side.`);
    setEntitlements(data.entitlements);
    setSubscription(data.subscription);
  }

  async function setDemoState(status: 'active' | 'past_due' | 'cancelled', planId?: PlanId) {
    setError(null);
    const res = await fetch('/api/billing/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, planId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Billing state failed');
      return;
    }
    setMessage(`Subscription → ${data.subscription.status} / ${data.subscription.planId}`);
    setEntitlements(data.entitlements);
    setSubscription(data.subscription);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold">Billing</h1>
        <p className="text-[var(--unison-muted)]">
          Upgrade, downgrade, cancel, and past_due states enforce feature gates on the server — not
          only in the UI. Stripe remains BLOCKED_EXTERNAL.
        </p>
      </header>

      {entitlements && (
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">Plan: {entitlements.planId}</Badge>
          <Badge>Seats: {entitlements.seats}</Badge>
          <Badge>Boards: {entitlements.boards}</Badge>
          <Badge>Write: {entitlements.canWriteItems ? 'on' : 'off'}</Badge>
          <Badge>Automations: {entitlements.canRunAutomations ? 'on' : 'off'}</Badge>
          {subscription && <Badge>Status: {subscription.status}</Badge>}
          {entitlements.isPastDue && <Badge tone="danger">Past due</Badge>}
          {entitlements.isSuspended && <Badge tone="danger">Suspended</Badge>}
        </div>
      )}

      {usage && (
        <section className="grid gap-3 md:grid-cols-3" aria-label="Plan usage">
          {(
            [
              ['Seats', usage.seats.used, usage.seats.limit],
              ['Boards', usage.boards.used, usage.boards.limit],
              ['Storage GB', usage.storageGb.used, usage.storageGb.limit],
            ] as const
          ).map(([label, used, limit]) => {
            const pct = limit > 0 ? Math.min(100, Math.round((Number(used) / Number(limit)) * 100)) : 0;
            return (
              <div
                key={label}
                className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4"
              >
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="text-[var(--unison-muted)]">
                    {used} / {limit}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--unison-mist)]">
                  <div
                    className="h-full bg-[var(--unison-teal)]"
                    style={{ width: `${pct}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${label} usage`}
                  />
                </div>
              </div>
            );
          })}
          <div className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4 md:col-span-3">
            <div className="text-sm font-medium">Automations</div>
            <p className="mt-1 text-sm text-[var(--unison-muted)]">
              {usage.automations.enabled} enabled · {usage.automations.runs} runs recorded ·{' '}
              {usage.automations.allowed ? 'allowed on plan' : 'blocked by entitlements'}
            </p>
          </div>
        </section>
      )}

      {message && <p className="text-sm text-[var(--unison-teal)]">{message}</p>}
      {error && <p className="text-sm text-[var(--unison-coral)]">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void setDemoState('active', 'starter')}>
          Downgrade → starter
        </Button>
        <Button variant="secondary" onClick={() => void setDemoState('past_due')}>
          Mark past_due
        </Button>
        <Button variant="secondary" onClick={() => void setDemoState('cancelled')}>
          Cancel subscription
        </Button>
        <Button variant="secondary" onClick={() => void setDemoState('active', 'growth')}>
          Restore growth
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((planId) => {
          const plan = PLANS[planId];
          return (
            <div
              key={planId}
              className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4"
            >
              <div className="font-display text-2xl font-semibold">{plan.name}</div>
              <div className="mt-1 text-sm text-[var(--unison-muted)]">
                {plan.seatLimit} seats · {plan.boardLimit} boards · {plan.storageGb} GB
              </div>
              <div className="mt-4 text-lg font-medium">
                {plan.priceMonthlyUsd === 0 ? 'Custom / free' : `$${plan.priceMonthlyUsd}/seat`}
              </div>
              <Button className="mt-4" onClick={() => void checkout(planId)}>
                Choose {plan.name}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
