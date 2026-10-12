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
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 56px)' }}>
      {/* Monday-style board header */}
      <div className="border-b border-[#E6E9EF] bg-white px-6 pt-5 pb-0">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#323338]">{board.name}</h1>
            {board.description && (
              <p className="mt-0.5 text-sm text-[#676879]">{board.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!canEditCells && <Badge tone="warn">Read-only</Badge>}
            {canEditStructure && (
              <button
                className="flex h-8 items-center gap-1.5 rounded-md border border-[#E6E9EF] px-3 text-sm font-medium text-[#676879] transition-colors hover:border-[#C5C7D4] hover:text-[#323338]"
                onClick={() => setShowLabelAdmin((v) => !v)}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Labels
              </button>
            )}
            <button
              className="flex h-8 items-center gap-1.5 rounded-md border border-[#E6E9EF] px-3 text-sm font-medium text-[#676879] transition-colors hover:border-[#C5C7D4] hover:text-[#323338]"
              disabled={csvBusy}
              onClick={() => void exportCsv()}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            {canEditCells && (
              <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-[#E6E9EF] px-3 text-sm font-medium text-[#676879] transition-colors hover:border-[#C5C7D4] hover:text-[#323338]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Import
                <input type="file" accept=".csv,text/csv" className="sr-only" disabled={csvBusy}
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) void importCsv(file); e.target.value = ''; }}
                />
              </label>
            )}
          </div>
        </div>

        {/* View tabs — Monday-style */}
        <div className="flex items-center gap-0">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveViewId(view.id)}
              className="relative flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
              style={
                activeViewId === view.id
                  ? { borderColor: '#0073EA', color: '#0073EA' }
                  : { borderColor: 'transparent', color: '#676879' }
              }
            >
              {view.name}
              {view.visibility === 'personal' && (
                <span className="text-xs opacity-60">·me</span>
              )}
            </button>
          ))}
          {canEditStructure && (
            <button
              className="flex items-center gap-1 border-b-2 border-transparent px-3 py-2.5 text-sm text-[#676879] hover:text-[#323338]"
              title="Save view"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E6E9EF] bg-white px-6 py-2">
        <Input
          placeholder="🔍  Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 max-w-[200px] text-sm"
          aria-label="Search item names"
        />
        <button
          className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-[#676879] transition-colors hover:bg-[#F5F6F8]"
          onClick={() => {/* toggle filter builder */}}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter
          {draftFilters.clauses.length > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: '#0073EA' }}>
              {draftFilters.clauses.length}
            </span>
          )}
        </button>
        <button className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-[#676879] transition-colors hover:bg-[#F5F6F8]">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
          Sort
        </button>
        <button className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-[#676879] transition-colors hover:bg-[#F5F6F8]">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Hide columns
        </button>

        {canEditStructure && (
          <div className="ms-auto flex items-center gap-2">
            <Input
              placeholder="Save view as…"
              value={saveViewName}
              onChange={(e) => setSaveViewName(e.target.value)}
              className="h-8 max-w-[160px] text-xs"
            />
            <button
              className="h-8 rounded-md px-3 text-xs font-medium text-[#676879] transition-colors hover:bg-[#F5F6F8]"
              onClick={() => void saveCurrentView('personal')}
            >
              Save me
            </button>
            <button
              className="h-8 rounded-md px-3 text-xs font-medium text-[#676879] transition-colors hover:bg-[#F5F6F8]"
              onClick={() => void saveCurrentView('shared')}
            >
              Save shared
            </button>
          </div>
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

      {error && (
        <div className="mx-6 mt-3 rounded-md bg-[#FFECEC] px-4 py-2 text-sm font-medium text-[#D83A52]">{error}</div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto px-6 py-4">
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
            <div className="mt-4 flex gap-2">
              <Input
                placeholder="New group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="h-8 max-w-sm text-sm"
              />
              <button
                className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors"
                style={{ background: '#0073EA', color: '#fff' }}
                onClick={() => void createGroup()}
              >
                + New group
              </button>
            </div>
          )}

          <div className="mt-4">
            <button
              className="text-sm text-[#676879] underline-offset-2 hover:underline"
              onClick={() => void loadArchived()}
            >
              {showArchived ? 'Refresh archived' : 'Show archived items'}
            </button>
            {showArchived &&
              (archived.length === 0 ? (
                <p className="mt-2 text-sm text-[#676879]">No archived items.</p>
              ) : (
                <div className="mt-2 space-y-1">
                  {archived.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border border-[#E6E9EF] px-3 py-2 text-sm"
                    >
                      <span className="text-[#676879]">{item.name}</span>
                      <button
                        className="rounded px-2 py-1 text-xs font-medium text-[#0073EA] hover:bg-[#E8F0FE]"
                        onClick={() => {
                          void fetch(`/api/items/${item.id}/restore`, { method: 'POST' }).then(
                            async () => { await refresh(); await loadArchived(); },
                          );
                        }}
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>

        {selected ? (
          <div className="w-[360px] shrink-0 border-l border-[#E6E9EF] bg-white">
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
