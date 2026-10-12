'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Button, Input } from '@unison/ui';
import type { Board, Workspace } from '@unison/types';

interface Template {
  key: string;
  name: string;
  description: string;
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [name, setName] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [visibility, setVisibility] = useState<'workspace' | 'private' | 'org'>('workspace');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [b, w, t] = await Promise.all([
      fetch('/api/boards').then((r) => r.json()),
      fetch('/api/workspaces').then((r) => r.json()),
      fetch('/api/templates').then((r) => r.json()),
    ]);
    setBoards(b.boards ?? []);
    setWorkspaces(w.workspaces ?? []);
    setTemplates(t.templates ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createBoard() {
    setError(null);
    const workspaceId = workspaces[0]?.id;
    if (!workspaceId || !name.trim()) {
      setError('Name and workspace required');
      return;
    }
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId,
        name,
        visibility,
        templateKey: templateKey || undefined,
        orgId: '00000000-0000-0000-0000-000000000000',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to create board');
      return;
    }
    setName('');
    await load();
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold">Boards</h1>
        <p className="text-[var(--unison-muted)]">
          Create from a template, set private or shared visibility, and open boards.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="New board name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-sm"
        />
        <select
          className="h-10 rounded-md border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-2 text-sm"
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value)}
          aria-label="Board template"
        >
          <option value="">Blank board</option>
          {templates.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-2 text-sm"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as typeof visibility)}
          aria-label="Visibility"
        >
          <option value="workspace">workspace</option>
          <option value="org">org</option>
          <option value="private">private</option>
        </select>
        <Button onClick={() => void createBoard()}>Create board</Button>
      </div>
      {error && <p className="text-sm text-[var(--unison-coral)]">{error}</p>}

      {loading ? (
        <p className="text-[var(--unison-muted)]">Loading boards…</p>
      ) : boards.length === 0 ? (
        <p className="text-[var(--unison-muted)]">No boards yet.</p>
      ) : (
        <div className="space-y-2">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/app/boards/${board.id}`}
              className="flex items-center justify-between rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3"
            >
              <div>
                <div className="font-medium">{board.name}</div>
                <div className="text-sm text-[var(--unison-muted)]">
                  {board.description ?? 'No description'}
                  {board.templateKey ? ` · ${board.templateKey}` : ''}
                </div>
              </div>
              <Badge>{board.visibility}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
