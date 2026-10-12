'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button, Input, cn } from '@unison/ui';
import { getCellValue, getStatusLabels, summarizeColumn } from '@unison/shared';
import type { BoardColumn, BoardGroup, BoardItem, ColumnType } from '@unison/types';

type Member = {
  userId: string;
  user: { id: string; displayName: string; email: string };
};

const ADDABLE_TYPES: ColumnType[] = [
  'text',
  'long_text',
  'number',
  'currency',
  'percentage',
  'checkbox',
  'dropdown',
  'date',
  'tags',
  'link',
  'email',
  'phone',
  'rating',
  'progress',
  'vote',
  'color',
  'week',
  'country',
  'time_tracking',
];

function formatCell(
  column: BoardColumn,
  value: unknown,
  members: Member[],
  items: BoardItem[] = [],
  relationNames: Record<string, string> = {},
): string {
  if (value == null || value === '') return '';
  if (column.type === 'people' || column.type === 'team') {
    const ids = Array.isArray(value) ? value.map(String) : [];
    return ids
      .map((id) => members.find((m) => m.userId === id)?.user.displayName ?? id.slice(0, 6))
      .join(', ');
  }
  if (column.type === 'relation' || column.type === 'dependency') {
    const ids = Array.isArray(value) ? value.map(String) : [];
    return ids
      .map(
        (id) =>
          relationNames[id] ?? items.find((i) => i.id === id)?.name ?? id.slice(0, 6),
      )
      .join(', ');
  }
  if (column.type === 'checkbox') return value ? '✓' : '';
  if (column.type === 'tags' && Array.isArray(value)) return value.join(', ');
  if (column.type === 'date' || column.type === 'datetime') {
    try {
      return new Date(String(value)).toLocaleDateString();
    } catch {
      return String(value);
    }
  }
  if (column.type === 'status' || column.type === 'priority' || column.type === 'dropdown') {
    const labels = getStatusLabels(column);
    const opts = column.settings.options;
    const hit =
      labels.find((l) => l.id === value) ?? opts?.find((o) => o.id === value);
    return hit?.name ?? String(value);
  }
  return String(value);
}

export function BoardGrid({
  boardId,
  groups,
  columns,
  items,
  members,
  selectedId,
  selectedIds,
  canEditStructure,
  canEditCells = true,
  onSelectItem,
  onSelectIds,
  onItemsChange,
  onColumnsChange,
  onError,
}: {
  boardId: string;
  groups: BoardGroup[];
  columns: BoardColumn[];
  items: BoardItem[];
  members: Member[];
  selectedId: string | null;
  selectedIds: string[];
  canEditStructure: boolean;
  canEditCells?: boolean;
  onSelectItem: (id: string) => void;
  onSelectIds: (ids: string[]) => void;
  onItemsChange: (items: BoardItem[]) => void;
  onColumnsChange: (columns: BoardColumn[]) => void;
  onError: (message: string | null) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<{ columnId: string; dir: 'asc' | 'desc' } | null>(null);
  const [filter, setFilter] = useState('');
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragColId, setDragColId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ itemId: string; columnId: string } | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<ColumnType>('text');
  const [newItemByGroup, setNewItemByGroup] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [relationCandidates, setRelationCandidates] = useState<
    Record<string, Array<{ id: string; name: string; boardName: string }>>
  >({});
  const [focusedCell, setFocusedCell] = useState<{
    itemId: string;
    columnId: string;
  } | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const clipboardRef = useRef('');
  const widthsLiveRef = useRef<Record<string, number>>({});
  const resizeRef = useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const visibleColumns = useMemo(
    () => columns.filter((c) => !c.isHidden).sort((a, b) => a.position - b.position),
    [columns],
  );

  useEffect(() => {
    setColumnWidths((prev) => {
      const next = { ...prev };
      for (const col of columns) {
        if (next[col.id] == null) next[col.id] = col.width || 140;
      }
      widthsLiveRef.current = next;
      return next;
    });
  }, [columns]);

  useEffect(() => {
    const relationCols = columns.filter(
      (c) => c.type === 'relation' || c.type === 'dependency',
    );
    if (!relationCols.length) return;
    let cancelled = false;
    void Promise.all(
      relationCols.map(async (col) => {
        const res = await fetch(`/api/columns/${col.id}/relation-candidates`);
        const data = await res.json().catch(() => ({ candidates: [] }));
        return [col.id, data.candidates ?? []] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setRelationCandidates(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [columns, boardId]);

  const relationNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const list of Object.values(relationCandidates)) {
      for (const c of list) map[c.id] = c.name;
    }
    return map;
  }, [relationCandidates]);

  const colWidth = useCallback(
    (col: BoardColumn) => columnWidths[col.id] ?? col.width ?? 140,
    [columnWidths],
  );

  const rootItems = useMemo(() => {
    let list = items.filter((i) => !i.parentItemId);
    const q = filter.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        if (item.name.toLowerCase().includes(q)) return true;
        return visibleColumns.some((col) =>
          formatCell(col, getCellValue(item, col), members, items, relationNames)
            .toLowerCase()
            .includes(q),
        );
      });
    }
    if (sort) {
      const col = columns.find((c) => c.id === sort.columnId);
      if (col) {
        list = [...list].sort((a, b) => {
          const av = getCellValue(a, col);
          const bv = getCellValue(b, col);
          const as = av == null ? '' : String(av);
          const bs = bv == null ? '' : String(bv);
          const cmp = as.localeCompare(bs, undefined, { numeric: true });
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return list;
  }, [items, filter, sort, columns, visibleColumns, members, relationNames]);

  type GridRow =
    | { kind: 'group'; group: BoardGroup; count: number }
    | { kind: 'item'; item: BoardItem; group: BoardGroup }
    | { kind: 'composer'; group: BoardGroup };

  const rows: GridRow[] = useMemo(() => {
    const out: GridRow[] = [];
    for (const group of [...groups].sort((a, b) => a.position - b.position)) {
      const groupItems = rootItems.filter((i) => i.groupId === group.id);
      out.push({ kind: 'group', group, count: groupItems.length });
      for (const item of groupItems) {
        out.push({ kind: 'item', item, group });
      }
      out.push({ kind: 'composer', group });
    }
    return out;
  }, [groups, rootItems]);

  const itemRows = useMemo(
    () => rows.filter((r): r is Extract<GridRow, { kind: 'item' }> => r.kind === 'item'),
    [rows],
  );

  const cellKeys = useMemo(
    () => ['__name__', ...visibleColumns.map((c) => c.id)],
    [visibleColumns],
  );

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.kind === 'group' ? 44 : 44),
    overscan: 12,
  });

  const nameWidth = 260;
  const selectWidth = 36;
  const totalWidth =
    selectWidth +
    nameWidth +
    visibleColumns.reduce((sum, c) => sum + colWidth(c), 0) +
    120;

  const patchLocalItem = useCallback(
    (next: BoardItem) => {
      onItemsChange(items.map((i) => (i.id === next.id ? next : i)));
    },
    [items, onItemsChange],
  );

  async function setCell(itemId: string, columnId: string, value: unknown) {
    setBusy(true);
    onError(null);
    try {
      const res = await fetch('/api/cells', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, columnId, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'CELL_UPDATE_FAILED');
        return;
      }
      patchLocalItem(data.item as BoardItem);
    } finally {
      setBusy(false);
      setEditing(null);
    }
  }

  async function persistName(item: BoardItem, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === item.name) {
      setEditing(null);
      return;
    }
    setBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'RENAME_FAILED');
        return;
      }
      patchLocalItem(data.item as BoardItem);
    } finally {
      setBusy(false);
      setEditing(null);
    }
  }

  async function createItem(groupId: string) {
    const name = (newItemByGroup[groupId] ?? '').trim();
    if (!name) return;
    setBusy(true);
    onError(null);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, groupId, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'CREATE_ITEM_FAILED');
        return;
      }
      onItemsChange([...items, data.item as BoardItem]);
      setNewItemByGroup((prev) => ({ ...prev, [groupId]: '' }));
    } finally {
      setBusy(false);
    }
  }

  async function addColumn() {
    if (!canEditStructure || !newColName.trim()) return;
    setBusy(true);
    onError(null);
    try {
      const res = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          name: newColName.trim(),
          type: newColType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'CREATE_COLUMN_FAILED');
        return;
      }
      onColumnsChange([...columns, data.column as BoardColumn]);
      setNewColName('');
    } finally {
      setBusy(false);
    }
  }

  async function reorderColumns(nextIds: string[]) {
    if (!canEditStructure) return;
    const res = await fetch('/api/columns', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId, ids: nextIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      onError(data.error ?? 'REORDER_COLUMNS_FAILED');
      return;
    }
    onColumnsChange(data.columns as BoardColumn[]);
  }

  async function onDropItem(targetId: string) {
    if (!dragItemId || dragItemId === targetId) return;
    const ordered = rootItems.map((i) => i.id);
    const from = ordered.indexOf(dragItemId);
    const to = ordered.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ordered.splice(from, 1);
    ordered.splice(to, 0, dragItemId);
    setDragItemId(null);
    const res = await fetch('/api/items/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ordered }),
    });
    if (!res.ok) {
      const data = await res.json();
      onError(data.error ?? 'REORDER_FAILED');
      return;
    }
    const byId = new Map(items.map((i) => [i.id, i]));
    onItemsChange(
      items.map((item) => {
        const idx = ordered.indexOf(item.id);
        return idx >= 0 ? { ...item, position: idx } : byId.get(item.id)!;
      }),
    );
  }

  function onDropColumn(targetId: string) {
    if (!dragColId || dragColId === targetId || !canEditStructure) return;
    const ids = visibleColumns.map((c) => c.id);
    const from = ids.indexOf(dragColId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragColId);
    setDragColId(null);
    void reorderColumns(ids);
  }

  function toggleSort(columnId: string) {
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) return { columnId, dir: 'asc' };
      if (prev.dir === 'asc') return { columnId, dir: 'desc' };
      return null;
    });
  }

  function moveFocus(deltaRow: number, deltaCol: number) {
    if (!focusedCell || itemRows.length === 0) return;
    const rowIdx = itemRows.findIndex((r) => r.item.id === focusedCell.itemId);
    const colIdx = cellKeys.indexOf(focusedCell.columnId);
    if (rowIdx < 0 || colIdx < 0) return;
    const nextRow = Math.max(0, Math.min(itemRows.length - 1, rowIdx + deltaRow));
    const nextCol = Math.max(0, Math.min(cellKeys.length - 1, colIdx + deltaCol));
    const nextItem = itemRows[nextRow]!.item;
    setFocusedCell({ itemId: nextItem.id, columnId: cellKeys[nextCol]! });
    onSelectItem(nextItem.id);
  }

  function readFocusedValue(): string {
    if (!focusedCell) return '';
    const item = items.find((i) => i.id === focusedCell.itemId);
    if (!item) return '';
    if (focusedCell.columnId === '__name__') return item.name;
    const col = columns.find((c) => c.id === focusedCell.columnId);
    if (!col) return '';
    return formatCell(col, getCellValue(item, col), members, items, relationNames);
  }

  async function pasteFocused(text: string) {
    if (!focusedCell || !text) return;
    const item = items.find((i) => i.id === focusedCell.itemId);
    if (!item) return;
    if (focusedCell.columnId === '__name__') {
      await persistName(item, text);
      return;
    }
    const col = columns.find((c) => c.id === focusedCell.columnId);
    if (!col || col.type === 'formula') return;
    let value: unknown = text;
    if (col.type === 'checkbox') value = /^(1|true|yes|✓)$/i.test(text.trim());
    else if (
      col.type === 'number' ||
      col.type === 'progress' ||
      col.type === 'rating' ||
      col.type === 'duration'
    ) {
      const n = Number(text);
      if (Number.isNaN(n)) return;
      value = n;
    }
    await setCell(item.id, col.id, value);
  }

  function beginResize(columnId: string, clientX: number) {
    if (!canEditStructure) return;
    const col = columns.find((c) => c.id === columnId);
    resizeRef.current = {
      columnId,
      startX: clientX,
      startWidth: colWidth(col!),
    };
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const active = resizeRef.current;
      if (!active) return;
      const next = Math.max(80, Math.min(640, active.startWidth + (e.clientX - active.startX)));
      widthsLiveRef.current = { ...widthsLiveRef.current, [active.columnId]: next };
      setColumnWidths((prev) => ({ ...prev, [active.columnId]: next }));
    }
    async function onUp() {
      const active = resizeRef.current;
      if (!active) return;
      resizeRef.current = null;
      const width = widthsLiveRef.current[active.columnId] ?? active.startWidth;
      const res = await fetch(`/api/columns/${active.columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ width: Math.round(width) }),
      });
      const data = await res.json();
      if (!res.ok) onError(data.error ?? 'RESIZE_FAILED');
      else {
        onColumnsChange(
          columns.map((c) => (c.id === active.columnId ? (data.column as BoardColumn) : c)),
        );
      }
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [columns, onColumnsChange, onError]);

  function onGridKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (editing) return;
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === 'c') {
      const text = readFocusedValue();
      clipboardRef.current = text;
      void navigator.clipboard?.writeText(text).catch(() => undefined);
      e.preventDefault();
      return;
    }
    if (meta && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      void (async () => {
        let text = clipboardRef.current;
        try {
          const clip = await navigator.clipboard?.readText();
          if (clip != null) text = clip;
        } catch {
          /* clipboard permission may be denied — use internal buffer */
        }
        await pasteFocused(text);
      })();
      return;
    }
    if (!focusedCell) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(1, 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(-1, 0);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveFocus(0, 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveFocus(0, -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items.find((i) => i.id === focusedCell.itemId);
      if (!item) return;
      if (focusedCell.columnId === '__name__') {
        setEditing({ itemId: item.id, columnId: '__name__' });
        setEditDraft(item.name);
      } else {
        const col = columns.find((c) => c.id === focusedCell.columnId);
        if (!col || col.type === 'formula') return;
        const value = getCellValue(item, col);
        let draft = value == null ? '' : String(value);
        if (col.type === 'date' && value) draft = String(value).slice(0, 10);
        setEditing({ itemId: item.id, columnId: col.id });
        setEditDraft(draft);
      }
    } else if (e.key === 'Escape') {
      setFocusedCell(null);
    }
  }

  function renderEditor(item: BoardItem, column: BoardColumn) {
    const value = getCellValue(item, column);
    const readOnly = !canEditCells || column.type === 'formula';
    if (column.type === 'formula') {
      return (
        <span className="truncate px-1 text-sm text-[var(--unison-muted)]" title={String(column.settings.formula ?? '')}>
          {value == null || value === '' ? '—' : String(value)}
        </span>
      );
    }
    if (column.type === 'relation' || column.type === 'dependency') {
      const ids = Array.isArray(value) ? value.map(String) : [];
      const remote = relationCandidates[column.id];
      const candidates =
        remote?.filter((c) => c.id !== item.id) ??
        items
          .filter((i) => !i.parentItemId && i.id !== item.id)
          .map((i) => ({ id: i.id, name: i.name, boardName: '' }));
      const crossBoard = Boolean(
        column.settings.relatedBoardId && column.settings.relatedBoardId !== boardId,
      );
      return (
        <select
          className="h-8 w-full rounded-md border border-[var(--unison-border)] bg-transparent px-1 text-sm"
          value={ids[0] ?? ''}
          disabled={busy || readOnly}
          aria-label={`${column.name} relation`}
          onChange={(e) =>
            void setCell(item.id, column.id, e.target.value ? [e.target.value] : [])
          }
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">None</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {crossBoard && c.boardName ? `${c.name} · ${c.boardName}` : c.name}
            </option>
          ))}
        </select>
      );
    }
    if (column.type === 'status' || column.type === 'priority' || column.type === 'dropdown') {
      const labels =
        column.type === 'dropdown'
          ? (column.settings.options ?? []).map((o) => ({
              id: o.id,
              name: o.name,
              color: o.color ?? '#94A3B8',
            }))
          : getStatusLabels(column);
      return (
        <select
          className="h-8 w-full rounded-md border border-[var(--unison-border)] bg-transparent px-1 text-sm"
          value={String(value ?? '')}
          disabled={busy || readOnly}
          onChange={(e) => void setCell(item.id, column.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      );
    }
    if (column.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          disabled={busy || readOnly}
          onChange={(e) => void setCell(item.id, column.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }
    if (column.type === 'people') {
      const ids = Array.isArray(value) ? value.map(String) : [];
      return (
        <select
          className="h-8 w-full rounded-md border border-[var(--unison-border)] bg-transparent px-1 text-sm"
          value={ids[0] ?? ''}
          disabled={busy || readOnly}
          onChange={(e) =>
            void setCell(item.id, column.id, e.target.value ? [e.target.value] : [])
          }
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user.displayName}
            </option>
          ))}
        </select>
      );
    }
    if (
      editing?.itemId === item.id &&
      editing.columnId === column.id
    ) {
      return (
        <input
          autoFocus
          className="h-8 w-full rounded-md border border-[var(--unison-teal)] bg-transparent px-2 text-sm"
          value={editDraft}
          disabled={busy}
          type={
            column.type === 'number' ||
            column.type === 'progress' ||
            column.type === 'rating' ||
            column.type === 'duration'
              ? 'number'
              : column.type === 'date'
                ? 'date'
                : 'text'
          }
          onChange={(e) => setEditDraft(e.target.value)}
          onBlur={() => {
            const next =
              column.type === 'date' && editDraft
                ? new Date(editDraft).toISOString()
                : editDraft;
            void setCell(item.id, column.id, next);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === 'Escape') setEditing(null);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }
    const label = formatCell(column, value, members, items, relationNames);
    return (
      <button
        type="button"
        className="flex h-8 w-full items-center truncate rounded-md px-1 text-left text-sm hover:bg-[var(--unison-mist)]"
        disabled={readOnly}
        onClick={(e) => {
          e.stopPropagation();
          if (readOnly) return;
          let draft = value == null ? '' : String(value);
          if (column.type === 'date' && value) {
            draft = String(value).slice(0, 10);
          }
          setEditing({ itemId: item.id, columnId: column.id });
          setEditDraft(draft);
        }}
      >
        <span className="truncate">{label || '—'}</span>
      </button>
    );
  }

  const colCount = 2 + visibleColumns.length; // name + columns + actions

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter rows…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
          aria-label="Filter board rows"
        />
        {canEditStructure && (
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <Input
              placeholder="New column"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              className="w-40"
              aria-label="New column name"
            />
            <select
              className="h-10 rounded-md border border-[var(--unison-border)] bg-transparent px-2 text-sm"
              value={newColType}
              onChange={(e) => setNewColType(e.target.value as ColumnType)}
              aria-label="New column type"
            >
              {ADDABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={() => void addColumn()} disabled={busy}>
              Add column
            </Button>
          </div>
        )}
      </div>

      <div
        ref={parentRef}
        role="grid"
        tabIndex={0}
        aria-label="Board spreadsheet"
        aria-colcount={colCount}
        aria-rowcount={rows.length + 1}
        className="relative h-[min(70vh,720px)] overflow-auto rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--unison-teal)]"
        onKeyDown={onGridKeyDown}
      >
        <div style={{ width: totalWidth, minWidth: '100%' }}>
          <div
            role="row"
            aria-rowindex={1}
            className="sticky top-0 z-20 flex border-b border-[var(--unison-border)] bg-[var(--unison-sand)]/95 text-xs font-semibold uppercase tracking-wide text-[var(--unison-muted)] backdrop-blur"
            style={{ width: totalWidth }}
          >
            <div
              role="columnheader"
              aria-colindex={1}
              className="sticky start-0 z-30 flex shrink-0 items-center border-e border-[var(--unison-border)] bg-[var(--unison-sand)] px-2"
              style={{ width: selectWidth + nameWidth }}
            >
              <span className="ps-8">Item</span>
            </div>
            {visibleColumns.map((col, colIndex) => (
              <div
                key={col.id}
                role="columnheader"
                aria-colindex={colIndex + 2}
                aria-sort={
                  sort?.columnId === col.id
                    ? sort.dir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                draggable={canEditStructure}
                onDragStart={() => setDragColId(col.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDropColumn(col.id)}
                className="relative flex shrink-0 items-center gap-1 border-e border-[var(--unison-border)] px-2 py-3"
                style={{ width: colWidth(col) }}
              >
                <button
                  type="button"
                  className="truncate text-start hover:text-[var(--unison-ink)]"
                  onClick={() => toggleSort(col.id)}
                  aria-label={`Sort by ${col.name}`}
                >
                  {col.name}
                  {sort?.columnId === col.id ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
                {canEditStructure && (
                  <button
                    type="button"
                    aria-label={`Resize ${col.name}`}
                    className="absolute end-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-[var(--unison-teal)]/40"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      beginResize(col.id, e.clientX);
                    }}
                  />
                )}
              </div>
            ))}
            <div
              role="columnheader"
              aria-colindex={colCount}
              className="flex w-[120px] shrink-0 items-center px-2"
            >
              Actions
            </div>
          </div>

          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              position: 'relative',
              width: totalWidth,
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]!;
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute start-0 top-0"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    width: totalWidth,
                  }}
                >
                  {row.kind === 'group' ? (
                    <div
                      role="row"
                      aria-rowindex={virtualRow.index + 2}
                      className="flex h-11 items-center gap-2 border-b border-[var(--unison-border)] bg-[var(--unison-mist)]/50 px-3"
                      style={{ width: totalWidth }}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: row.group.color }}
                      />
                      <span className="font-display text-sm font-semibold">
                        {row.group.name}
                      </span>
                      <span className="text-xs text-[var(--unison-muted)]">{row.count}</span>
                      {visibleColumns.map((col) => {
                        const summary = summarizeColumn(
                          rootItems.filter((i) => i.groupId === row.group.id),
                          col,
                        );
                        return (
                          <span
                            key={col.id}
                            className="ms-4 text-xs text-[var(--unison-muted)]"
                          >
                            {summary != null
                              ? `${col.settings.summary ?? ''}: ${Math.round(summary * 10) / 10}`
                              : ''}
                          </span>
                        );
                      })}
                    </div>
                  ) : row.kind === 'composer' ? (
                    <div
                      role="row"
                      aria-rowindex={virtualRow.index + 2}
                      className="flex items-center gap-2 border-b border-[var(--unison-border)] px-3 py-2"
                      style={{ width: totalWidth }}
                    >
                      <Input
                        placeholder={`New item in ${row.group.name}`}
                        value={newItemByGroup[row.group.id] ?? ''}
                        onChange={(e) =>
                          setNewItemByGroup((prev) => ({
                            ...prev,
                            [row.group.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void createItem(row.group.id);
                        }}
                        className="max-w-md"
                        aria-label={`New item in ${row.group.name}`}
                      />
                      <Button
                        size="sm"
                        onClick={() => void createItem(row.group.id)}
                        disabled={busy}
                      >
                        Add
                      </Button>
                    </div>
                  ) : (
                    <div
                      role="row"
                      aria-rowindex={virtualRow.index + 2}
                      aria-selected={selectedId === row.item.id || selectedIds.includes(row.item.id)}
                      draggable
                      onDragStart={() => setDragItemId(row.item.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => void onDropItem(row.item.id)}
                      className={cn(
                        'flex items-stretch border-b border-[var(--unison-border)]',
                        selectedId === row.item.id && 'bg-[var(--unison-mist)]/70',
                      )}
                      style={{ width: totalWidth }}
                      onClick={() => {
                        onSelectItem(row.item.id);
                        setFocusedCell({ itemId: row.item.id, columnId: '__name__' });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectItem(row.item.id);
                          setFocusedCell({ itemId: row.item.id, columnId: '__name__' });
                        }
                      }}
                      tabIndex={0}
                    >
                      <div
                        role="gridcell"
                        aria-colindex={1}
                        className={cn(
                          'sticky start-0 z-10 flex shrink-0 items-center gap-2 border-e border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-2',
                          focusedCell?.itemId === row.item.id &&
                            focusedCell.columnId === '__name__' &&
                            'ring-2 ring-inset ring-[var(--unison-teal)]',
                        )}
                        style={{ width: selectWidth + nameWidth }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(row.item.id);
                          setFocusedCell({ itemId: row.item.id, columnId: '__name__' });
                        }}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.item.name}`}
                          checked={selectedIds.includes(row.item.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            onSelectIds(
                              e.target.checked
                                ? [...selectedIds, row.item.id]
                                : selectedIds.filter((id) => id !== row.item.id),
                            );
                          }}
                        />
                        {editing?.itemId === row.item.id &&
                        editing.columnId === '__name__' ? (
                          <input
                            autoFocus
                            className="h-8 flex-1 rounded-md border border-[var(--unison-teal)] bg-transparent px-2 text-sm font-medium"
                            value={editDraft}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onBlur={() => void persistName(row.item, editDraft)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                              if (e.key === 'Escape') setEditing(null);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="flex-1 truncate text-start text-sm font-medium"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditing({ itemId: row.item.id, columnId: '__name__' });
                              setEditDraft(row.item.name);
                            }}
                          >
                            {row.item.name}
                          </button>
                        )}
                      </div>
                      {visibleColumns.map((col, colIndex) => (
                        <div
                          key={col.id}
                          role="gridcell"
                          aria-colindex={colIndex + 2}
                          className={cn(
                            'flex shrink-0 items-center border-e border-[var(--unison-border)] px-1',
                            focusedCell?.itemId === row.item.id &&
                              focusedCell.columnId === col.id &&
                              'ring-2 ring-inset ring-[var(--unison-teal)]',
                          )}
                          style={{ width: colWidth(col) }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem(row.item.id);
                            setFocusedCell({ itemId: row.item.id, columnId: col.id });
                          }}
                        >
                          {renderEditor(row.item, col)}
                        </div>
                      ))}
                      <div
                        role="gridcell"
                        aria-colindex={colCount}
                        className="flex w-[120px] shrink-0 items-center gap-1 px-1"
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Duplicate ${row.item.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void fetch(`/api/items/${row.item.id}/duplicate`, {
                              method: 'POST',
                            }).then(async (res) => {
                              const data = await res.json();
                              if (res.ok) onItemsChange([...items, data.item as BoardItem]);
                            });
                          }}
                        >
                          Dup
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
