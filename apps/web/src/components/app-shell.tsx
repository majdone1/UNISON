'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UnisonWordmark, Badge, Button, cn } from '@unison/ui';
import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import type { Locale } from '@unison/types';

interface SessionPayload {
  session: {
    user: { id: string; displayName: string; email: string };
    org: { name: string; slug: string; status: string };
    membership: { role: string };
    platformRole: string;
  };
  entitlements: { planId: string; isSuspended: boolean };
  impersonating: boolean;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, locale, setLocale, dir } = useI18n();
  const [data, setData] = useState<SessionPayload | null>(null);

  const links = [
    { href: '/app', label: t('nav.home') },
    { href: '/app/my-work', label: t('nav.myWork') },
    { href: '/app/boards', label: t('nav.boards') },
    { href: '/app/messages', label: t('nav.messages') },
    { href: '/app/docs', label: t('nav.docs') },
    { href: '/app/integrations', label: t('nav.integrations') },
    { href: '/app/notifications', label: t('nav.notifications') },
    { href: '/app/dashboard', label: t('nav.dashboard') },
    { href: '/app/settings/teams', label: t('nav.teams') },
    { href: '/app/settings/roles', label: t('nav.roles') },
    { href: '/app/settings/invitations', label: t('nav.invitations') },
    { href: '/app/settings/billing', label: t('nav.billing') },
    { href: '/app/settings/automations', label: t('nav.automations') },
    { href: '/app/settings/forms', label: 'Forms' },
    { href: '/app/platform', label: t('nav.admin') },
  ];

  useEffect(() => {
    void fetch('/api/session')
      .then((r) => {
        if (r.status === 401) {
          // Session expired mid-visit — send the user back to sign in.
          window.location.assign('/login');
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then(setData)
      .catch(() => setData(null));
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[var(--unison-surface)] text-[var(--unison-text)]" dir={dir}>
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="sticky top-0 flex h-screen w-64 flex-col border-e border-[var(--unison-border)] bg-[var(--unison-sand)]/70 px-4 py-6 backdrop-blur">
          <Link href="/" className="mb-8 px-2">
            <UnisonWordmark />
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition',
                  pathname === link.href ||
                    (link.href !== '/app' && pathname.startsWith(`${link.href}/`))
                    ? 'bg-[var(--unison-ocean)] text-[var(--unison-mist)]'
                    : 'text-[var(--unison-slate)] hover:bg-[var(--unison-mist)]',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mb-3 space-y-1 px-1">
            <label className="text-xs text-[var(--unison-muted)]" htmlFor="locale">
              {t('locale.label')}
            </label>
            <select
              id="locale"
              className="h-9 w-full rounded-md border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-2 text-sm"
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
              <option value="he">עברית</option>
            </select>
          </div>

          {data && (
            <div className="mt-auto space-y-2 rounded-md border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-3 text-sm">
              <div className="font-medium">{data.session.user.displayName}</div>
              <div className="text-[var(--unison-muted)]">{data.session.org.name}</div>
              <div className="flex flex-wrap gap-1">
                <Badge>{data.session.membership.role}</Badge>
                <Badge tone="accent">{data.entitlements.planId}</Badge>
                {data.impersonating && <Badge tone="warn">Impersonating</Badge>}
              </div>
              {data.impersonating && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    void fetch('/api/platform/impersonate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ stop: true }),
                    }).then(() => window.location.reload());
                  }}
                >
                  Stop impersonation
                </Button>
              )}
            </div>
          )}
        </aside>
        <main className="flex flex-1 flex-col px-6 py-8 md:px-10">
          <div className="flex-1">{children}</div>
          <footer className="mt-10 border-t border-[var(--unison-border)] pt-4 text-xs text-[var(--unison-muted)]">
            UNISON · By Majd Asali
          </footer>
        </main>
      </div>
    </div>
  );
}
