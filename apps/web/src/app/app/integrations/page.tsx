'use client';

import { useEffect, useState } from 'react';
import { Badge, Button } from '@unison/ui';

interface Provider {
  id: string;
  name: string;
  category: string;
  description: string;
  envVarNames: string[];
  oauthReady: boolean;
}

interface Connection {
  providerId: string;
  status: string;
  displayName: string;
  credentialRef?: string | null;
}

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await fetch('/api/integrations');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to load');
      return;
    }
    setProviders(data.providers ?? []);
    setConnections(data.connections ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(providerId: string, action: 'connect' | 'disconnect') {
    setBusy(providerId);
    setError(null);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ providerId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Action failed');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  function statusFor(id: string) {
    return connections.find((c) => c.providerId === id)?.status ?? 'disconnected';
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="font-[family-name:var(--font-syne)] text-3xl tracking-tight text-[var(--unison-ink)]">
          Integrations
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--unison-muted)]">
          Connect providers inside UNISON (not Cursor). Demo uses mock OAuth — configure env var{' '}
          <em>names</em> listed per provider in host secrets when going live. Never paste secrets
          here.
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {providers.map((p) => {
          const status = statusFor(p.id);
          const connected = status === 'connected_mock';
          return (
            <article
              key={p.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <p className="text-xs uppercase tracking-wide text-[var(--unison-muted)]">
                    {p.category}
                  </p>
                </div>
                <Badge>{connected ? 'Mock connected' : 'Disconnected'}</Badge>
              </div>
              <p className="flex-1 text-sm text-[var(--unison-slate)]">{p.description}</p>
              <p className="text-xs text-[var(--unison-muted)]">
                Env: {p.envVarNames.join(', ') || '—'}
              </p>
              <div className="flex gap-2">
                {connected ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy === p.id}
                    onClick={() => void toggle(p.id, 'disconnect')}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={busy === p.id}
                    onClick={() => void toggle(p.id, 'connect')}
                  >
                    {p.id === 'slack' ? 'Connect Slack (mock)' : 'Connect (mock)'}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
