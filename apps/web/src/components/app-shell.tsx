'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge, Button, cn } from '@unison/ui';
import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import type { Locale } from '@unison/types';

// ─── Inline SVG icons (no external dependency) ───────────────────────────────
function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4 shrink-0', className)}
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const icons = {
  home:         'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  myWork:       'M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  boards:       'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  messages:     'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  docs:         'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  integrations: 'M10 2h4 M12 14v-4 M4 13.5A8.5 8.5 0 1020 13.5M12 18h.01',
  notifications:'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0',
  dashboard:    'M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v6H3z',
  teams:        'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  roles:        'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  invitations:  'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.08 2.18 2 2 0 012.08 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.27 7.55a16 16 0 006.18 6.18l1.28-1.28a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z',
  billing:      'M20 12V22H4V12 M22 7H2v5h20V7z M12 22V7 M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z',
  automations:  'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  forms:        'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  admin:        'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z M12 6v6l4 2',
} as const;

type NavKey = keyof typeof icons;

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

const links: { href: string; labelKey: string; iconKey: NavKey }[] = [
  { href: '/app',                    labelKey: 'nav.home',         iconKey: 'home' },
  { href: '/app/my-work',            labelKey: 'nav.myWork',       iconKey: 'myWork' },
  { href: '/app/boards',             labelKey: 'nav.boards',       iconKey: 'boards' },
  { href: '/app/messages',           labelKey: 'nav.messages',     iconKey: 'messages' },
  { href: '/app/docs',               labelKey: 'nav.docs',         iconKey: 'docs' },
  { href: '/app/dashboard',          labelKey: 'nav.dashboard',    iconKey: 'dashboard' },
  { href: '/app/integrations',       labelKey: 'nav.integrations', iconKey: 'integrations' },
  { href: '/app/notifications',      labelKey: 'nav.notifications',iconKey: 'notifications' },
];

const settingsLinks: { href: string; label: string; iconKey: NavKey }[] = [
  { href: '/app/settings/teams',       label: 'Teams',       iconKey: 'teams' },
  { href: '/app/settings/roles',       label: 'Roles',       iconKey: 'roles' },
  { href: '/app/settings/invitations', label: 'Invitations', iconKey: 'invitations' },
  { href: '/app/settings/billing',     label: 'Billing',     iconKey: 'billing' },
  { href: '/app/settings/automations', label: 'Automations', iconKey: 'automations' },
  { href: '/app/settings/forms',       label: 'Forms',       iconKey: 'forms' },
  { href: '/app/platform',             label: 'Admin',       iconKey: 'admin' },
];

function NavItem({
  href,
  label,
  iconKey,
  pathname,
}: {
  href: string;
  label: string;
  iconKey: NavKey;
  pathname: string;
}) {
  const active =
    href === '/app'
      ? pathname === '/app'
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        active
          ? 'bg-[var(--kordyva-accent)] text-white shadow-sm'
          : 'text-[var(--kordyva-nav-text)] hover:bg-[var(--kordyva-nav-hover)] hover:text-[var(--kordyva-nav-text-active)]',
      )}
    >
      <Icon
        d={icons[iconKey]}
        className={cn(
          'transition-colors',
          active ? 'text-white' : 'text-[var(--kordyva-nav-icon)] group-hover:text-[var(--kordyva-nav-text-active)]',
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, locale, setLocale, dir } = useI18n();
  const [data, setData] = useState<SessionPayload | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(
    pathname.startsWith('/app/settings') || pathname.startsWith('/app/platform'),
  );

  useEffect(() => {
    void fetch('/api/session')
      .then((r) => {
        if (r.status === 401) {
          window.location.assign('/login');
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then(setData)
      .catch(() => setData(null));
  }, [pathname]);

  // Avatar initials
  const initials = data?.session.user.displayName
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '??';

  return (
    <div
      className="min-h-screen bg-[var(--kordyva-bg)] text-[var(--kordyva-text)]"
      dir={dir}
      style={{
        // ── KORDYVA design tokens ──────────────────────────────────────────
        ['--kordyva-bg' as string]:                '#F6F7FB',
        ['--kordyva-text' as string]:              '#1A1A2E',
        ['--kordyva-sidebar-bg' as string]:        '#FFFFFF',
        ['--kordyva-sidebar-border' as string]:    '#E5E7EB',
        ['--kordyva-accent' as string]:            '#6C47FF',
        ['--kordyva-accent-soft' as string]:       '#EDE9FF',
        ['--kordyva-nav-text' as string]:          '#4B5563',
        ['--kordyva-nav-text-active' as string]:   '#1A1A2E',
        ['--kordyva-nav-icon' as string]:          '#9CA3AF',
        ['--kordyva-nav-hover' as string]:         '#F3F4F6',
        ['--kordyva-surface' as string]:           '#FFFFFF',
        ['--kordyva-surface-2' as string]:         '#F9FAFB',
        ['--kordyva-border' as string]:            '#E5E7EB',
        ['--kordyva-muted' as string]:             '#6B7280',
        ['--kordyva-section-label' as string]:     '#9CA3AF',
      } as React.CSSProperties}
    >
      <div className="flex min-h-screen">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside
          className="sticky top-0 flex h-screen w-[240px] shrink-0 flex-col overflow-y-auto border-e"
          style={{
            background: 'var(--kordyva-sidebar-bg)',
            borderColor: 'var(--kordyva-sidebar-border)',
          }}
        >
          {/* Logo */}
          <div className="flex h-14 items-center gap-2 border-b px-5" style={{ borderColor: 'var(--kordyva-sidebar-border)' }}>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: 'var(--kordyva-accent)' }}
            >
              K
            </div>
            <span className="text-base font-bold tracking-tight" style={{ color: 'var(--kordyva-text)' }}>
              KORDYVA
            </span>
          </div>

          {/* Org name */}
          {data && (
            <div className="border-b px-5 py-3" style={{ borderColor: 'var(--kordyva-sidebar-border)' }}>
              <p className="truncate text-xs font-semibold" style={{ color: 'var(--kordyva-section-label)' }}>
                {data.session.org.name}
              </p>
            </div>
          )}

          {/* Primary nav */}
          <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3">
            {links.map((link) => (
              <NavItem
                key={link.href}
                href={link.href}
                label={t(link.labelKey as Parameters<typeof t>[0])}
                iconKey={link.iconKey}
                pathname={pathname}
              />
            ))}

            {/* Settings section */}
            <div className="mt-3">
              <button
                className="mb-1 flex w-full items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--kordyva-section-label)' }}
                onClick={() => setSettingsOpen((v) => !v)}
              >
                <span>Settings</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn('h-3 w-3 transition-transform', settingsOpen ? 'rotate-90' : '')}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              {settingsOpen &&
                settingsLinks.map((link) => (
                  <NavItem
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    iconKey={link.iconKey}
                    pathname={pathname}
                  />
                ))}
            </div>
          </nav>

          {/* Language picker */}
          <div className="border-t px-4 py-3" style={{ borderColor: 'var(--kordyva-sidebar-border)' }}>
            <select
              id="locale"
              className="h-8 w-full rounded-md border px-2 text-xs"
              style={{
                background: 'var(--kordyva-surface-2)',
                borderColor: 'var(--kordyva-border)',
                color: 'var(--kordyva-muted)',
              }}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="en">🌐 English</option>
              <option value="ar">🌐 العربية</option>
              <option value="he">🌐 עברית</option>
            </select>
          </div>

          {/* User profile */}
          {data && (
            <div
              className="flex items-center gap-3 border-t px-4 py-3"
              style={{ borderColor: 'var(--kordyva-sidebar-border)' }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: 'var(--kordyva-accent)' }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold" style={{ color: 'var(--kordyva-text)' }}>
                  {data.session.user.displayName}
                </p>
                <p className="truncate text-xs" style={{ color: 'var(--kordyva-muted)' }}>
                  {data.entitlements.planId} plan
                </p>
              </div>
              {data.impersonating && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    void fetch('/api/platform/impersonate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ stop: true }),
                    }).then(() => window.location.reload());
                  }}
                >
                  Stop
                </Button>
              )}
            </div>
          )}
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header
            className="sticky top-0 z-10 flex h-14 items-center justify-between border-b px-6"
            style={{
              background: 'var(--kordyva-surface)',
              borderColor: 'var(--kordyva-border)',
            }}
          >
            <div className="flex items-center gap-2">
              {/* Breadcrumb placeholder — pages can override via portal */}
              <span className="text-sm font-medium" style={{ color: 'var(--kordyva-muted)' }}>
                {data?.session.org.name ?? 'KORDYVA'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {data?.impersonating && <Badge tone="warn">Impersonating</Badge>}
              {data && (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: 'var(--kordyva-accent)' }}
                >
                  {initials}
                </div>
              )}
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
