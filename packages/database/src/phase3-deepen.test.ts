import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository, resetDemoStore } from './demo-store';
import { runAutomations } from './automation-runner';

describe('Phase 3 deepen — views seed, automations, signed files', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('seeds gantt/pivot/map/cards views', () => {
    const repo = new DemoRepository();
    const boards = repo.listBoards(repo.getSession().org.id);
    const bundle = repo.getBoardBundle(boards[0]!.id);
    const types = new Set(bundle.views.map((v) => v.type));
    expect(types.has('gantt')).toBe(true);
    expect(types.has('pivot')).toBe(true);
    expect(types.has('map')).toBe(true);
    expect(types.has('cards')).toBe(true);
  });

  it('notify.channel posts into workspace chat', () => {
    const store = resetDemoStore();
    const repo = new DemoRepository();
    const item = store.items.find((i) => i.orgId === repo.getSession().org.id && !i.parentItemId)!;
    const before = store.chatMessages.length;
    const results = runAutomations(
      store,
      { ...item, status: 'stuck' },
      { type: 'item.status_changed', previousStatus: 'working' },
      repo.getSession().user.id,
    );
    expect(results.some((r) => r.actionsFired.includes('notify.channel'))).toBe(true);
    expect(store.chatMessages.length).toBeGreaterThan(before);
  });

  it('integration.slack skips when disconnected and fires when mock-connected', () => {
    const store = resetDemoStore();
    const repo = new DemoRepository();
    const item = store.items.find((i) => i.orgId === repo.getSession().org.id)!;
    // ensure slack disconnected
    const slack = store.integrationConnections.find((c) => c.providerId === 'slack')!;
    slack.status = 'disconnected';
    const skipped = runAutomations(
      store,
      { ...item, status: 'done' },
      { type: 'item.status_changed', previousStatus: 'working' },
      repo.getSession().user.id,
    );
    expect(
      skipped.some((r) => r.actionsFired.includes('integration.slack:skipped_not_connected')),
    ).toBe(true);

    repo.connectIntegration('slack');
    const fired = runAutomations(
      store,
      { ...item, status: 'done' },
      { type: 'item.status_changed', previousStatus: 'working' },
      repo.getSession().user.id,
    );
    expect(fired.some((r) => r.actionsFired.includes('integration.slack'))).toBe(true);
  });

  it('issues non-public signed attachment URLs', () => {
    const repo = new DemoRepository();
    const boards = repo.listBoards(repo.getSession().org.id);
    const bundle = repo.getBoardBundle(boards[0]!.id);
    const item = bundle.items[0]!;
    const att = repo.addAttachment({
      itemId: item.id,
      fileName: 'spec.txt',
      contentType: 'text/plain',
      sizeBytes: 12,
      dataBase64: Buffer.from('hello unison').toString('base64'),
    });
    const signed = repo.getSignedAttachmentUrl(att.id, 120);
    expect(signed.public).toBe(false);
    expect(signed.url).toContain(`/api/files/${att.id}/content`);
    expect(signed.expiresAt > new Date().toISOString()).toBe(true);
  });

  it('creates API extensions for org admins', () => {
    const repo = new DemoRepository();
    const ext = repo.createApiExtension({
      name: 'Status widget',
      kind: 'widget',
      config: { source: 'statusDistribution' },
    });
    expect(repo.listApiExtensions().some((e) => e.id === ext.id)).toBe(true);
  });
});
