'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Input } from '@unison/ui';
import {
  applyViewConfig,
  getCellValue,
  type FilterGroup,
  type ViewConfig,
} from '@unison/shared';
import type {
  Board,
  BoardColumn,
  BoardGroup,
  BoardItem,
  BoardView,
  Comment,
  OrgRole,
} from '@unison/types';
import { useI18n } from '@/components/i18n-provider';
import { BoardGrid } from '@/components/board-grid';
import { ItemDetailPanel } from '@/components/item-detail-panel';
import { FilterBuilder } from '@/components/filter-builder';
import { StatusLabelAdmin } from '@/components/status-label-admin';
import { ChartView, WorkloadView } from '@/components/workload-chart-views';
import {
  CalendarMonthView,
  GanttView,
  KanbanBoardView,
  MapView,
  PivotView,
} from '@/components/advanced-views';

function canEditBoardStructure(role: OrgRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'workspace_admin';
}

function canEditBoardCells(role: OrgRole): boolean {
  return (
    role === 'owner' ||
    role === 'admin' ||
    role === 'workspace_admin' ||
    role === 'member'
  );
}

type Member = {
  userId: string;
  user: { id: string; displayName: string; email: string };
};

export function BoardViewClient({
  boardId,
  initial,
}: {
  boardId: string;
  initial: {
    board: Board;
    groups: BoardGroup[];
    columns: BoardColumn[];
    items: BoardItem[];
    views: BoardView[];
    comments: Comment[];
    members: Member[];
  };
}) {
  const [board] = useState(initial.board);
  const [groups, setGroups] = useState(initial.groups);
  const [columns, setColumns] = useState(initial.columns);
  const [items, setItems] = useState(initial.items);
  const [views, setViews] = useState(initial.views);
  const [comments, setComments] = useState(initial.comments);
  const [orgRole, setOrgRole] = useState<OrgRole>('member');
  const [activeViewId, setActiveViewId] = useState(
    () => views.find((v) => v.isDefault)?.id ?? views[0]?.id ?? '',
  );
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [newGroupName, setNewGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [draftFilters, setDraftFilters] = useState<FilterGroup>({
    combinator: 'and',
    clauses: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [archived, setArchived] = useState<BoardItem[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [showLabelAdmin, setShowLabelAdmin] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);
  const { t } = useI18n();

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const activeView = views.find((v) => v.id === activeViewId) ?? views[0];
  const canEditStructure = canEditBoardStructure(orgRole);
  const canEditCells = canEditBoardCells(orgRole);

  useEffect(() => {
    void fetch('/api/session')
      .then((r) => r.json())
      .then((data) => {
        const role = data?.session?.membership?.role as OrgRole | undefined;
        if (role) setOrgRole(role);
      })
      .catch(() => undefined);
  }, []);

  /** Phase 3 realtime: poll board revision and refresh when peers change data. */
  useEffect(() => {
    let cancelled = false;
    let lastRev: number | null = null;
    const tick = async () => {
      try {
        const res = await fetch(`/api/boards/${boardId}/events`);
        if (!res.ok) return;
        const data = (await res.json()) as { revision?: number };
        if (cancelled || typeof data.revision !== 'number') return;
        if (lastRev !== null && data.revision !== lastRev) {
          await refresh();
        }
        lastRev = data.revision;
      } catch {
        /* ignore transient poll errors */
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // refresh is stable enough via closure over state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  useEffect(() => {
    const base = (activeView?.config ?? {}) as ViewConfig;
    setDraftFilters(
      base.filters ?? {
        combinator: 'and',
        clauses: [],
      },
    );
    setQuery(base.query ?? '');
  }, [activeViewId, activeView]);

  const viewConfig: ViewConfig = useMemo(() => {
    const base = (activeView?.config ?? {}) as ViewConfig;
    return {
      ...base,
      query: query || undefined,
      filters: draftFilters.clauses.length ? draftFilters : undefined,
    };
  }, [activeView, draftFilters, query]);

  const filteredItems = useMemo(() => {
    const roots = items.filter((i) => !i.parentItemId);
    return applyViewConfig(roots, viewConfig, columns, getCellValue);
  }, [items, viewConfig, columns]);

  async function refresh() {
    const res = await fetch(`/api/boards/${boardId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to refresh');
      return;
    }
    setGroups(data.groups);
    setColumns(data.columns);
    setItems(data.items);
    setComments(data.comments);
    setViews(data.views);
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId, name: newGroupName }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to create group');
      return;
    }
    setNewGroupName('');
    await refresh();
  }

  async function saveCurrentView(visibility: 'personal' | 'shared') {
    if (!saveViewName.trim()) return;
    const res = await fetch('/api/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boardId,
        name: saveViewName.trim(),
        type: activeView?.type ?? 'table',
        visibility,
        config: viewConfig,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Save view failed');
      return;
    }
    setSaveViewName('');
    await refresh();
    setActiveViewId(data.view.id);
  }

  async function loadArchived() {
    setShowArchived(true);
    const archivedRes = await fetch(`/api/boards/${boardId}/archived`)
      .then((r) => r.json())
      .catch(() => ({ items: [] }));
    setArchived(archivedRes.items ?? []);
  }

  async function exportCsv() {
    setCsvBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/csv`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'CSV export failed');
        return;
      }
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${board.name.replace(/\s+/g, '-').toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setCsvBusy(false);
    }
  }

  async function importCsv(file: File) {
    setCsvBusy(true);
    setError(null);
    try {
      const csv = await file.text();
      const res = await fetch(`/api/boards/${boardId}/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, groupId: groups[0]?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'CSV import failed');
        return;
      }
      await refresh();
    } finally {
      setCsvBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--unison-teal)]">Board</p>
        <h1 className="font-display text-4xl font-bold">{board.name}</h1>
        <p className="text-[var(--unison-muted)]">{board.description}</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {views.map((view) => (
          <Button
            key={view.id}
            size="sm"
            variant={activeViewId === view.id ? 'primary' : 'secondary'}
            onClick={() => setActiveViewId(view.id)}
          >
            {view.name}
            {view.visibility === 'personal' ? ' · me' : ''}
          </Button>
        ))}
        <Input
          placeholder="Search item names"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="ms-auto max-w-xs"
          aria-label="Search item names"
        />
        <Badge>{orgRole}</Badge>
        {!canEditCells && <Badge tone="warn">Read-only</Badge>}
        {canEditStructure && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLabelAdmin((v) => !v)}
          >
            {showLabelAdmin ? 'Hide labels' : 'Edit labels'}
          </Button>
        )}
      </div>

      <FilterBuilder columns={columns} value={draftFilters} onChange={setDraftFilters} />

      {showLabelAdmin && canEditStructure && (
        <StatusLabelAdmin
          columns={columns}
          onColumnsChange={setColumns}
          onError={setError}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--unison-border)] bg-[var(--unison-mist)]/40 px-3 py-2">
        <Input
          placeholder="Save current filters as view"
          value={saveViewName}
          onChange={(e) => setSaveViewName(e.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" variant="secondary" onClick={() => void saveCurrentView('personal')}>
          Save personal
        </Button>
        {canEditStructure && (
          <Button size="sm" variant="secondary" onClick={() => void saveCurrentView('shared')}>
            Save shared
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={csvBusy}
          onClick={() => void exportCsv()}
        >
          Export CSV
        </Button>
        {canEditCells && (
          <label className="inline-flex h-8 cursor-pointer items-center rounded-md px-3 text-sm text-[var(--unison-slate)] hover:bg-[var(--unison-mist)]">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={csvBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importCsv(file);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--unison-border)] bg-[var(--unison-mist)] px-3 py-2 text-sm">
          <span>{selectedIds.length} selected</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void fetch('/api/items/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ids: selectedIds,
                  action: 'set_status',
                  status: 'done',
                }),
              }).then(async () => {
                setSelectedIds([]);
                await refresh();
              });
            }}
          >
            Mark done
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void fetch('/api/items/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds, action: 'archive' }),
              }).then(async () => {
                setSelectedIds([]);
                await refresh();
              });
            }}
          >
            Archive
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
            Clear
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-[var(--unison-coral)]">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {(activeView?.type ?? 'table') === 'kanban' ? (
            <KanbanBoardView
              items={filteredItems}
              onSelectItem={setSelectedId}
              onMoveStatus={
                canEditCells
                  ? (itemId, status) => {
                      void fetch('/api/items/' + itemId, {
                        method: 'PATCH',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ status }),
                      }).then(async (res) => {
                        if (!res.ok) return;
                        const data = await res.json();
                        if (data.item) {
                          setItems((prev) =>
                            prev.map((i) => (i.id === itemId ? { ...i, ...data.item } : i)),
                          );
                        } else {
                          await refresh();
                        }
                      });
                    }
                  : undefined
              }
            />
          ) : (activeView?.type ?? 'table') === 'calendar' ? (
            <CalendarMonthView items={filteredItems} onSelectItem={setSelectedId} />
          ) : (activeView?.type ?? 'table') === 'timeline' ? (
            <div className="space-y-3 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
              {filteredItems
                .slice()
                .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
                .map((item) => {
                  const width = Math.min(92, 18 + item.progress * 0.5);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className="grid w-full grid-cols-[180px_1fr] items-center gap-3 text-left"
                    >
                      <span className="truncate text-sm font-medium">{item.name}</span>
                      <div className="relative h-8 rounded-md bg-[var(--unison-mist)]">
                        <div
                          className="absolute inset-y-1 left-2 rounded-md bg-[var(--unison-teal)]"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
            </div>
          ) : (activeView?.type ?? 'table') === 'gantt' ? (
            <GanttView items={filteredItems} onSelectItem={setSelectedId} />
          ) : (activeView?.type ?? 'table') === 'pivot' ? (
            <PivotView items={filteredItems} onSelectItem={setSelectedId} />
          ) : (activeView?.type ?? 'table') === 'map' ? (
            <MapView items={filteredItems} onSelectItem={setSelectedId} />
          ) : (activeView?.type ?? 'table') === 'workload' ? (
            <WorkloadView
              items={filteredItems}
              members={initial.members}
              onSelectItem={setSelectedId}
            />
          ) : (activeView?.type ?? 'table') === 'chart' ? (
            <ChartView items={filteredItems} onSelectItem={setSelectedId} />
          ) : (activeView?.type ?? 'table') === 'cards' ||
            (activeView?.type ?? 'table') === 'files_gallery' ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4 text-left transition hover:border-[var(--unison-ocean)]"
                >
                  <div className="text-base font-semibold">{item.name}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--unison-muted)]">
                    <Badge>{item.status.replace('_', ' ')}</Badge>
                    <Badge>{item.priority}</Badge>
                    {item.dueDate ? <Badge>{new Date(item.dueDate).toLocaleDateString()}</Badge> : null}
                  </div>
                  {item.description ? (
                    <p className="mt-3 line-clamp-3 text-sm text-[var(--unison-slate)]">
                      {item.description}
                    </p>
                  ) : null}
                </button>
              ))}
              {filteredItems.length === 0 ? (
                <p className="text-sm text-[var(--unison-muted)]">No items in this view.</p>
              ) : null}
            </div>
          ) : (
            <BoardGrid
              boardId={boardId}
              groups={groups}
              columns={columns}
              items={items.filter((i) => filteredItems.some((f) => f.id === i.id) || i.parentItemId)}
              members={initial.members}
              selectedId={selectedId}
              selectedIds={selectedIds}
              canEditStructure={canEditStructure}
              canEditCells={canEditCells}
              onSelectItem={setSelectedId}
              onSelectIds={setSelectedIds}
              onItemsChange={setItems}
              onColumnsChange={setColumns}
              onError={setError}
            />
          )}

          {canEditStructure && (
            <div className="flex gap-2">
              <Input
                placeholder="New group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="max-w-sm"
              />
              <Button variant="secondary" onClick={() => void createGroup()}>
                New group
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Button size="sm" variant="ghost" onClick={() => void loadArchived()}>
              {showArchived ? 'Refresh archived' : 'Show archived items'}
            </Button>
            {showArchived &&
              (archived.length === 0 ? (
                <p className="text-sm text-[var(--unison-muted)]">No archived items.</p>
              ) : (
                archived.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border border-[var(--unison-border)] px-3 py-2 text-sm"
                  >
                    <span>{item.name}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        void fetch(`/api/items/${item.id}/restore`, { method: 'POST' }).then(
                          async () => {
                            await refresh();
                            await loadArchived();
                          },
                        );
                      }}
                    >
                      Restore
                    </Button>
                  </div>
                ))
              ))}
          </div>
        </div>

        {selected ? (
          <ItemDetailPanel
            board={board}
            groups={groups}
            columns={columns}
            item={selected}
            items={items}
            comments={comments}
            members={initial.members}
            onClose={() => setSelectedId(null)}
            onRefresh={refresh}
            onSelectItem={setSelectedId}
            onError={setError}
          />
        ) : (
          <aside className="h-fit rounded-xl border border-dashed border-[var(--unison-border)] p-6 text-sm text-[var(--unison-muted)]">
            Select an item to open Overview / Columns / Updates / Files / Subitems / Activity.
            <div className="mt-3 text-xs">{t('board.subitems')}</div>
          </aside>
        )}
      </div>
    </div>
  );
}
