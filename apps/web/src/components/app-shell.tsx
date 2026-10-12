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
        'group flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150',
        active
          ? 'text-white'
          : 'hover:bg-[#3D3F56]',
      )}
      style={
        active
          ? { background: 'rgba(255,255,255,0.12)', color: '#FFFFFF' }
          : { color: '#D0D4E4' }
      }
    >
      <Icon
        d={icons[iconKey]}
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          active ? 'text-white' : 'text-[#9295A4] group-hover:text-[#D0D4E4]',
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
      className="min-h-screen text-[#323338]"
      dir={dir}
      style={{
        background: '#F5F6F8',
        // ── KORDYVA / Monday-style design tokens ──────────────────────────
        ['--kordyva-bg' as string]:                '#F5F6F8',
        ['--kordyva-text' as string]:              '#323338',
        ['--kordyva-sidebar-bg' as string]:        '#2B2D42',
        ['--kordyva-sidebar-border' as string]:    '#3D3F56',
        ['--kordyva-accent' as string]:            '#0073EA',
        ['--kordyva-accent-soft' as string]:       '#E8F0FE',
        ['--kordyva-nav-text' as string]:          '#D0D4E4',
        ['--kordyva-nav-text-active' as string]:   '#FFFFFF',
        ['--kordyva-nav-icon' as string]:          '#9295A4',
        ['--kordyva-nav-hover' as string]:         '#3D3F56',
        ['--kordyva-surface' as string]:           '#FFFFFF',
        ['--kordyva-surface-2' as string]:         '#F5F6F8',
        ['--kordyva-border' as string]:            '#E6E9EF',
        ['--kordyva-muted' as string]:             '#676879',
        ['--kordyva-section-label' as string]:     '#9295A4',
      } as React.CSSProperties}
    >
      <div className="flex min-h-screen">
        {/* ── Monday-style dark sidebar ───────────────────────────────────── */}
        <aside
          className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col overflow-y-auto"
          style={{
            background: '#2B2D42',
            borderRight: '1px solid #3D3F56',
          }}
        >
          {/* Logo + workspace header */}
          <div
            className="flex h-14 items-center gap-2.5 px-4"
            style={{ borderBottom: '1px solid #3D3F56' }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ background: '#6C47FF' }}
            >
              K
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">KORDYVA</p>
              {data && (
                <p className="truncate text-xs" style={{ color: '#9295A4' }}>
                  {data.session.org.name}
                </p>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="px-3 py-2">
            <div
              className="flex h-8 items-center gap-2 rounded-md px-3"
              style={{ background: '#3D3F56' }}
            >
              <svg className="h-3.5 w-3.5 shrink-0" style={{ color: '#9295A4' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs" style={{ color: '#9295A4' }}>Search</span>
            </div>
          </div>

          {/* Primary nav */}
          <nav className="flex flex-1 flex-col gap-0.5 px-2 py-1">
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
                style={{ color: '#9295A4' }}
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
                  style={{ color: '#9295A4' }}
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
          <div className="px-3 py-2" style={{ borderTop: '1px solid #3D3F56' }}>
            <select
              id="locale"
              className="h-7 w-full rounded px-2 text-xs"
              style={{
                background: '#3D3F56',
                border: 'none',
                color: '#9295A4',
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
              className="flex items-center gap-2.5 px-3 py-3"
              style={{ borderTop: '1px solid #3D3F56' }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: '#6C47FF' }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {data.session.user.displayName}
                </p>
                <p className="truncate text-xs" style={{ color: '#9295A4' }}>
                  {data.entitlements.planId}
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
          {/* Top bar — Monday-style white header */}
          <header
            className="sticky top-0 z-10 flex h-14 items-center justify-between border-b px-6"
            style={{
              background: '#FFFFFF',
              borderColor: '#E6E9EF',
            }}
          >
            <div className="flex items-center gap-3">
              {/* Page title placeholder */}
              <span className="text-base font-semibold text-[#323338]">
                {data?.session.org.name ?? 'KORDYVA'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {data?.impersonating && <Badge tone="warn">Impersonating</Badge>}
              {/* Notification bell */}
              <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F5F6F8] transition-colors">
                <svg className="h-4.5 w-4.5" style={{ color: '#676879' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              {/* User avatar */}
              {data && (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white cursor-pointer"
                  style={{ background: '#6C47FF' }}
                  title={data.session.user.email}
                >
                  {initials}
                </div>
              )}
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
