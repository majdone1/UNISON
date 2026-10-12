'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Board, Workspace } from '@unison/types';

interface Template {
  key: string;
  name: string;
  description: string;
}

// Monday.com-style color palette for boards
const BOARD_COLORS = [
  '#0073EA', '#9B51E0', '#FF7575', '#FDAB3D', '#00C875',
  '#579BFC', '#E2445C', '#A25DDC', '#037F4C', '#CAB641',
];

function getBoardColor(id: string) {
  const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return BOARD_COLORS[sum % BOARD_COLORS.length]!;
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
  const [creating, setCreating] = useState(false);

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
    if (!name.trim()) {
      setError('Please enter a board name');
      return;
    }

    // Use first workspace if available, otherwise create without workspaceId
    const workspaceId = workspaces[0]?.id;

    setCreating(true);
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(workspaceId ? { workspaceId } : {}),
        name: name.trim(),
        visibility,
        templateKey: templateKey || undefined,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? 'Failed to create board');
      return;
    }
    setName('');
    await load();
  }

  return (
    <div className="px-6 py-6" style={{ background: '#F5F6F8', minHeight: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#323338]">Boards</h1>
          <p className="mt-0.5 text-sm text-[#676879]">
            Manage and track work across your team
          </p>
        </div>
        <button
          onClick={() => {
            const modal = document.getElementById('new-board-modal');
            if (modal) modal.style.display = 'flex';
          }}
          className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ background: '#0073EA' }}
        >
          <span className="text-lg leading-none">+</span>
          New board
        </button>
      </div>

      {/* New board modal (inline) */}
      <div
        id="new-board-modal"
        className="mb-6 hidden items-center gap-3 rounded-xl border border-[#E6E9EF] bg-white p-5 shadow-sm"
        style={{ display: 'flex' }}
      >
        <input
          type="text"
          placeholder="Board name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void createBoard(); }}
          className="h-9 flex-1 rounded-md border border-[#E6E9EF] px-3 text-sm text-[#323338] outline-none focus:border-[#0073EA] focus:ring-1 focus:ring-[#0073EA]"
          autoFocus
        />
        <select
          className="h-9 rounded-md border border-[#E6E9EF] px-2 text-sm text-[#323338] outline-none focus:border-[#0073EA]"
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value)}
        >
          <option value="">Blank board</option>
          {templates.map((t) => (
            <option key={t.key} value={t.key}>{t.name}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-[#E6E9EF] px-2 text-sm text-[#323338] outline-none focus:border-[#0073EA]"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as typeof visibility)}
        >
          <option value="workspace">Workspace</option>
          <option value="org">Organization</option>
          <option value="private">Private</option>
        </select>
        <button
          onClick={() => void createBoard()}
          disabled={creating || !name.trim()}
          className="h-9 rounded-md px-5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: '#0073EA' }}
        >
          {creating ? 'Creating…' : 'Create board'}
        </button>
        {error && (
          <span className="text-sm font-medium text-[#D83A52]">{error}</span>
        )}
      </div>

      {/* Boards grid */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#676879]">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading boards…
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#C5C7D4] bg-white py-20 text-center">
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ background: '#E8F0FE' }}
          >
            📋
          </div>
          <h3 className="mb-1 text-lg font-semibold text-[#323338]">No boards yet</h3>
          <p className="mb-6 text-sm text-[#676879]">
            Create your first board to start managing work
          </p>
          <button
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>('#new-board-modal input');
              input?.focus();
            }}
            className="flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: '#0073EA' }}
          >
            + Create first board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {boards.map((board) => {
            const color = getBoardColor(board.id);
            return (
              <Link
                key={board.id}
                href={`/app/boards/${board.id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-[#E6E9EF] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Color band top */}
                <div className="h-2 w-full" style={{ background: color }} />
                <div className="flex flex-1 flex-col p-4">
                  {/* Board icon */}
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{ background: color }}
                  >
                    {board.name.slice(0, 2).toUpperCase()}
                  </div>
                  <h3 className="mb-1 font-semibold text-[#323338] group-hover:text-[#0073EA] transition-colors">
                    {board.name}
                  </h3>
                  <p className="flex-1 text-xs text-[#676879] line-clamp-2">
                    {board.description ?? 'No description'}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className="rounded px-2 py-0.5 text-xs font-medium capitalize"
                      style={{
                        background: board.visibility === 'private' ? '#FFF0F3' : '#EEF7FF',
                        color: board.visibility === 'private' ? '#D83A52' : '#0073EA',
                      }}
                    >
                      {board.visibility}
                    </span>
                    {board.templateKey && (
                      <span className="text-xs text-[#9295A4]">{board.templateKey}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Add board card */}
          <button
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>('#new-board-modal input');
              input?.focus();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#C5C7D4] bg-white p-8 text-[#676879] transition-colors hover:border-[#0073EA] hover:text-[#0073EA]"
          >
            <span className="mb-2 text-3xl">+</span>
            <span className="text-sm font-medium">New board</span>
          </button>
        </div>
      )}
    </div>
  );
}
