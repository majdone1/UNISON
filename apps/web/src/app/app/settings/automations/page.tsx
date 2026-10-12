'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Input } from '@unison/ui';

interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  trigger: Record<string, unknown>;
  conditions?: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  runCount?: number;
  lastRunAt?: string | null;
}

interface AutomationRun {
  id: string;
  automationId: string;
  itemId: string;
  triggerType: string;
  actionsFired: string[];
  status: string;
  detail?: string;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  automationId: string;
  itemId: string;
  url: string;
  method: string;
  status: string;
  statusCode: number;
  detail: string;
  createdAt: string;
}

const RECIPES = [
  {
    label: 'WHEN status→done THEN notify watchers + email',
    name: 'Notify when done',
    trigger: { type: 'item.status_changed', to: 'done' },
    conditions: [],
    actions: [
      { type: 'notify.watchers', channel: 'in_app' },
      { type: 'notify.email', adapter: 'mock' },
    ],
  },
  {
    label: 'WHEN created THEN assign actor',
    name: 'Assign on create',
    trigger: { type: 'item.created' },
    conditions: [],
    actions: [{ type: 'assign.actor' }],
  },
  {
    label: 'WHEN stuck IF priority=urgent THEN notify assignees',
    name: 'Urgent stuck alert',
    trigger: { type: 'item.status_changed', to: 'stuck' },
    conditions: [{ field: 'priority', op: 'eq', value: 'urgent' }],
    actions: [{ type: 'notify.assignees', channel: 'in_app' }],
  },
  {
    label: 'WHEN done IF name not blank THEN progress=100',
    name: 'Complete progress on done',
    trigger: { type: 'item.status_changed', to: 'done' },
    conditions: [{ field: 'name', op: 'not_blank' }],
    actions: [{ type: 'set_field', field: 'progress', value: 100 }],
  },
  {
    label: 'WHEN done THEN webhook.http (mock)',
    name: 'Webhook when done',
    trigger: { type: 'item.status_changed', to: 'done' },
    conditions: [],
    actions: [
      {
        type: 'webhook.http',
        url: 'https://hooks.example.com/unison/done',
        method: 'POST',
        adapter: 'mock',
      },
    ],
  },
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [webhookDeliveries, setWebhookDeliveries] = useState<WebhookDelivery[]>([]);
  const [name, setName] = useState('WHEN done THEN notify');
  const [when, setWhen] = useState('item.status_changed');
  const [whenTo, setWhenTo] = useState('done');
  const [ifField, setIfField] = useState('');
  const [ifOp, setIfOp] = useState('eq');
  const [ifValue, setIfValue] = useState('');
  const [thenAction, setThenAction] = useState('notify.watchers');
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.example.com/unison/done');
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/automations');
    const data = await res.json();
    setAutomations(data.automations ?? []);
    setRuns(data.runs ?? []);
    setWebhookDeliveries(data.webhookDeliveries ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createRule(payload: {
    name: string;
    trigger: Record<string, unknown>;
    conditions: Array<Record<string, unknown>>;
    actions: Array<Record<string, unknown>>;
  }) {
    const res = await fetch('/api/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error ?? 'Failed');
    else {
      setMessage('Automation created.');
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold">Automations</h1>
        <p className="text-[var(--unison-muted)]">
          WHEN / IF / THEN builder with execution history and loop protection (max chain depth 3).
          Demo-mode runner — no external webhook secrets required.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
        <h2 className="font-display text-xl font-semibold">Builder</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
          <select
            className="h-10 rounded-md border border-[var(--unison-border)] bg-transparent px-2 text-sm"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          >
            <option value="item.status_changed">WHEN status changes</option>
            <option value="item.created">WHEN item created</option>
            <option value="item.due_within">WHEN due within days</option>
            <option value="item.group_changed">WHEN group changes</option>
          </select>
          {when === 'item.status_changed' && (
            <Input
              value={whenTo}
              onChange={(e) => setWhenTo(e.target.value)}
              placeholder="Status equals (e.g. done)"
            />
          )}
          <Input
            value={ifField}
            onChange={(e) => setIfField(e.target.value)}
            placeholder="IF field (optional, e.g. priority)"
          />
          <select
            className="h-10 rounded-md border border-[var(--unison-border)] bg-transparent px-2 text-sm"
            value={ifOp}
            onChange={(e) => setIfOp(e.target.value)}
          >
            <option value="eq">equals</option>
            <option value="neq">not equals</option>
            <option value="contains">contains</option>
            <option value="gt">greater than</option>
            <option value="lt">less than</option>
            <option value="not_blank">not blank</option>
            <option value="is_blank">is blank</option>
          </select>
          <Input
            value={ifValue}
            onChange={(e) => setIfValue(e.target.value)}
            placeholder="IF value"
          />
          <select
            className="h-10 rounded-md border border-[var(--unison-border)] bg-transparent px-2 text-sm"
            value={thenAction}
            onChange={(e) => setThenAction(e.target.value)}
          >
            <option value="notify.watchers">THEN notify watchers</option>
            <option value="notify.assignees">THEN notify assignees</option>
            <option value="notify.email">THEN email (mock)</option>
            <option value="assign.actor">THEN assign actor</option>
            <option value="set_status">THEN set status working</option>
            <option value="set_field">THEN set progress 100</option>
            <option value="webhook.http">THEN webhook.http (mock)</option>
          </select>
          {thenAction === 'webhook.http' && (
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.example.com/…"
            />
          )}
        </div>
        <Button
          onClick={() => {
            const conditions =
              ifField.trim() && ifOp
                ? [{ field: ifField.trim(), op: ifOp, value: ifValue }]
                : [];
            const actions =
              thenAction === 'set_status'
                ? [{ type: 'set_status', status: 'working' }]
                : thenAction === 'set_field'
                  ? [{ type: 'set_field', field: 'progress', value: 100 }]
                  : thenAction === 'notify.email'
                    ? [{ type: 'notify.email', adapter: 'mock' }]
                    : thenAction === 'webhook.http'
                      ? [
                          {
                            type: 'webhook.http',
                            url: webhookUrl,
                            method: 'POST',
                            adapter: 'mock',
                          },
                        ]
                      : [{ type: thenAction, channel: 'in_app' }];
            void createRule({
              name,
              trigger: {
                type: when,
                ...(when === 'item.status_changed' ? { to: whenTo } : {}),
                ...(when === 'item.due_within' ? { withinDays: 2 } : {}),
              },
              conditions,
              actions,
            });
          }}
        >
          Create WHEN / IF / THEN rule
        </Button>
        {message && <p className="text-sm text-[var(--unison-teal)]">{message}</p>}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Recipes</h2>
        <div className="flex flex-wrap gap-2">
          {RECIPES.map((r) => (
            <Button
              key={r.label}
              size="sm"
              variant="secondary"
              onClick={() =>
                void createRule({
                  name: r.name,
                  trigger: r.trigger,
                  conditions: r.conditions,
                  actions: r.actions,
                })
              }
            >
              {r.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Rules</h2>
        {automations.length === 0 ? (
          <p className="text-[var(--unison-muted)]">No automations yet.</p>
        ) : (
          automations.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium">{a.name}</div>
                <Badge tone={a.enabled ? 'success' : 'neutral'}>
                  {a.enabled ? 'enabled' : 'disabled'}
                </Badge>
                <Badge>runs: {a.runCount ?? 0}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void fetch('/api/automations', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: a.id, enabled: !a.enabled }),
                    }).then(() => load());
                  }}
                >
                  {a.enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
              <pre className="mt-2 overflow-auto text-xs text-[var(--unison-muted)]">
                {JSON.stringify(
                  { WHEN: a.trigger, IF: a.conditions ?? [], THEN: a.actions },
                  null,
                  2,
                )}
              </pre>
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Execution history</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-[var(--unison-muted)]">
            No runs yet — change an item status on a board to trigger rules.
          </p>
        ) : (
          runs.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-2 border-b border-[var(--unison-border)] py-2 text-sm"
            >
              <Badge tone={r.status === 'ok' ? 'success' : 'warn'}>{r.status}</Badge>
              <span>{r.triggerType}</span>
              <span className="text-[var(--unison-muted)]">
                {r.actionsFired.join(', ') || r.detail || '—'}
              </span>
              <span className="ms-auto text-xs text-[var(--unison-muted)]">
                {new Date(r.createdAt).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-semibold">Webhook delivery log</h2>
        <p className="text-sm text-[var(--unison-muted)]">
          Mock HTTP adapter — no network calls, no secrets. Mark an item done to fire the seeded
          webhook rule.
        </p>
        {webhookDeliveries.length === 0 ? (
          <p className="text-sm text-[var(--unison-muted)]">No webhook deliveries yet.</p>
        ) : (
          webhookDeliveries.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={d.status === 'mock_ok' ? 'success' : 'warn'}>{d.status}</Badge>
                <Badge>{d.method}</Badge>
                <Badge>{d.statusCode}</Badge>
                <span className="truncate text-[var(--unison-muted)]">{d.url}</span>
                <span className="ms-auto text-xs text-[var(--unison-muted)]">
                  {new Date(d.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--unison-muted)]">{d.detail}</p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
