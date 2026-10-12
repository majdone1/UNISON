'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Input } from '@unison/ui';
import type { Team, Workspace } from '@unison/types';

type TeamRow = Team & { memberIds: string[] };

export default function TeamsSettingsPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [teamName, setTeamName] = useState('');
  const [wsName, setWsName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [t, w] = await Promise.all([
      fetch('/api/teams').then((r) => r.json()),
      fetch('/api/workspaces').then((r) => r.json()),
    ]);
    setTeams(t.teams ?? []);
    setWorkspaces(w.workspaces ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createTeam() {
    setError(null);
    setMessage(null);
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName, workspaceId: workspaces[0]?.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to create team');
      return;
    }
    setTeamName('');
    setMessage(`Created team ${data.team.name}`);
    await load();
  }

  async function createWorkspace() {
    setError(null);
    setMessage(null);
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: wsName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to create workspace');
      return;
    }
    setWsName('');
    setMessage(`Created workspace ${data.workspace.name}`);
    await load();
  }

  async function removeTeam(id: string) {
    setError(null);
    const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed to delete team');
      return;
    }
    await load();
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-4xl font-bold">Workspaces & teams</h1>
        <p className="text-[var(--unison-muted)]">
          <code>workspace_admin</code>+ can create workspaces and teams (server-enforced). Org billing
          stays admin/owner only. Members and guests cannot mutate.
        </p>
      </header>

      {error && <p className="text-sm text-[var(--unison-coral)]">{error}</p>}
      {message && <p className="text-sm text-[var(--unison-teal)]">{message}</p>}

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Workspaces</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="New workspace name"
            value={wsName}
            onChange={(e) => setWsName(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={() => void createWorkspace()}>Create workspace</Button>
        </div>
        <ul className="space-y-2">
          {workspaces.map((ws) => (
            <li
              key={ws.id}
              className="flex items-center justify-between rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3"
            >
              <div>
                <div className="font-medium">{ws.name}</div>
                <div className="text-sm text-[var(--unison-muted)]">{ws.slug}</div>
              </div>
              <Badge>workspace</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Teams</h2>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="New team name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={() => void createTeam()}>Create team</Button>
        </div>
        <ul className="space-y-2">
          {teams.map((team) => (
            <li
              key={team.id}
              className="flex items-center justify-between rounded-xl border border-[var(--unison-border)] bg-[var(--unison-surface-elevated)] px-4 py-3"
            >
              <div>
                <div className="font-medium">{team.name}</div>
                <div className="text-sm text-[var(--unison-muted)]">
                  {team.memberIds.length} members
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => void removeTeam(team.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
