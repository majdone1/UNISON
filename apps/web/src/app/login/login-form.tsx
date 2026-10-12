'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button, Input, UnisonWordmark } from '@unison/ui';

const MESSAGES: Record<string, string> = {
  config: 'Sign-in is not configured for this deployment. Contact your administrator.',
  callback: 'That sign-in link is invalid or has expired. Please try again.',
  no_org:
    'You are signed in, but your account has not been added to an organization yet. Ask an organization owner to invite you.',
};

/**
 * Maps Supabase Auth failures to an actionable message. `invalid_credentials` is identical for
 * unknown email and wrong password, so this never reveals whether an account exists.
 */
function describeSignInError(e: { code?: string; status?: number; message?: string }): string {
  switch (e.code) {
    case 'invalid_credentials':
      return 'Invalid email or password.';
    case 'email_not_confirmed':
      return 'This account is not confirmed yet. Confirm the user in Supabase (Authentication → Users).';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Wait a minute and try again.';
  }
  if (/api key/i.test(e.message ?? '')) {
    return 'Sign-in is misconfigured (invalid Supabase API key). Check the NEXT_PUBLIC_SUPABASE_* variables.';
  }
  if (e.status === undefined || e.status === 0 || e.status >= 500) {
    return 'Could not reach the sign-in service. Try again in a moment.';
  }
  return `Sign-in failed${e.code ? ` (${e.code})` : ''}. Please try again.`;
}

export function LoginForm({
  supabaseUrl,
  supabaseAnonKey,
  next,
  initialError,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  next: string;
  initialError?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? (MESSAGES[initialError] ?? 'Please sign in to continue.') : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const configured = Boolean(supabaseUrl && supabaseAnonKey) && initialError !== 'config';

  const client = () => createBrowserClient(supabaseUrl, supabaseAnonKey);

  async function signInWithPassword(event: FormEvent) {
    event.preventDefault();
    if (!configured) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: authError } = await client().auth.signInWithPassword({ email, password });
    if (authError) {
      setBusy(false);
      setError(describeSignInError(authError));
      return;
    }
    // Full navigation so the middleware sees the freshly written session cookies.
    window.location.assign(next);
  }

  async function sendMagicLink() {
    if (!configured) return;
    if (!email) {
      setError('Enter your email first.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: authError } = await client().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    // Same message for every client-side (4xx) outcome so the form never reveals which emails
    // have accounts; only server faults and rate limiting are surfaced.
    if (authError && ((authError.status ?? 500) >= 500 || authError.status === 429)) {
      setError('Could not send the sign-in link. Please try again.');
      return;
    }
    setNotice('If an account exists for that email, a sign-in link is on its way.');
  }

  async function signOut() {
    setBusy(true);
    await client().auth.signOut();
    window.location.assign('/login');
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16 text-[var(--unison-mist)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--unison-hero-glow)' }}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md space-y-6">
        <Link href="/" className="block">
          <UnisonWordmark className="text-[var(--unison-mist)]" />
        </Link>
        <div className="space-y-5 rounded-2xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-6 text-[var(--unison-text)] shadow-xl">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight">Sign in</h1>
            <p className="text-sm text-[var(--unison-muted)]">Work in concert with your team.</p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-[var(--unison-coral)] px-3 py-2 text-sm"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="rounded-md border border-[var(--unison-teal)] px-3 py-2 text-sm"
            >
              {notice}
            </p>
          )}

          <form onSubmit={signInWithPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!configured}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!configured}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !configured}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => void sendMagicLink()}
            disabled={busy || !configured}
          >
            Email me a sign-in link
          </Button>

          {initialError === 'no_org' && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => void signOut()}
              disabled={busy}
            >
              Sign out
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
