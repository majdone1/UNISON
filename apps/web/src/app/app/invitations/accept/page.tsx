'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@unison/ui';

function AcceptInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function accept() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Accept failed');
      return;
    }
    setDone(`Joined as ${data.membership.role} (${data.user.email})`);
    setTimeout(() => router.push('/app'), 800);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-16">
      <h1 className="font-display text-4xl font-bold">Accept invitation</h1>
      <p className="text-[var(--unison-muted)]">
        Token from the invite email (demo: generated in Settings → Invitations).
      </p>
      <code className="block break-all rounded-md border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-3 text-xs">
        {token || 'missing token'}
      </code>
      {error && <p className="text-sm text-[var(--unison-coral)]">{error}</p>}
      {done && <p className="text-sm text-[var(--unison-teal)]">{done}</p>}
      <Button disabled={!token || loading} onClick={() => void accept()}>
        {loading ? 'Accepting…' : 'Accept & join org'}
      </Button>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<p className="p-8">Loading invitation…</p>}>
      <AcceptInner />
    </Suspense>
  );
}
