'use client';

import { useEffect, useState } from 'react';
import { Badge, Button } from '@unison/ui';

interface Role {
  id: string;
  name: string;
  description?: string | null;
  baseRole: string;
  grants: string[];
  denies: string[];
}

interface PreviewRow {
  action: string;
  label: string;
  group: string;
  allowed: boolean;
  source: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/roles');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed');
      return;
    }
    setRoles(data.roles ?? []);
    if (!activeId && data.roles?.[0]) setActiveId(data.roles[0].id);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void fetch(`/api/roles/${activeId}/preview`)
      .then((r) => r.json())
      .then((data) => {
        if (data.preview) setPreview(data.preview);
      });
  }, [activeId]);

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="font-[family-name:var(--font-syne)] text-3xl tracking-tight">Roles</h1>
        <p className="mt-1 text-sm text-[var(--unison-muted)]">
          Custom roles overlay grants/denies on built-in ranks. Server enforces every action.
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-2 rounded-lg border border-[var(--unison-border)] p-3">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveId(r.id)}
              className={`w-full rounded-md px-3 py-2 text-start text-sm ${
                activeId === r.id
                  ? 'bg-[var(--unison-ocean)] text-[var(--unison-mist)]'
                  : 'hover:bg-[var(--unison-mist)]'
              }`}
            >
              <div className="font-medium">{r.name}</div>
              <div className="text-xs opacity-80">base: {r.baseRole}</div>
            </button>
          ))}
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        </aside>
        <section className="rounded-lg border border-[var(--unison-border)] p-4">
          <h2 className="mb-3 text-lg font-semibold">Permission preview</h2>
          <div className="space-y-2">
            {preview.map((row) => (
              <div
                key={row.action}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--unison-border)] py-2 text-sm"
              >
                <div>
                  <div className="font-medium">{row.label}</div>
                  <div className="text-xs text-[var(--unison-muted)]">
                    {row.group} · {row.action}
                  </div>
                </div>
                <Badge>{row.allowed ? `allow (${row.source})` : `deny (${row.source})`}</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
