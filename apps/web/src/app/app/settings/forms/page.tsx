'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Input } from '@unison/ui';

interface BoardForm {
  id: string;
  boardId: string;
  name: string;
  description?: string | null;
  fieldKeys: string[];
  visibility: 'private' | 'public';
  enabled: boolean;
  submissionCount: number;
}

interface Board {
  id: string;
  name: string;
}

export default function FormsSettingsPage() {
  const [forms, setForms] = useState<BoardForm[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState('');
  const [name, setName] = useState('Field intake');
  const [message, setMessage] = useState<string | null>(null);
  const [submitName, setSubmitName] = useState('');
  const [activeFormId, setActiveFormId] = useState<string | null>(null);

  async function load() {
    const [f, b] = await Promise.all([
      fetch('/api/forms').then((r) => r.json()),
      fetch('/api/boards').then((r) => r.json()),
    ]);
    setForms(f.forms ?? []);
    setBoards(b.boards ?? []);
    if (!boardId && b.boards?.[0]) setBoardId(b.boards[0].id);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold">Forms</h1>
        <p className="text-[var(--unison-muted)]">
          Board-connected forms create real items and can fire <code>item.created</code> automations.
          Public forms stay tenant-scoped in demo mode.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
        <h2 className="font-display text-xl font-semibold">Create form</h2>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-md border border-[var(--unison-border)] bg-transparent px-2 text-sm"
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <Button
            onClick={() => {
              void fetch('/api/forms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  boardId,
                  name,
                  fieldKeys: ['name', 'description', 'priority'],
                  visibility: 'public',
                }),
              }).then(async (res) => {
                const data = await res.json();
                if (!res.ok) setMessage(data.error ?? 'Failed');
                else {
                  setMessage('Form created.');
                  await load();
                }
              });
            }}
          >
            Create
          </Button>
        </div>
        {message && <p className="text-sm text-[var(--unison-teal)]">{message}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Forms</h2>
        {forms.map((form) => (
          <div
            key={form.id}
            className="rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">{form.name}</div>
              <Badge>{form.visibility}</Badge>
              <Badge tone="accent">submissions {form.submissionCount}</Badge>
              <Link
                href={`/app/boards/${form.boardId}`}
                className="text-sm text-[var(--unison-teal)]"
              >
                Board
              </Link>
              <Link href={`/f/${form.id}`} className="text-sm text-[var(--unison-teal)]">
                Open landing
              </Link>
              <Button size="sm" variant="ghost" onClick={() => setActiveFormId(form.id)}>
                Submit test
              </Button>
            </div>
            <p className="mt-1 text-sm text-[var(--unison-muted)]">
              {form.description || 'Fields: ' + form.fieldKeys.join(', ')}
            </p>
            {activeFormId === form.id && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Input
                  placeholder="Item name"
                  value={submitName}
                  onChange={(e) => setSubmitName(e.target.value)}
                  className="max-w-sm"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    void fetch(`/api/forms/${form.id}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        fields: {
                          name: submitName || 'Form submission',
                          description: 'Created via form',
                          priority: 'medium',
                        },
                      }),
                    }).then(async (res) => {
                      const data = await res.json();
                      if (!res.ok) setMessage(data.error ?? 'Submit failed');
                      else {
                        setMessage(`Created item ${data.item.name} — automations may have run.`);
                        setSubmitName('');
                        await load();
                      }
                    });
                  }}
                >
                  Submit → create item
                </Button>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
