'use client';

import { useEffect, useState } from 'react';
import { Button, Input } from '@unison/ui';

interface Doc {
  id: string;
  title: string;
  body: { blocks: Array<{ id: string; type: string; text: string }> };
  updatedAt: string;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [active, setActive] = useState<Doc | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/docs');
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed');
      return;
    }
    setDocs(data.docs ?? []);
    if (!active && data.docs?.[0]) {
      setActive(data.docs[0]);
      setTitle(data.docs[0].title);
      setText(data.docs[0].body.blocks.map((b: { text: string }) => b.text).join('\n'));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createDoc() {
    const res = await fetch('/api/docs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled doc' }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Create failed');
      return;
    }
    await load();
    setActive(data.doc);
    setTitle(data.doc.title);
    setText('');
  }

  async function save() {
    if (!active) return;
    const res = await fetch(`/api/docs/${active.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title,
        body: {
          blocks: text.split('\n').map((line, i) => ({
            id: `b${i}`,
            type: 'paragraph',
            text: line,
          })),
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Save failed');
      return;
    }
    setActive(data.doc);
    await load();
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-syne)] text-3xl tracking-tight">Docs</h1>
          <p className="mt-1 text-sm text-[var(--unison-muted)]">
            Incremental Workdocs — block-based, not an unsafe giant HTML editor.
          </p>
        </div>
        <Button type="button" onClick={() => void createDoc()}>
          New doc
        </Button>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <aside className="space-y-1 rounded-lg border border-[var(--unison-border)] p-2">
          {docs.length === 0 ? (
            <p className="p-2 text-sm text-[var(--unison-muted)]">No docs yet.</p>
          ) : (
            docs.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`w-full rounded-md px-3 py-2 text-start text-sm ${
                  active?.id === d.id
                    ? 'bg-[var(--unison-ocean)] text-[var(--unison-mist)]'
                    : 'hover:bg-[var(--unison-mist)]'
                }`}
                onClick={() => {
                  setActive(d);
                  setTitle(d.title);
                  setText(d.body.blocks.map((b) => b.text).join('\n'));
                }}
              >
                {d.title}
              </button>
            ))
          )}
        </aside>
        <section className="space-y-3 rounded-lg border border-[var(--unison-border)] p-4">
          {active ? (
            <>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea
                className="min-h-[280px] w-full rounded-md border border-[var(--unison-border)] bg-[var(--unison-surface)] p-3 text-sm"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write paragraphs — one block per line"
              />
              <Button type="button" onClick={() => void save()}>
                Save
              </Button>
            </>
          ) : (
            <p className="text-sm text-[var(--unison-muted)]">Select or create a document.</p>
          )}
        </section>
      </div>
    </div>
  );
}
