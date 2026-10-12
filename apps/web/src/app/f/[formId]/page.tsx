'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, UnisonWordmark } from '@unison/ui';

interface BoardForm {
  id: string;
  name: string;
  description?: string | null;
  fieldKeys: string[];
  visibility: 'private' | 'public';
  enabled: boolean;
  boardId: string;
}

export default function PublicFormLandingPage() {
  const params = useParams<{ formId: string }>();
  const formId = params.formId;
  const [form, setForm] = useState<BoardForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [honeypot, setHoneypot] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch(`/api/forms/${formId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Form not found');
        setForm(data.form);
      })
      .catch((err: Error) => setError(err.message));
  }, [formId]);

  async function submit() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/forms/${formId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { name, description, priority },
          website: honeypot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Submit failed');
        return;
      }
      setSuccess(`Created “${data.item.name}” on the board.`);
      setName('');
      setDescription('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--unison-surface)] text-[var(--unison-text)]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-10">
        <Link href="/" className="mb-8 inline-flex">
          <UnisonWordmark />
        </Link>
        {!form && !error && <p className="text-[var(--unison-muted)]">Loading form…</p>}
        {error && <p className="text-sm text-[var(--unison-coral)]">{error}</p>}
        {form && (
          <>
            <header className="mb-6 space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--unison-teal)]">
                {form.visibility === 'public' ? 'Public form' : 'Private form'}
              </p>
              <h1 className="font-display text-4xl font-bold">{form.name}</h1>
              <p className="text-[var(--unison-muted)]">
                {form.description || 'Submit to create a board item. Abuse protections apply.'}
              </p>
            </header>
            <div className="space-y-3 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] p-4">
              <label className="block space-y-1 text-sm">
                <span>Name</span>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              {form.fieldKeys.includes('description') && (
                <label className="block space-y-1 text-sm">
                  <span>Description</span>
                  <textarea
                    className="min-h-24 w-full rounded-md border border-[var(--unison-border)] bg-transparent p-2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              )}
              {form.fieldKeys.includes('priority') && (
                <label className="block space-y-1 text-sm">
                  <span>Priority</span>
                  <select
                    className="h-10 w-full rounded-md border border-[var(--unison-border)] bg-transparent px-2"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {['low', 'medium', 'high', 'urgent'].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {/* Honeypot — hidden from users */}
              <label className="absolute -left-[9999px] opacity-0" aria-hidden="true">
                Website
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </label>
              <Button disabled={busy || !name.trim()} onClick={() => void submit()}>
                Submit
              </Button>
              {success && <p className="text-sm text-[var(--unison-teal)]">{success}</p>}
            </div>
          </>
        )}
        <footer className="mt-auto pt-10 text-center text-xs text-[var(--unison-muted)]">
          UNISON · By Majd Asali
        </footer>
      </div>
    </div>
  );
}
