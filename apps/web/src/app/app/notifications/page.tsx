'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button } from '@unison/ui';
import type { Notification, NotificationPreferences } from '@unison/types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [res, prefRes] = await Promise.all([
      fetch('/api/notifications'),
      fetch('/api/notifications/preferences'),
    ]);
    const data = await res.json();
    const prefData = await prefRes.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to load');
      return;
    }
    setNotifications(data.notifications ?? []);
    setPrefs(prefData.preferences ?? null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function patchPref(patch: Partial<NotificationPreferences>) {
    const res = await fetch('/api/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) setPrefs(data.preferences);
  }

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-bold">Notifications</h1>
          <p className="text-[var(--unison-muted)]">
            In-app center with read/unread. Email/push/desktop use mock adapters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={unread ? 'accent' : 'neutral'}>{unread} unread</Badge>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ all: true }),
              }).then(() => load());
            }}
          >
            Mark all read
          </Button>
        </div>
      </header>

      {error && <p className="text-sm text-[var(--unison-coral)]">{error}</p>}

      {prefs && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3 text-sm">
          {(
            [
              ['inApp', 'In-app'],
              ['email', 'Email'],
              ['push', 'Push'],
              ['desktop', 'Desktop'],
              ['digestEmail', 'Email digest'],
              ['muteAssign', 'Mute assigns'],
              ['muteMention', 'Mute mentions'],
              ['muteAutomation', 'Mute automations'],
              ['muteMessage', 'Mute messages'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(prefs[key])}
                onChange={(e) => void patchPref({ [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <p className="text-[var(--unison-muted)]">No notifications.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">{n.title}</div>
                  {!n.readAt && <Badge tone="accent">Unread</Badge>}
                </div>
                <p className="text-sm text-[var(--unison-muted)]">{n.body}</p>
                <p className="mt-1 text-xs text-[var(--unison-muted)]">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
                {n.href && (
                  <Link href={n.href} className="text-sm text-[var(--unison-teal)] underline">
                    Open
                  </Link>
                )}
              </div>
              {!n.readAt && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void fetch('/api/notifications', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: n.id }),
                    }).then(() => load());
                  }}
                >
                  Mark read
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
