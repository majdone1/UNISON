'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Input } from '@unison/ui';
import { useI18n } from '@/components/i18n-provider';
import type { Board, BoardItem, Comment } from '@unison/types';

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [widgets, setWidgets] = useState<Record<string, unknown> | null>(null);
  const [myWork, setMyWork] = useState<BoardItem[]>([]);
  const [activity, setActivity] = useState<
    Array<{ id: string; eventType: string; createdAt: string; payload: Record<string, unknown> }>
  >([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    boards: Board[];
    items: BoardItem[];
    comments?: Comment[];
  } | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch('/api/dashboard').then((r) => r.json()),
      fetch('/api/my-work').then((r) => r.json()),
      fetch('/api/activity').then((r) => r.json()),
    ]).then(([dash, work, act]) => {
      setStats(dash.stats ?? null);
      setWidgets(dash.widgets ?? null);
      setMyWork(work.items ?? []);
      setActivity(act.activity ?? []);
    });
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const handle = setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then(setResults);
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const statusDist = (widgets?.statusDistribution ?? {}) as Record<string, number>;
  const completion =
    stats && stats.totalItems
      ? Math.round(((stats.done ?? 0) / stats.totalItems) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold">{t('dashboard.title')}</h1>
        <p className="text-[var(--unison-muted)]">
          Widgets from authorized org data — no cross-board leakage for private boards.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" role="list">
        {[
          ['Boards', stats?.boards],
          ['Items', stats?.totalItems],
          ['Overdue', stats?.overdue],
          ['Hours (formula)', stats?.hoursTotal],
          ['Time logged (min)', widgets?.timeLoggedMinutes as number | undefined],
          ['Docs', widgets?.docs as number | undefined],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            role="listitem"
            className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4"
          >
            <div className="text-sm text-[var(--unison-muted)]">{label}</div>
            <div className="font-display mt-2 text-3xl font-bold">{value ?? '—'}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4"
          aria-labelledby="completion-heading"
        >
          <h2 id="completion-heading" className="font-display text-xl font-semibold">
            Status distribution
          </h2>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--unison-mist)]">
            <div
              className="h-full rounded-full bg-[var(--unison-teal)] transition-all"
              style={{ width: `${completion}%` }}
              role="progressbar"
              aria-valuenow={completion}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="mt-2 text-sm text-[var(--unison-muted)]">{completion}% done</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="danger">Stuck {statusDist.stuck ?? 0}</Badge>
            <Badge tone="warn">Working {statusDist.working ?? 0}</Badge>
            <Badge tone="success">Done {statusDist.done ?? 0}</Badge>
            <Badge>Not started {statusDist.notStarted ?? 0}</Badge>
            <Badge tone="accent">Overdue {Number(widgets?.overdue ?? 0)}</Badge>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">{t('mywork.title')}</h2>
            <Link href="/app/my-work" className="text-sm text-[var(--unison-teal)]">
              Open
            </Link>
          </div>
          <p className="mb-3 text-xs text-[var(--unison-muted)]">
            Today {Number(widgets?.myWorkToday ?? 0)} · Overdue{' '}
            {Number(widgets?.myWorkOverdue ?? 0)}
          </p>
          {myWork.length === 0 ? (
            <p className="text-sm text-[var(--unison-muted)]">{t('common.empty')}</p>
          ) : (
            myWork.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/app/boards/${item.boardId}?item=${item.id}`}
                className="flex items-center justify-between border-b border-[var(--unison-border)] py-2 text-sm last:border-b-0"
              >
                <span>{item.name}</span>
                <Badge>{item.status}</Badge>
              </Link>
            ))
          )}
        </section>
      </div>

      <section className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
        <h2 className="font-display mb-3 text-xl font-semibold">Automations & storage</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge>
            Enabled rules{' '}
            {String((widgets?.automations as { enabled?: number } | undefined)?.enabled ?? 0)}
          </Badge>
          <Badge>
            Runs{' '}
            {String((widgets?.automations as { runs?: number } | undefined)?.runs ?? 0)}
          </Badge>
          <Badge>Attachments {stats?.attachments ?? 0}</Badge>
          <Badge>
            Channels{' '}
            {String((widgets?.messages as { channels?: number } | undefined)?.channels ?? 0)}
          </Badge>
          <Link href="/app/messages" className="text-[var(--unison-teal)] underline">
            Messages
          </Link>
          <Link href="/app/docs" className="text-[var(--unison-teal)] underline">
            Docs
          </Link>
          <Link href="/app/settings/forms" className="text-[var(--unison-teal)] underline">
            Board forms
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
        <h2 className="font-display mb-3 text-xl font-semibold">{t('board.activity')}</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-[var(--unison-muted)]">{t('common.empty')}</p>
        ) : (
          activity.slice(0, 8).map((a) => (
            <div
              key={a.id}
              className="border-b border-[var(--unison-border)] py-2 text-sm last:border-b-0"
            >
              <span className="font-medium">{a.eventType}</span>
              <span className="ms-2 text-[var(--unison-muted)]">
                {new Date(a.createdAt).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Search</h2>
        <Input
          placeholder={t('dashboard.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-lg"
          aria-label="Search boards and items"
        />
        {results && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
              <h3 className="mb-2 font-medium">Boards</h3>
              {results.boards.length === 0 ? (
                <p className="text-sm text-[var(--unison-muted)]">No boards.</p>
              ) : (
                results.boards.map((b) => (
                  <Link key={b.id} href={`/app/boards/${b.id}`} className="block py-1 text-sm">
                    {b.name}
                  </Link>
                ))
              )}
            </div>
            <div className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
              <h3 className="mb-2 font-medium">Items</h3>
              {results.items.length === 0 ? (
                <p className="text-sm text-[var(--unison-muted)]">No items.</p>
              ) : (
                results.items.map((i) => (
                  <Link
                    key={i.id}
                    href={`/app/boards/${i.boardId}?item=${i.id}`}
                    className="block py-1 text-sm"
                  >
                    {i.name}
                  </Link>
                ))
              )}
            </div>
            <div className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
              <h3 className="mb-2 font-medium">Comments</h3>
              {(results.comments ?? []).length === 0 ? (
                <p className="text-sm text-[var(--unison-muted)]">No comments.</p>
              ) : (
                (results.comments ?? []).map((c) => (
                  <p key={c.id} className="py-1 text-sm text-[var(--unison-muted)]">
                    {c.body.slice(0, 80)}
                  </p>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
