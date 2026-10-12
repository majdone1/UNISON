import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository, resetDemoStore } from './demo-store';

describe('Phase 3 — roles / time / messages / integrations', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('lists custom roles and previews permissions', () => {
    const repo = new DemoRepository();
    const roles = repo.listCustomRoles();
    expect(roles.some((r) => r.name === 'Contractor')).toBe(true);
    const preview = repo.previewRolePermissions(roles[0]!.id);
    const fin = preview.find((p) => p.action === 'time:read_financial');
    expect(fin?.allowed).toBe(false);
    expect(fin?.source).toBe('deny');
  });

  it('redacts financial time fields for members', () => {
    const repo = new DemoRepository();
    // switch to member
    const member = resetDemoStore().users.find((u) => u.email === 'member@unison.demo')!;
    repo.switchUser(member.id);
    const entries = repo.listTimeEntries();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0]!.costCents).toBeNull();
    expect(entries[0]!.billableCents).toBeNull();
  });

  it('allows workspace_admin to see financial time fields', () => {
    const store = resetDemoStore();
    const repo = new DemoRepository();
    const ws = store.users.find((u) => u.email === 'wsadmin@unison.demo')!;
    repo.switchUser(ws.id);
    const entries = repo.listTimeEntries();
    expect(entries[0]!.costCents).toBe(7500);
  });

  it('posts messages in channels and notifies other members', () => {
    const store = resetDemoStore();
    const repo = new DemoRepository();
    const channels = repo.listChannels();
    const general = channels.find((c) => c.name === 'general')!;
    const before = store.notifications.length;
    const msg = repo.postMessage({ channelId: general.id, body: 'Ship Phase 3 messages' });
    expect(msg.body).toContain('Phase 3');
    expect(store.notifications.length).toBeGreaterThan(before);
    expect(store.notifications[0]!.type).toBe('message.new');
  });

  it('mock-connects Slack without exposing secret values', () => {
    const repo = new DemoRepository();
    const before = repo.listIntegrations();
    expect(before.providers.some((p) => p.id === 'slack')).toBe(true);
    const connected = repo.connectIntegration('slack');
    expect(connected.status).toBe('connected_mock');
    expect(connected.credentialRef).toBe('[ref]');
  });

  it('creates and updates workdocs incrementally', () => {
    const repo = new DemoRepository();
    const doc = repo.createWorkdoc({ title: 'Spec' });
    const updated = repo.updateWorkdoc(doc.id, {
      body: { blocks: [{ id: 'b1', type: 'paragraph', text: 'Hello UNISON' }] },
    });
    expect(updated.body.blocks[0]!.text).toBe('Hello UNISON');
  });
});
