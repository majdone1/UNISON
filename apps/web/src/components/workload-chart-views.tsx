'use client';

import { useMemo } from 'react';
import { Badge } from '@unison/ui';
import type { BoardItem } from '@unison/types';

type Member = {
  userId: string;
  user: { id: string; displayName: string; email: string };
};

const STATUS_ORDER = ['not_started', 'working', 'stuck', 'done', 'cancelled'] as const;
const STATUS_COLORS: Record<string, string> = {
  not_started: '#94A3B8',
  working: '#0E7490',
  stuck: '#E86F4A',
  done: '#1F6F6A',
  cancelled: '#64748B',
};

export function WorkloadView({
  items,
  members,
  onSelectItem,
}: {
  items: BoardItem[];
  members: Member[];
  onSelectItem: (id: string) => void;
}) {
  const rows = useMemo(() => {
    const byUser = new Map<string, BoardItem[]>();
    const unassigned: BoardItem[] = [];
    for (const item of items) {
      if (!item.assigneeIds.length) {
        unassigned.push(item);
        continue;
      }
      for (const uid of item.assigneeIds) {
        const list = byUser.get(uid) ?? [];
        list.push(item);
        byUser.set(uid, list);
      }
    }
    const named = members
      .filter((m) => byUser.has(m.userId))
      .map((m) => ({
        key: m.userId,
        label: m.user.displayName,
        items: byUser.get(m.userId) ?? [],
      }));
    if (unassigned.length) {
      named.push({ key: 'unassigned', label: 'Unassigned', items: unassigned });
    }
    return named.sort((a, b) => b.items.length - a.items.length);
  }, [items, members]);

  const maxCount = Math.max(1, ...rows.map((r) => r.items.length));

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-6 text-sm text-[var(--unison-muted)]">
        No assigned items in this view.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
      <p className="text-sm text-[var(--unison-muted)]">
        Workload by assignee — open bars show item load from authorized board data.
      </p>
      {rows.map((row) => {
        const width = Math.max(8, (row.items.length / maxCount) * 100);
        const open = row.items.filter((i) => i.status !== 'done' && i.status !== 'cancelled');
        return (
          <div key={row.key} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-[140px] font-medium">{row.label}</span>
              <Badge>
                {row.items.length} item{row.items.length === 1 ? '' : 's'}
              </Badge>
              <Badge tone="warn">{open.length} open</Badge>
            </div>
            <div className="relative h-9 rounded-md bg-[var(--unison-mist)]">
              <button
                type="button"
                className="absolute inset-y-1 left-1 rounded-md bg-[var(--unison-teal)] text-left transition-[width]"
                style={{ width: `calc(${width}% - 0.25rem)` }}
                onClick={() => {
                  const first = row.items[0];
                  if (first) onSelectItem(first.id);
                }}
                aria-label={`${row.label} workload`}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {row.items.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item.id)}
                  className="rounded-md border border-[var(--unison-border)] px-2 py-0.5 text-xs hover:bg-[var(--unison-mist)]"
                >
                  {item.name}
                </button>
              ))}
              {row.items.length > 8 && (
                <span className="text-xs text-[var(--unison-muted)]">
                  +{row.items.length - 8} more
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChartView({
  items,
  onSelectItem,
}: {
  items: BoardItem[];
  onSelectItem: (id: string) => void;
}) {
  const buckets = useMemo(() => {
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<string, number>;
    for (const item of items) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return STATUS_ORDER.map((status) => ({
      status,
      count: counts[status] ?? 0,
      sample: items.find((i) => i.status === status),
    }));
  }, [items]);

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = items.length;

  return (
    <div className="space-y-4 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
      <p className="text-sm text-[var(--unison-muted)]">
        Status distribution for {total} filtered item{total === 1 ? '' : 's'}.
      </p>
      <div className="flex h-48 items-end gap-3 px-2">
        {buckets.map((b) => {
          const height = b.count === 0 ? 4 : Math.max(12, (b.count / max) * 100);
          return (
            <button
              key={b.status}
              type="button"
              className="group flex flex-1 flex-col items-center gap-2"
              onClick={() => {
                if (b.sample) onSelectItem(b.sample.id);
              }}
              aria-label={`${b.status.replace('_', ' ')}: ${b.count}`}
            >
              <span className="text-xs font-medium text-[var(--unison-slate)]">{b.count}</span>
              <div
                className="w-full max-w-[56px] rounded-t-md transition-opacity group-hover:opacity-90"
                style={{
                  height: `${height}%`,
                  background: STATUS_COLORS[b.status] ?? '#94A3B8',
                  minHeight: b.count === 0 ? 4 : undefined,
                }}
              />
              <span className="text-center text-[10px] capitalize text-[var(--unison-muted)]">
                {b.status.replace('_', ' ')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
