'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input } from '@unison/ui';

interface Channel {
  id: string;
  name: string;
  kind: string;
  topic?: string | null;
}

interface Message {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  linkRefs?: Array<{ type: string; href: string; id: string }>;
}

export default function MessagesPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/messages/channels');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load channels');
      setChannels(data.channels ?? []);
      if (!activeId && data.channels?.[0]) setActiveId(data.channels[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  const loadMessages = useCallback(async (channelId: string) => {
    const res = await fetch(`/api/messages/channels/${channelId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to load messages');
      return;
    }
    setMessages(data.messages ?? []);
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (activeId) void loadMessages(activeId);
  }, [activeId, loadMessages]);

  const active = useMemo(
    () => channels.find((c) => c.id === activeId) ?? null,
    [channels, activeId],
  );

  async function send() {
    if (!activeId || !draft.trim()) return;
    const res = await fetch(`/api/messages/channels/${activeId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: draft }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Send failed');
      return;
    }
    setDraft('');
    await loadMessages(activeId);
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4 p-6">
      <header>
        <h1 className="font-[family-name:var(--font-syne)] text-3xl tracking-tight text-[var(--unison-ink)]">
          Messages
        </h1>
        <p className="mt-1 text-sm text-[var(--unison-muted)]">
          Native channels and DMs — permission-safe links into boards and items.
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--unison-muted)]">Loading channels…</p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
          <aside className="overflow-auto rounded-lg border border-[var(--unison-border)] bg-[var(--unison-sand)]/40 p-2">
            {channels.length === 0 ? (
              <p className="p-3 text-sm text-[var(--unison-muted)]">No channels yet.</p>
            ) : (
              channels.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={`mb-1 w-full rounded-md px-3 py-2 text-start text-sm transition ${
                    c.id === activeId
                      ? 'bg-[var(--unison-ocean)] text-[var(--unison-mist)]'
                      : 'hover:bg-[var(--unison-mist)]'
                  }`}
                >
                  <div className="font-medium">
                    {c.kind === 'dm' ? '' : '#'}
                    {c.name}
                  </div>
                  <div className="text-xs opacity-70">{c.kind}</div>
                </button>
              ))
            )}
          </aside>

          <section className="flex min-h-0 flex-col rounded-lg border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)]">
            <div className="border-b border-[var(--unison-border)] px-4 py-3">
              <h2 className="text-lg font-semibold">
                {active ? `${active.kind === 'dm' ? '' : '#'}${active.name}` : 'Select a channel'}
              </h2>
              {active?.topic ? (
                <p className="text-xs text-[var(--unison-muted)]">{active.topic}</p>
              ) : null}
            </div>
            <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
              {messages.length === 0 ? (
                <p className="text-sm text-[var(--unison-muted)]">No messages yet — say hello.</p>
              ) : (
                messages.map((m) => (
                  <article key={m.id} className="rounded-md bg-[var(--unison-mist)]/60 px-3 py-2">
                    <div className="text-xs text-[var(--unison-muted)]">
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
                    {m.linkRefs?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.linkRefs.map((l) => (
                          <a
                            key={`${l.type}-${l.id}`}
                            href={l.href}
                            className="text-xs font-medium text-[var(--unison-ocean)] underline"
                          >
                            Open {l.type}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
            <div className="flex gap-2 border-t border-[var(--unison-border)] p-3">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button type="button" onClick={() => void send()} disabled={!draft.trim() || !activeId}>
                Send
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
