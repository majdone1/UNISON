'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Input } from '@unison/ui';

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  createdAt: string;
  acceptedAt?: string | null;
}

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('newhire@unison.demo');
  const [role, setRole] = useState('member');
  const [error, setError] = useState<string | null>(null);
  const [lastAcceptUrl, setLastAcceptUrl] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/invitations');
    const data = await res.json();
    setInvitations(data.invitations ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function invite() {
    setError(null);
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Invite failed');
      return;
    }
    setLastAcceptUrl(data.acceptUrl ?? null);
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold">Invitations</h1>
        <p className="text-[var(--unison-muted)]">
          Create invite tokens and accept them in the demo to grant org membership.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="max-w-sm"
          placeholder="email@company.com"
        />
        <select
          className="h-10 rounded-md border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-2 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="member">member</option>
          <option value="viewer">viewer</option>
          <option value="workspace_admin">workspace_admin</option>
          <option value="admin">admin</option>
          <option value="guest">guest</option>
        </select>
        <Button onClick={() => void invite()}>Send invite</Button>
      </div>
      {error && <p className="text-sm text-[var(--unison-coral)]">{error}</p>}
      {lastAcceptUrl && (
        <p className="text-sm text-[var(--unison-teal)]">
          Accept link:{' '}
          <Link className="underline" href={lastAcceptUrl}>
            {lastAcceptUrl}
          </Link>
        </p>
      )}

      <ul className="space-y-2">
        {invitations.map((inv) => (
          <li
            key={inv.id}
            className="flex items-center justify-between rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3"
          >
            <div>
              <div className="font-medium">{inv.email}</div>
              <div className="text-sm text-[var(--unison-muted)]">token ready</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{inv.role}</Badge>
              <Link
                className="text-sm underline"
                href={`/app/invitations/accept?token=${inv.token}`}
              >
                Accept
              </Link>
            </div>
          </li>
        ))}
        {invitations.length === 0 && (
          <li className="text-sm text-[var(--unison-muted)]">No pending invitations.</li>
        )}
      </ul>
    </div>
  );
}
