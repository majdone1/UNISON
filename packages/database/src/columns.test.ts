import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository, getDemoStore, resetDemoStore } from './index';

describe('dynamic columns (Phase 2 C)', () => {
  beforeEach(() => resetDemoStore());

  it('admin/owner can create column; member cannot alter structure', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const board = repo.listBoards(session.org.id)[0]!;

    const column = repo.createColumn({
      boardId: board.id,
      name: 'Effort',
      type: 'number',
    });
    expect(column.settings.summary).toBe('sum');
    expect(repo.getBoardBundle(board.id).columns.some((c) => c.id === column.id)).toBe(true);

    const member = getDemoStore().users.find((u) => u.email === 'member@unison.demo')!;
    repo.switchUser(member.id);
    expect(() =>
      repo.createColumn({ boardId: board.id, name: 'Nope', type: 'text' }),
    ).toThrow('FORBIDDEN');
    expect(() => repo.deleteColumn(column.id)).toThrow('FORBIDDEN');
  });

  it('setCellValue writes system status and custom values with tenant isolation', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const bundle = repo.getBoardBundle(repo.listBoards(session.org.id)[0]!.id);
    const item = bundle.items.find((i) => !i.parentItemId)!;
    const statusCol = bundle.columns.find((c) => c.type === 'status')!;
    const numberCol = repo.createColumn({
      boardId: bundle.board.id,
      name: 'Points',
      type: 'number',
    });

    const updated = repo.setCellValue(item.id, statusCol.id, 'done');
    expect(updated.status).toBe('done');
    const withPoints = repo.setCellValue(item.id, numberCol.id, 8);
    expect(withPoints.values[numberCol.id]).toBe(8);

    const foreign = getDemoStore().organizations.find((o) => o.slug === 'other-tenant')!;
    expect(() => repo.listBoards(foreign.id)).toThrow('CROSS_TENANT_DENIED');
  });

  it('locks system columns from delete; allows custom delete + value cleanup', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const board = repo.listBoards(session.org.id)[0]!;
    const statusCol = repo.getBoardBundle(board.id).columns.find((c) => c.type === 'status')!;
    expect(() => repo.deleteColumn(statusCol.id)).toThrow('COLUMN_SYSTEM_LOCKED');

    const custom = repo.createColumn({ boardId: board.id, name: 'Note', type: 'text' });
    const item = repo.getBoardBundle(board.id).items[0]!;
    repo.setCellValue(item.id, custom.id, 'hello');
    repo.deleteColumn(custom.id);
    const after = repo.getBoardBundle(board.id).items.find((i) => i.id === item.id)!;
    expect(after.values[custom.id]).toBeUndefined();
  });

  it('member can edit cells but not create groups (structure)', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const board = repo.listBoards(session.org.id)[0]!;
    const member = getDemoStore().users.find((u) => u.email === 'member@unison.demo')!;
    repo.switchUser(member.id);
    const item = repo.getBoardBundle(board.id).items.find((i) => !i.parentItemId)!;
    const statusCol = repo.getBoardBundle(board.id).columns.find((c) => c.type === 'status')!;
    expect(repo.setCellValue(item.id, statusCol.id, 'stuck').status).toBe('stuck');
    expect(() => repo.createGroup(board.id, 'Secret group')).toThrow('FORBIDDEN');
  });
});
