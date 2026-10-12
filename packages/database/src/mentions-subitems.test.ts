import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository, getDemoStore, resetDemoStore } from './demo-store';

describe('mentions fanout', () => {
  beforeEach(() => resetDemoStore());

  it('notifies mentioned users from @DisplayName in comment body', () => {
    const repo = new DemoRepository();
    const item = getDemoStore().items.find((i) => !i.parentItemId)!;
    const member = getDemoStore().users.find((u) => u.email === 'member@unison.demo')!;
    const before = getDemoStore().notifications.filter((n) => n.userId === member.id).length;

    const comment = repo.addComment(item.id, `Please take a look @${member.displayName}`);
    expect(comment.mentionUserIds).toContain(member.id);

    const after = getDemoStore().notifications.filter(
      (n) => n.userId === member.id && n.type === 'mention',
    );
    expect(after.length).toBeGreaterThan(before);
  });
});

describe('subitems', () => {
  beforeEach(() => resetDemoStore());

  it('creates lists and updates subitems under a parent', () => {
    const repo = new DemoRepository();
    const parent = getDemoStore().items.find((i) => i.name === 'Finalize board templates')!;
    const sub = repo.createItem({
      boardId: parent.boardId,
      groupId: parent.groupId,
      name: 'Write acceptance criteria',
      parentItemId: parent.id,
    });
    expect(sub.parentItemId).toBe(parent.id);
    expect(repo.listSubitems(parent.id).some((i) => i.id === sub.id)).toBe(true);

    const updated = repo.updateItem(sub.id, { status: 'working' });
    expect(updated.status).toBe('working');
    expect(updated.parentItemId).toBe(parent.id);
  });
});

describe('impersonation audit', () => {
  beforeEach(() => resetDemoStore());

  it('records start and stop impersonation in audit logs', () => {
    const repo = new DemoRepository();
    const support = getDemoStore().users.find((u) => u.email === 'support@unison.demo')!;
    const owner = getDemoStore().users.find((u) => u.email === 'owner@unison.demo')!;
    repo.switchUser(support.id);
    repo.startImpersonation(owner.id, 'super_admin');
    expect(
      getDemoStore().auditLogs.some((a) => a.action === 'support.impersonation_start'),
    ).toBe(true);
    repo.stopImpersonation();
    expect(
      getDemoStore().auditLogs.some((a) => a.action === 'support.impersonation_stop'),
    ).toBe(true);
  });
});
