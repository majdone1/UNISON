'use client';

import { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button, Input } from '@unison/ui';

const MESSAGES: Record<string, string> = {
  config: 'Sign-in is not configured for this deployment. Contact your administrator.',
  callback: 'That sign-in link is invalid or has expired. Please try again.',
  no_org:
    'You are signed in, but your account has not been added to an organization yet. Ask an organization owner to invite you.',
};

function describeSignInError(e: { code?: string; status?: number; message?: string }): string {
  switch (e.code) {
    case 'invalid_credentials':
      return 'Invalid email or password.';
    case 'email_not_confirmed':
      return 'Please check your email and confirm your account before signing in.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Too many attempts. Wait a minute and try again.';
    case 'user_already_exists':
      return 'An account already exists for this email. Sign in instead.';
  }
  if (/api key/i.test(e.message ?? '')) {
    return 'Sign-in is misconfigured (invalid Supabase API key).';
  }
  if (e.status === undefined || e.status === 0 || e.status >= 500) {
    return 'Could not reach the sign-in service. Try again in a moment.';
  }
  return `Authentication failed${e.code ? ` (${e.code})` : ''}. Please try again.`;
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
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError ? (MESSAGES[initialError] ?? 'Please sign in to continue.') : null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const configured = Boolean(supabaseUrl && supabaseAnonKey) && initialError !== 'config';

  const client = () => createBrowserClient(supabaseUrl, supabaseAnonKey);

  function switchMode(m: 'signin' | 'signup') {
    setMode(m);
    setError(null);
    setNotice(null);
  }

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
    window.location.assign(next);
  }

  async function signUp(event: FormEvent) {
    event.preventDefault();
    if (!configured) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: authError } = await client().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0] },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (authError) {
      setError(describeSignInError(authError));
      return;
    }
    setNotice('Account created! Check your email to confirm your address, then sign in.');
    setMode('signin');
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
            Work management for modern teams
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ background: '#FFFFFF' }}
        >
          {/* Tabs */}
          <div
            className="mb-6 flex rounded-lg p-1"
            style={{ background: '#F3F4F6' }}
          >
            <button
              className="flex-1 rounded-md py-2 text-sm font-medium transition-all"
              style={
                mode === 'signin'
                  ? { background: '#FFFFFF', color: '#1A1A2E', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { color: '#6B7280' }
              }
              onClick={() => switchMode('signin')}
            >
              Sign in
            </button>
            <button
              className="flex-1 rounded-md py-2 text-sm font-medium transition-all"
              style={
                mode === 'signup'
                  ? { background: '#FFFFFF', color: '#1A1A2E', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                  : { color: '#6B7280' }
              }
              onClick={() => switchMode('signup')}
            >
              Create account
            </button>
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
          {notice && (
            <div
              className="mb-4 rounded-lg px-4 py-3 text-sm"
              style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}
              role="status"
            >
              {notice}
            </div>
          )}

          {mode === 'signin' ? (
            <form onSubmit={signInWithPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium" style={{ color: '#374151' }}>
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!configured}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium" style={{ color: '#374151' }}>
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!configured}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#6C47FF' }}
                disabled={busy || !configured}
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={signUp} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="signup-name" className="block text-sm font-medium" style={{ color: '#374151' }}>
                  Full name
                </label>
                <Input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Majd Asali"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!configured}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="signup-email" className="block text-sm font-medium" style={{ color: '#374151' }}>
                  Email
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!configured}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="signup-password" className="block text-sm font-medium" style={{ color: '#374151' }}>
                  Password
                </label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!configured}
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#6C47FF' }}
                disabled={busy || !configured}
              >
                {busy ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          {mode === 'signin' && (
            <div className="mt-4">
              <button
                className="w-full rounded-lg border py-2.5 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
                style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                onClick={() => void sendMagicLink()}
                disabled={busy || !configured}
              >
                Email me a sign-in link
              </button>
            </div>
          )}

          {initialError === 'no_org' && (
            <div className="mt-3">
              <button
                className="w-full rounded-lg py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                onClick={() => void signOut()}
                disabled={busy}
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs" style={{ color: '#64748B' }}>
          © 2026 Majd Asali · KORDYVA
        </p>
      </div>
    </main>
  );
}
