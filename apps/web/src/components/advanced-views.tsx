'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@unison/ui';
import type { BoardItem, ItemStatus } from '@unison/types';

const STATUSES: ItemStatus[] = ['not_started', 'working', 'stuck', 'done', 'cancelled'];

type Props = {
  items: BoardItem[];
  onSelectItem: (id: string) => void;
  onMoveStatus?: (itemId: string, status: ItemStatus) => void;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Month grid calendar backed by item due dates. */
export function CalendarMonthView({ items, onSelectItem }: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const pad = (first.getDay() + 6) % 7; // Monday-first
    const total = daysInMonth(cursor);
    const out: Array<{ date: Date | null; items: BoardItem[] }> = [];
    for (let i = 0; i < pad; i += 1) out.push({ date: null, items: [] });
    for (let day = 1; day <= total; day += 1) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      const key = date.toISOString().slice(0, 10);
      out.push({
        date,
        items: items.filter((it) => it.dueDate && it.dueDate.slice(0, 10) === key),
      });
    }
    return out;
  }, [cursor, items]);

  const label = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm hover:bg-[var(--unison-mist)]"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
          }
        >
          ←
        </button>
        <h3 className="text-sm font-semibold">{label}</h3>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm hover:bg-[var(--unison-mist)]"
          onClick={() =>
            setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
          }
        >
          →
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-[var(--unison-muted)]">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => (
          <div
            key={idx}
            className={`min-h-20 rounded-md border border-[var(--unison-border)] p-1 ${
              cell.date ? 'bg-[var(--unison-sand)]/40' : 'bg-transparent opacity-40'
            }`}
          >
            {cell.date ? (
              <>
                <div className="text-[10px] text-[var(--unison-muted)]">{cell.date.getDate()}</div>
                <div className="mt-1 space-y-0.5">
                  {cell.items.slice(0, 3).map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => onSelectItem(it.id)}
                      className="block w-full truncate rounded bg-[var(--unison-ocean)] px-1 py-0.5 text-start text-[10px] text-[var(--unison-mist)]"
                    >
                      {it.name}
                    </button>
                  ))}
                  {cell.items.length > 3 ? (
                    <div className="text-[10px] text-[var(--unison-muted)]">
                      +{cell.items.length - 3}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Kanban with HTML5 drag-and-drop status moves. */
export function KanbanBoardView({ items, onSelectItem, onMoveStatus }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);

  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
      {STATUSES.map((status) => (
        <div
          key={status}
          className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-3"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragging && onMoveStatus) onMoveStatus(dragging, status);
            setDragging(null);
          }}
        >
          <div className="mb-3 text-sm font-medium capitalize">{status.replace('_', ' ')}</div>
          <div className="space-y-2">
            {items
              .filter((i) => i.status === status)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  draggable={Boolean(onMoveStatus)}
                  onDragStart={() => setDragging(item.id)}
                  onClick={() => onSelectItem(item.id)}
                  className="w-full cursor-grab rounded-lg border border-[var(--unison-border)] bg-[var(--unison-sand)] px-3 py-2 text-left text-sm active:cursor-grabbing"
                >
                  {item.name}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Simple Gantt/date-axis bars from created→due (or progress fallback). */
export function GanttView({ items, onSelectItem }: Props) {
  const range = useMemo(() => {
    const dates = items
      .flatMap((i) => [i.createdAt, i.dueDate].filter(Boolean) as string[])
      .map((d) => new Date(d).getTime())
      .filter((n) => Number.isFinite(n));
    if (!dates.length) {
      const now = Date.now();
      return { min: now - 7 * 86400000, max: now + 14 * 86400000 };
    }
    return { min: Math.min(...dates), max: Math.max(...dates) + 86400000 };
  }, [items]);
  const span = Math.max(1, range.max - range.min);

  return (
    <div className="space-y-2 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
      {items.length === 0 ? (
        <p className="text-sm text-[var(--unison-muted)]">No items for Gantt.</p>
      ) : (
        items.map((item) => {
          const start = new Date(item.createdAt).getTime();
          const end = item.dueDate
            ? new Date(item.dueDate).getTime()
            : start + Math.max(1, item.progress) * 864000;
          const left = ((Math.max(start, range.min) - range.min) / span) * 100;
          const width = Math.max(4, ((Math.min(end, range.max) - Math.max(start, range.min)) / span) * 100);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item.id)}
              className="grid w-full grid-cols-[160px_1fr] items-center gap-3 text-left"
            >
              <span className="truncate text-sm font-medium">{item.name}</span>
              <div className="relative h-8 rounded-md bg-[var(--unison-mist)]">
                <div
                  className="absolute inset-y-1 rounded-md bg-[var(--unison-teal)]"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

/** Pivot-style status × priority counts from authorized items. */
export function PivotView({ items, onSelectItem }: Props) {
  const priorities = ['none', 'low', 'medium', 'high', 'urgent'] as const;
  const matrix = useMemo(() => {
    const m: Record<string, Record<string, BoardItem[]>> = {};
    for (const s of STATUSES) {
      m[s] = {};
      for (const p of priorities) m[s]![p] = [];
    }
    for (const it of items) {
      m[it.status]?.[it.priority]?.push(it);
    }
    return m;
  }, [items]);

  return (
    <div className="overflow-auto rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-[var(--unison-border)] p-2 text-start">Status \\ Priority</th>
            {priorities.map((p) => (
              <th key={p} className="border-b border-[var(--unison-border)] p-2 capitalize">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STATUSES.map((s) => (
            <tr key={s}>
              <td className="border-b border-[var(--unison-border)] p-2 capitalize">
                {s.replace('_', ' ')}
              </td>
              {priorities.map((p) => {
                const cell = matrix[s]?.[p] ?? [];
                return (
                  <td key={p} className="border-b border-[var(--unison-border)] p-2 text-center">
                    {cell.length ? (
                      <button
                        type="button"
                        className="underline"
                        onClick={() => onSelectItem(cell[0]!.id)}
                        title={cell.map((c) => c.name).join(', ')}
                      >
                        {cell.length}
                      </button>
                    ) : (
                      <span className="text-[var(--unison-muted)]">0</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Map view from location column / values.location (lat,lng or label). */
export function MapView({ items, onSelectItem }: Props) {
  const located = items.filter((i) => {
    const loc = i.values.location ?? i.values.geo;
    return typeof loc === 'string' && loc.trim().length > 0;
  });

  return (
    <div className="space-y-3 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
      <p className="text-sm text-[var(--unison-muted)]">
        Map pins from item location values (no third-party map tiles in demo).
      </p>
      {located.length === 0 ? (
        <p className="text-sm text-[var(--unison-muted)]">No located items.</p>
      ) : (
        <ul className="space-y-2">
          {located.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectItem(item.id)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-[var(--unison-mist)]"
              >
                <span>{item.name}</span>
                <Badge>{String(item.values.location ?? item.values.geo)}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
