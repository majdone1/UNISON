import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository, getDemoStore, resetDemoStore } from './demo-store';

describe('automation runner', () => {
  beforeEach(() => resetDemoStore());

  it('fires seeded done-notify rule and increments runCount', () => {
    const repo = new DemoRepository();
    const item = getDemoStore().items.find((i) => i.name === 'Finalize board templates')!;
    const before = getDemoStore().automations.find((a) => a.trigger.to === 'done')!.runCount;
    const notifBefore = getDemoStore().notifications.length;

    repo.updateItem(item.id, { status: 'done' });

    const rule = getDemoStore().automations.find((a) => a.trigger.to === 'done')!;
    expect(rule.runCount).toBe(before + 1);
    expect(rule.lastRunAt).toBeTruthy();
    expect(getDemoStore().notifications.length).toBeGreaterThan(notifBefore);
    expect(
      getDemoStore().activity.some((a) => a.eventType === 'automation.ran'),
    ).toBe(true);
  });
});

describe('search tenant isolation', () => {
  beforeEach(() => resetDemoStore());

  it('does not return foreign-tenant boards/items', () => {
    const repo = new DemoRepository();
    const foreign = getDemoStore().organizations.find((o) => o.slug === 'other-tenant')!;
    expect(() => repo.search(foreign.id, 'Launch')).toThrow('CROSS_TENANT_DENIED');
  });

  it('returns only home-org matches including comments', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const result = repo.search(session.org.id, 'Launch');
    expect(result.boards.every((b) => b.orgId === session.org.id)).toBe(true);
    expect(result.items.every((i) => i.orgId === session.org.id)).toBe(true);
    const comments = repo.search(session.org.id, 'prioritize');
    expect(comments.comments.every((c) => c.orgId === session.org.id)).toBe(true);
    expect(comments.comments.length).toBeGreaterThan(0);
  });
});

describe('attachments validation', () => {
  beforeEach(() => resetDemoStore());

  it('rejects disallowed types and accepts text', () => {
    const repo = new DemoRepository();
    const item = getDemoStore().items[0]!;
    expect(() =>
      repo.addAttachment({
        itemId: item.id,
        fileName: 'x.exe',
        contentType: 'application/x-msdownload',
        sizeBytes: 10,
        dataBase64: 'QQ==',
      }),
    ).toThrow('ATTACHMENT_TYPE_DENIED');

    const att = repo.addAttachment({
      itemId: item.id,
      fileName: 'notes.txt',
      contentType: 'text/plain',
      sizeBytes: 4,
      dataBase64: 'dGVzdA==',
    });
    expect(att.storagePath).toContain(`org/${item.orgId}/`);
    expect(repo.listAttachments(item.id)).toHaveLength(1);
  });
});
