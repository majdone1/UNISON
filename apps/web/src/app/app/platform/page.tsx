'use client';

import { useEffect, useState } from 'react';
import { Badge, Button } from '@unison/ui';
import { useI18n } from '@/components/i18n-provider';

interface PlatformOrg {
  org: { id: string; name: string; slug: string; status: string; planId: string };
  seats: number;
  subscription: { status: string; planId: string };
  usage: {
    boards: number;
    items: number;
    attachments?: number;
    storageBytes?: number;
    automations?: number;
    automationRuns?: number;
    forms?: number;
  };
}

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  actorUserId?: string | null;
  impersonatorUserId?: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export default function PlatformAdminPage() {
  const { t } = useI18n();
  const [orgs, setOrgs] = useState<PlatformOrg[]>([]);
  const [users, setUsers] = useState<
    Array<{ id: string; displayName: string; email: string; platformRole: string }>
  >([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState<string>('none');
  const [impersonating, setImpersonating] = useState(false);

  async function load() {
    const session = await fetch('/api/session').then((r) => r.json());
    setSessionRole(session.session?.platformRole ?? 'none');
    setUsers(session.users ?? []);
    setImpersonating(Boolean(session.impersonating));
    const res = await fetch('/api/platform/orgs');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Forbidden — switch to support@unison.demo');
      setOrgs([]);
    } else {
      setError(null);
      setOrgs(data.orgs ?? []);
    }
    const auditRes = await fetch('/api/platform/audit');
    if (auditRes.ok) {
      const auditData = await auditRes.json();
      setAudit(auditData.audit ?? []);
    } else {
      setAudit([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold">Platform console</h1>
        <p className="text-[var(--unison-muted)]">
          Super-admin oversight, suspend/reactivate, auditable impersonation. Passwords never
          exposed.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {users.map((user) => (
          <Button
            key={user.id}
            size="sm"
            variant="secondary"
            onClick={() => {
              void fetch('/api/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
              }).then(() => load());
            }}
          >
            Act as {user.displayName}
            {user.platformRole !== 'none' ? ' ★' : ''}
          </Button>
        ))}
      </div>
      <p className="text-sm text-[var(--unison-muted)]">
        Current platform role: <Badge>{sessionRole}</Badge>
        {impersonating && <Badge tone="warn">Impersonating</Badge>} — use Riley Support for admin
        actions.
      </p>

      {error && <p className="text-sm text-[var(--unison-coral)]">{error}</p>}

      <div className="space-y-3">
        {orgs.map((row) => (
          <div
            key={row.org.id}
            className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{row.org.name}</div>
                <div className="text-sm text-[var(--unison-muted)]">
                  {row.seats} seats · {row.usage.boards} boards · {row.usage.items} items ·{' '}
                  {row.usage.attachments ?? 0} files · {row.usage.automations ?? 0} autos ·{' '}
                  {row.usage.forms ?? 0} forms · {row.subscription.planId}/
                  {row.subscription.status}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={row.org.status === 'suspended' ? 'danger' : 'success'}>
                  {row.org.status}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void fetch('/api/platform/orgs', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        orgId: row.org.id,
                        status: row.org.status === 'suspended' ? 'active' : 'suspended',
                      }),
                    }).then(() => load());
                  }}
                >
                  {row.org.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const member = users.find((u) => u.email === 'owner@unison.demo');
                    if (!member) return;
                    void fetch('/api/platform/impersonate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: member.id }),
                    }).then(() => load());
                  }}
                >
                  Impersonate owner
                </Button>
                {impersonating && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      void fetch('/api/platform/impersonate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ stop: true }),
                      }).then(() => load());
                    }}
                  >
                    Revoke impersonation
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">{t('platform.audit')}</h2>
        <div className="overflow-hidden rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)]">
          {audit.length === 0 ? (
            <p className="p-4 text-sm text-[var(--unison-muted)]">No audit events (or forbidden).</p>
          ) : (
            audit.slice(0, 40).map((entry) => (
              <div
                key={entry.id}
                className="border-b border-[var(--unison-border)] px-4 py-3 text-sm last:border-b-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{entry.action}</Badge>
                  <span className="text-[var(--unison-muted)]">
                    {entry.resourceType}
                    {entry.resourceId ? `:${entry.resourceId.slice(0, 8)}` : ''}
                  </span>
                  {entry.impersonatorUserId && <Badge tone="warn">via impersonation</Badge>}
                </div>
                <div className="mt-1 text-xs text-[var(--unison-muted)]">
                  {new Date(entry.createdAt).toLocaleString()} · actor{' '}
                  {entry.actorUserId?.slice(0, 8) ?? '—'}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
