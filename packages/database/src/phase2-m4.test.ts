import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository, getDemoStore, resetDemoStore } from './index';

describe('Phase 2 M4 — threads, reactions, column width', () => {
  beforeEach(() => resetDemoStore());

  it('F: reply threads nest one level; deeper replies rejected', () => {
    const repo = new DemoRepository();
    const item = getDemoStore().items.find((i) => i.name.includes('Wire RLS'))!;
    const parent = repo.addComment(item.id, 'Top-level update');
    expect(parent.parentCommentId).toBeNull();
    const reply = repo.addComment(item.id, 'A reply', [], parent.id);
    expect(reply.parentCommentId).toBe(parent.id);
    expect(() => repo.addComment(item.id, 'Too deep', [], reply.id)).toThrow(
      'REPLY_DEPTH_EXCEEDED',
    );
    expect(
      getDemoStore().activity.some((a) => a.eventType === 'comment.replied'),
    ).toBe(true);
  });

  it('F: toggle reactions is tenant-scoped and idempotent toggle', () => {
    const repo = new DemoRepository();
    const seeded = getDemoStore().comments[0]!;
    const after = repo.toggleCommentReaction(seeded.id, '❤️');
    expect(after.reactions['❤️']).toContain(repo.getSession().user.id);
    const toggledOff = repo.toggleCommentReaction(seeded.id, '❤️');
    expect(toggledOff.reactions['❤️']).toBeUndefined();

    const foreign = getDemoStore().organizations.find((o) => o.slug === 'other-tenant')!;
    const other = getDemoStore().users.find((u) => u.email === 'other@tenant.demo')!;
    // Create a comment in foreign org context — switch and ensure cannot react to home comment
    repo.switchUser(other.id);
    expect(repo.getSession().org.id).toBe(foreign.id);
    expect(() => repo.toggleCommentReaction(seeded.id, '👍')).toThrow('CROSS_TENANT_DENIED');
  });

  it('D: updateColumn persists width for structure editors only', () => {
    const repo = new DemoRepository();
    const board = repo.listBoards(repo.getSession().org.id)[0]!;
    const col = repo.getBoardBundle(board.id).columns[0]!;
    const updated = repo.updateColumn(col.id, { width: 220 });
    expect(updated.width).toBe(220);

    const member = getDemoStore().users.find((u) => u.email === 'member@unison.demo')!;
    repo.switchUser(member.id);
    expect(() => repo.updateColumn(col.id, { width: 300 })).toThrow(/FORBIDDEN|STRUCTURE/i);
  });
});
