'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Button } from '@unison/ui';
import { useI18n } from '@/components/i18n-provider';
import type { BoardItem } from '@unison/types';

type BucketKey = 'today' | 'upcoming' | 'overdue' | 'completed' | 'all';

export default function MyWorkPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<BoardItem[]>([]);
  const [buckets, setBuckets] = useState<Record<string, BoardItem[]>>({});
  const [byBoard, setByBoard] = useState<
    Array<{ boardId: string; boardName: string; items: BoardItem[] }>
  >([]);
  const [active, setActive] = useState<BucketKey>('all');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/my-work')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to load');
        if (!cancelled) {
          setItems(data.items ?? []);
          setBuckets(data.buckets ?? {});
          setByBoard(data.byBoard ?? []);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible =
    active === 'all' ? items : (buckets[active] as BoardItem[] | undefined) ?? [];

  async function quickStatus(item: BoardItem, status: BoardItem['status']) {
    const res = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Update failed');
      return;
    }
    const refreshed = await fetch('/api/my-work').then((r) => r.json());
    setItems(refreshed.items ?? []);
    setBuckets(refreshed.buckets ?? {});
    setByBoard(refreshed.byBoard ?? []);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold">{t('mywork.title')}</h1>
        <p className="text-[var(--unison-muted)]">
          Assigned and watched work across boards you can access — edits sync to the original item.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="My Work buckets">
        {(
          [
            ['all', 'All'],
            ['today', 'Today'],
            ['upcoming', 'Upcoming'],
            ['overdue', 'Overdue'],
            ['completed', 'Completed'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            role="tab"
            aria-selected={active === key}
            variant={active === key ? 'primary' : 'secondary'}
            onClick={() => setActive(key)}
          >
            {label}{' '}
            <span className="opacity-70">
              ({key === 'all' ? items.length : (buckets[key]?.length ?? 0)})
            </span>
          </Button>
        ))}
      </div>

      {loading && <p className="text-[var(--unison-muted)]">{t('common.loading')}</p>}
      {error && <p className="text-sm text-[var(--unison-coral)]">{error}</p>}

      <div className="space-y-2" role="list">
        {!loading && visible.length === 0 ? (
          <p className="text-[var(--unison-muted)]">{t('common.empty')}</p>
        ) : (
          visible.map((item) => (
            <div
              key={item.id}
              role="listitem"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3"
            >
              <Link href={`/app/boards/${item.boardId}?item=${item.id}`} className="min-w-0 flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-[var(--unison-muted)]">
                  {item.dueDate
                    ? `Due ${new Date(item.dueDate).toLocaleDateString()}`
                    : 'No due date'}
                  {item.parentItemId ? ' · subitem' : ''}
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.status === 'stuck' ? 'danger' : 'neutral'}>{item.status}</Badge>
                <Badge tone="accent">{item.priority}</Badge>
                {item.status !== 'done' && (
                  <Button size="sm" variant="ghost" onClick={() => void quickStatus(item, 'done')}>
                    Mark done
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {byBoard.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">By board</h2>
          {byBoard.map((group) => (
            <div key={group.boardId}>
              <Link
                href={`/app/boards/${group.boardId}`}
                className="text-sm font-medium text-[var(--unison-teal)]"
              >
                {group.boardName} ({group.items.length})
              </Link>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
