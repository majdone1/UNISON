'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Input } from '@unison/ui';
import { getCellValue, getStatusLabels, resolveMentions } from '@unison/shared';
import type {
  Board,
  BoardColumn,
  BoardGroup,
  BoardItem,
  Comment,
  ItemStatus,
} from '@unison/types';

type Member = {
  userId: string;
  user: { id: string; displayName: string; email: string };
};

type Tab = 'overview' | 'columns' | 'updates' | 'files' | 'subitems' | 'activity';

const statuses: ItemStatus[] = ['not_started', 'working', 'stuck', 'done', 'cancelled'];

export function ItemDetailPanel({
  board,
  groups,
  columns,
  item,
  items,
  comments,
  members,
  onClose,
  onRefresh,
  onSelectItem,
  onError,
}: {
  board: Board;
  groups: BoardGroup[];
  columns: BoardColumn[];
  item: BoardItem;
  items: BoardItem[];
  comments: Comment[];
  members: Member[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onSelectItem: (id: string) => void;
  onError: (msg: string | null) => void;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [commentBody, setCommentBody] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [subitemName, setSubitemName] = useState('');
  const [attachments, setAttachments] = useState<
    Array<{ id: string; fileName: string; contentType: string; sizeBytes: number }>
  >([]);
  const [activity, setActivity] = useState<
    Array<{ id: string; eventType: string; payload: Record<string, unknown>; createdAt: string }>
  >([]);
  const [busy, setBusy] = useState(false);

  const group = groups.find((g) => g.id === item.groupId);
  const itemComments = useMemo(
    () => comments.filter((c) => c.itemId === item.id),
    [comments, item.id],
  );
  const topLevelComments = useMemo(
    () => itemComments.filter((c) => !c.parentCommentId),
    [itemComments],
  );
  const repliesByParent = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const c of itemComments) {
      if (!c.parentCommentId) continue;
      const list = map.get(c.parentCommentId) ?? [];
      list.push(c);
      map.set(c.parentCommentId, list);
    }
    return map;
  }, [itemComments]);

  async function reactToComment(commentId: string, emoji: string) {
    const res = await fetch(`/api/comments/${commentId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    });
    const data = await res.json();
    if (!res.ok) onError(data.error ?? 'Reaction failed');
    else {
      await onRefresh();
      await loadPanels();
    }
  }
  const subitems = useMemo(
    () => items.filter((i) => i.parentItemId === item.id),
    [items, item.id],
  );

  useEffect(() => {
    void loadPanels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  async function loadPanels() {
    const [att, act] = await Promise.all([
      fetch(`/api/attachments?itemId=${item.id}`).then((r) => r.json()),
      fetch(`/api/activity?boardId=${board.id}&itemId=${item.id}`).then((r) => r.json()),
    ]);
    setAttachments(att.attachments ?? []);
    setActivity(act.activity ?? []);
  }

  async function patchItem(patch: Record<string, unknown>) {
    setBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'Update failed');
        return;
      }
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function setCell(columnId: string, value: unknown) {
    setBusy(true);
    onError(null);
    try {
      const res = await fetch('/api/cells', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, columnId, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'Cell update failed');
        return;
      }
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'columns', label: 'Columns' },
    { id: 'updates', label: 'Updates' },
    { id: 'files', label: 'Files' },
    { id: 'subitems', label: 'Subitems' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <aside className="h-fit space-y-4 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs uppercase tracking-[0.16em] text-[var(--unison-teal)]">
            {board.name}
            {group ? ` · ${group.name}` : ''}
          </p>
          <h3 className="font-display text-xl font-semibold leading-tight">{item.name}</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? 'primary' : 'secondary'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-3">
          <textarea
            className="min-h-24 w-full rounded-md border border-[var(--unison-border)] bg-transparent p-2 text-sm"
            value={item.description ?? ''}
            disabled={busy}
            onChange={(e) => void patchItem({ description: e.target.value })}
            placeholder="Description"
          />
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--unison-muted)]">Status</span>
            <select
              className="h-9 w-full rounded-md border border-[var(--unison-border)] bg-transparent px-2 text-sm"
              value={item.status}
              disabled={busy}
              onChange={(e) => void patchItem({ status: e.target.value })}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--unison-muted)]">Due date</span>
            <Input
              type="date"
              value={item.dueDate ? item.dueDate.slice(0, 10) : ''}
              disabled={busy}
              onChange={(e) =>
                void patchItem({
                  dueDate: e.target.value
                    ? new Date(`${e.target.value}T12:00:00.000Z`).toISOString()
                    : null,
                })
              }
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--unison-muted)]">Progress ({item.progress}%)</span>
            <input
              type="range"
              min={0}
              max={100}
              value={item.progress}
              disabled={busy}
              className="w-full"
              onChange={(e) => void patchItem({ progress: Number(e.target.value) })}
            />
          </label>
          <div className="space-y-2 text-sm">
            <div className="font-medium">People</div>
            {members.map((m) => {
              const checked = item.assigneeIds.includes(m.userId);
              return (
                <label key={m.userId} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={busy}
                    onChange={() => {
                      const next = checked
                        ? item.assigneeIds.filter((id) => id !== m.userId)
                        : [...item.assigneeIds, m.userId];
                      void patchItem({ assigneeIds: next });
                    }}
                  />
                  {m.user.displayName}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'columns' && (
        <div className="space-y-3 text-sm">
          {columns
            .filter((c) => !c.isHidden)
            .map((column) => {
              const value = getCellValue(item, column);
              if (column.type === 'formula') {
                return (
                  <div key={column.id} className="rounded-md bg-[var(--unison-mist)] px-3 py-2">
                    <div className="text-xs text-[var(--unison-muted)]">{column.name}</div>
                    <div className="font-medium">{String(value ?? '—')}</div>
                    <div className="text-xs text-[var(--unison-muted)]">
                      = {String(column.settings.formula ?? '')}
                    </div>
                  </div>
                );
              }
              if (column.type === 'status' || column.type === 'priority') {
                const labels = getStatusLabels(column);
                return (
                  <label key={column.id} className="block space-y-1">
                    <span className="text-xs text-[var(--unison-muted)]">{column.name}</span>
                    <select
                      className="h-9 w-full rounded-md border border-[var(--unison-border)] bg-transparent px-2"
                      value={String(value ?? '')}
                      disabled={busy}
                      onChange={(e) => void setCell(column.id, e.target.value)}
                    >
                      {labels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }
              if (column.type === 'checkbox') {
                return (
                  <label key={column.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      disabled={busy}
                      onChange={(e) => void setCell(column.id, e.target.checked)}
                    />
                    {column.name}
                  </label>
                );
              }
              const display = Array.isArray(value)
                ? value.join(', ')
                : value == null
                  ? ''
                  : String(value);
              return (
                <label key={column.id} className="block space-y-1">
                  <span className="text-xs text-[var(--unison-muted)]">{column.name}</span>
                  <Input
                    key={`${column.id}-${display}`}
                    type={
                      column.type === 'number' ||
                      column.type === 'duration' ||
                      column.type === 'progress' ||
                      column.type === 'rating'
                        ? 'number'
                        : 'text'
                    }
                    defaultValue={display}
                    disabled={busy || column.settings.systemField === 'assigneeIds'}
                    onBlur={(e) => {
                      const v =
                        column.type === 'number' ||
                        column.type === 'duration' ||
                        column.type === 'progress' ||
                        column.type === 'rating'
                          ? e.target.value === ''
                            ? null
                            : Number(e.target.value)
                          : e.target.value;
                      void setCell(column.id, v);
                    }}
                  />
                </label>
              );
            })}
        </div>
      )}

      {tab === 'updates' && (
        <div className="space-y-3">
          <div className="max-h-72 space-y-2 overflow-auto">
            {topLevelComments.length === 0 && (
              <p className="text-sm text-[var(--unison-muted)]">No updates yet.</p>
            )}
            {topLevelComments.map((c) => {
              const author = members.find((m) => m.userId === c.authorId)?.user.displayName;
              const replies = repliesByParent.get(c.id) ?? [];
              return (
                <div
                  key={c.id}
                  className="rounded-md border border-[var(--unison-border)] px-3 py-2 text-sm"
                >
                  <div className="text-xs text-[var(--unison-muted)]">
                    {author ?? 'Someone'} · {new Date(c.createdAt).toLocaleString()}
                  </div>
                  <div>{c.body}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {(['👍', '❤️', '👀'] as const).map((emoji) => {
                      const count = (c.reactions?.[emoji] ?? []).length;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          className="rounded-md border border-[var(--unison-border)] px-1.5 py-0.5 text-xs hover:bg-[var(--unison-mist)]"
                          aria-label={`React ${emoji}`}
                          onClick={() => void reactToComment(c.id, emoji)}
                        >
                          {emoji}
                          {count > 0 ? ` ${count}` : ''}
                        </button>
                      );
                    })}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyToId(c.id);
                        setCommentBody('');
                      }}
                    >
                      Reply
                    </Button>
                  </div>
                  {replies.length > 0 && (
                    <div className="ms-3 mt-2 space-y-2 border-s border-[var(--unison-border)] ps-3">
                      {replies.map((r) => {
                        const replyAuthor = members.find((m) => m.userId === r.authorId)?.user
                          .displayName;
                        return (
                          <div key={r.id} className="text-sm">
                            <div className="text-xs text-[var(--unison-muted)]">
                              {replyAuthor ?? 'Someone'} ·{' '}
                              {new Date(r.createdAt).toLocaleString()}
                            </div>
                            <div>{r.body}</div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {(['👍', '❤️', '👀'] as const).map((emoji) => {
                                const count = (r.reactions?.[emoji] ?? []).length;
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className="rounded-md border border-[var(--unison-border)] px-1.5 py-0.5 text-xs hover:bg-[var(--unison-mist)]"
                                    aria-label={`React ${emoji}`}
                                    onClick={() => void reactToComment(r.id, emoji)}
                                  >
                                    {emoji}
                                    {count > 0 ? ` ${count}` : ''}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {replyToId && (
            <p className="text-xs text-[var(--unison-muted)]">
              Replying to thread{' '}
              <button
                type="button"
                className="text-[var(--unison-teal)] underline"
                onClick={() => setReplyToId(null)}
              >
                Cancel
              </button>
            </p>
          )}
          <textarea
            className="min-h-20 w-full rounded-md border border-[var(--unison-border)] bg-transparent p-2 text-sm"
            placeholder={
              replyToId
                ? 'Write a reply… use @Name to mention'
                : 'Write an update… use @Name to mention'
            }
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <Button
            size="sm"
            disabled={busy || !commentBody.trim()}
            onClick={() => {
              const mentionUserIds = resolveMentions(
                commentBody,
                members.map((m) => ({
                  userId: m.userId,
                  displayName: m.user.displayName,
                })),
              );
              void fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  itemId: item.id,
                  body: commentBody,
                  mentionUserIds,
                  parentCommentId: replyToId,
                }),
              }).then(async (res) => {
                const data = await res.json();
                if (!res.ok) onError(data.error ?? 'Comment failed');
                else {
                  setCommentBody('');
                  setReplyToId(null);
                  await onRefresh();
                  await loadPanels();
                }
              });
            }}
          >
            {replyToId ? 'Post reply' : 'Post update'}
          </Button>
        </div>
      )}

      {tab === 'files' && (
        <div className="space-y-3">
          {attachments.length === 0 && (
            <p className="text-sm text-[var(--unison-muted)]">No files yet.</p>
          )}
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--unison-border)] px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{a.fileName}</div>
                <div className="text-xs text-[var(--unison-muted)]">
                  {a.contentType} · {Math.round(a.sizeBytes / 1024)} KB
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void fetch(`/api/attachments/${a.id}`)
                      .then((r) => r.json())
                      .then((data) => {
                        if (!data.attachment?.dataBase64) return;
                        const bin = atob(data.attachment.dataBase64);
                        const bytes = new Uint8Array(bin.length);
                        for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
                        const blob = new Blob([bytes], {
                          type: data.attachment.contentType,
                        });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = a.fileName;
                        link.click();
                        URL.revokeObjectURL(url);
                      });
                  }}
                >
                  Get
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void fetch(`/api/attachments/${a.id}`, { method: 'DELETE' }).then(
                      async (res) => {
                        if (!res.ok) {
                          const data = await res.json();
                          onError(data.error ?? 'Delete failed');
                        } else await loadPanels();
                      },
                    );
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const result = String(reader.result ?? '');
                const dataBase64 = result.includes(',') ? result.split(',')[1]! : result;
                void fetch('/api/attachments', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    itemId: item.id,
                    fileName: file.name,
                    contentType: file.type || 'text/plain',
                    sizeBytes: file.size,
                    dataBase64,
                  }),
                }).then(async (res) => {
                  const data = await res.json();
                  if (!res.ok) onError(data.error ?? 'Upload failed');
                  else await loadPanels();
                });
              };
              reader.readAsDataURL(file);
            }}
          />
          <p className="text-xs text-[var(--unison-muted)]">
            Demo upload (mock storage). Max 5MB · png/jpg/webp/pdf/txt/csv.
          </p>
        </div>
      )}

      {tab === 'subitems' && (
        <div className="space-y-3">
          {subitems.length === 0 && (
            <p className="text-sm text-[var(--unison-muted)]">No subitems.</p>
          )}
          {subitems.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between rounded-md bg-[var(--unison-mist)] px-3 py-2 text-sm"
            >
              <button type="button" onClick={() => onSelectItem(sub.id)}>
                {sub.name}
              </button>
              <Badge>{sub.status}</Badge>
            </div>
          ))}
          {!item.parentItemId && (
            <div className="flex gap-2">
              <Input
                placeholder="New subitem"
                value={subitemName}
                onChange={(e) => setSubitemName(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!subitemName.trim()}
                onClick={() => {
                  void fetch('/api/subitems', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      boardId: board.id,
                      groupId: item.groupId,
                      name: subitemName,
                      parentItemId: item.id,
                    }),
                  }).then(async (res) => {
                    const data = await res.json();
                    if (!res.ok) onError(data.error ?? 'Failed');
                    else {
                      setSubitemName('');
                      await onRefresh();
                    }
                  });
                }}
              >
                Add
              </Button>
            </div>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="max-h-80 space-y-2 overflow-auto">
          {activity.length === 0 && (
            <p className="text-sm text-[var(--unison-muted)]">No activity yet.</p>
          )}
          {activity.map((a) => (
            <div key={a.id} className="text-xs text-[var(--unison-muted)]">
              <span className="font-medium text-[var(--unison-text)]">{a.eventType}</span>{' '}
              {new Date(a.createdAt).toLocaleString()}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
