'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!orgName.trim() || orgName.trim().length < 2) {
      setError('Organization name must be at least 2 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName: orgName.trim() }),
      });
      const data = (await res.json()) as { error?: string; orgId?: string };
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setBusy(false);
        return;
      }
      router.replace('/app');
    } catch {
      setError('Network error. Please check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-16"
      style={{ background: 'linear-gradient(135deg, #0F0B2A 0%, #1A0F3C 50%, #0B1829 100%)' }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white"
              style={{ background: '#6C47FF' }}
            >
              K
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">KORDYVA</span>
          </div>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            Let's set up your workspace
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ background: '#FFFFFF' }}
        >
          <div className="mb-6">
            <h1 className="text-xl font-bold" style={{ color: '#1A1A2E' }}>
              Create your organization
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
              Your organization is your team's shared workspace in KORDYVA.
            </p>
          </div>

          {error && (
            <div
              className="mb-4 rounded-lg px-4 py-3 text-sm"
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="orgName" className="block text-sm font-medium" style={{ color: '#374151' }}>
                Organization name
              </label>
              <input
                id="orgName"
                type="text"
                autoComplete="organization"
                placeholder="Acme Inc."
                required
                minLength={2}
                maxLength={80}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={busy}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 disabled:opacity-50"
                style={{
                  borderColor: '#E5E7EB',
                  color: '#1A1A2E',
                  background: '#FFFFFF',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#6C47FF'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,71,255,0.15)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#6C47FF' }}
              disabled={busy}
            >
              {busy ? 'Creating…' : 'Create organization & continue →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs" style={{ color: '#64748B' }}>
          © 2026 Majd Asali · KORDYVA
        </p>
      </div>
    </main>
  );
}
