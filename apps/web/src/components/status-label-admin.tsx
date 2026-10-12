'use client';

import { useState } from 'react';
import { Button, Input } from '@unison/ui';
import type { BoardColumn, StatusLabel } from '@unison/types';
import { getStatusLabels } from '@unison/shared';

export function StatusLabelAdmin({
  columns,
  onColumnsChange,
  onError,
}: {
  columns: BoardColumn[];
  onColumnsChange: (columns: BoardColumn[]) => void;
  onError: (msg: string | null) => void;
}) {
  const statusCols = columns.filter((c) => c.type === 'status' || c.type === 'priority');
  const [columnId, setColumnId] = useState(statusCols[0]?.id ?? '');
  const column = statusCols.find((c) => c.id === columnId) ?? statusCols[0];
  const [labels, setLabels] = useState<StatusLabel[]>(() =>
    column ? getStatusLabels(column).map((l) => ({ ...l })) : [],
  );
  const [busy, setBusy] = useState(false);

  function selectColumn(id: string) {
    setColumnId(id);
    const col = statusCols.find((c) => c.id === id);
    if (col) setLabels(getStatusLabels(col).map((l) => ({ ...l })));
  }

  async function save() {
    if (!column) return;
    setBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/columns/${column.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...column.settings,
            labels,
            defaultLabelId: labels[0]?.id ?? column.settings.defaultLabelId,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'Failed to save labels');
        return;
      }
      onColumnsChange(columns.map((c) => (c.id === column.id ? data.column : c)));
    } finally {
      setBusy(false);
    }
  }

  if (!column) return null;

  return (
    <section
      className="space-y-3 rounded-lg border border-[var(--unison-border)] bg-[var(--unison-mist)]/30 p-3"
      aria-label="Status label admin"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-semibold">Column labels</h2>
        <select
          className="h-9 rounded-md border border-[var(--unison-border)] bg-transparent px-2 text-sm"
          value={column.id}
          onChange={(e) => selectColumn(e.target.value)}
          aria-label="Column for label admin"
        >
          {statusCols.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type})
            </option>
          ))}
        </select>
        <Button size="sm" disabled={busy} onClick={() => void save()}>
          Save labels
        </Button>
      </div>
      <div className="space-y-2">
        {labels.map((label, index) => (
          <div key={label.id} className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-[160px]"
              value={label.name}
              aria-label={`Label ${index + 1} name`}
              onChange={(e) =>
                setLabels((prev) =>
                  prev.map((l, i) => (i === index ? { ...l, name: e.target.value } : l)),
                )
              }
            />
            <input
              type="color"
              value={label.color}
              aria-label={`Label ${index + 1} color`}
              onChange={(e) =>
                setLabels((prev) =>
                  prev.map((l, i) => (i === index ? { ...l, color: e.target.value } : l)),
                )
              }
            />
            <code className="text-xs text-[var(--unison-muted)]">{label.id}</code>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          setLabels((prev) => [
            ...prev,
            {
              id: `custom_${Date.now()}`,
              name: 'New label',
              color: '#64748B',
            },
          ])
        }
      >
        Add label
      </Button>
    </section>
  );
}
