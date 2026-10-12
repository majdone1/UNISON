import { beforeEach, describe, expect, it } from 'vitest';
import { applyViewConfig, getCellValue } from '@unison/shared';
import { DemoRepository, getDemoStore, resetDemoStore } from './index';

describe('Phase 2 M5 — filters, viewer, labels, forms', () => {
  beforeEach(() => resetDemoStore());

  it('H: AND/OR filter groups apply via ViewConfig DSL', () => {
    const repo = new DemoRepository();
    const board = repo.listBoards(repo.getSession().org.id)[0]!;
    const bundle = repo.getBoardBundle(board.id);
    const statusCol = bundle.columns.find((c) => c.type === 'status')!;
    const andDone = applyViewConfig(
      bundle.items.filter((i) => !i.parentItemId),
      {
        filters: {
          combinator: 'and',
          clauses: [{ columnId: statusCol.id, op: 'eq', value: 'done' }],
        },
      },
      bundle.columns,
      getCellValue,
    );
    expect(andDone.every((i) => i.status === 'done')).toBe(true);

    const orGroup = applyViewConfig(
      bundle.items.filter((i) => !i.parentItemId),
      {
        filters: {
          combinator: 'or',
          clauses: [
            { columnId: statusCol.id, op: 'eq', value: 'done' },
            { columnId: statusCol.id, op: 'eq', value: 'stuck' },
          ],
        },
      },
      bundle.columns,
      getCellValue,
    );
    expect(orGroup.length).toBeGreaterThanOrEqual(andDone.length);
  });

  it('A: viewer cannot write items, cells, or files', () => {
    const repo = new DemoRepository();
    const viewer = getDemoStore().users.find((u) => u.email === 'viewer@unison.demo')!;
    expect(viewer).toBeTruthy();
    repo.switchUser(viewer.id);
    expect(repo.getSession().membership.role).toBe('viewer');
    const item = getDemoStore().items[0]!;
    expect(() => repo.updateItem(item.id, { name: 'Nope' })).toThrow(/FORBIDDEN|ENTITLEMENT/);
    const col = getDemoStore().columns.find((c) => c.boardId === item.boardId)!;
    expect(() => repo.setCellValue(item.id, col.id, 'x')).toThrow(/FORBIDDEN|COLUMN_WRITE/);
    expect(() =>
      repo.addAttachment({
        itemId: item.id,
        fileName: 'x.txt',
        contentType: 'text/plain',
        sizeBytes: 1,
        dataBase64: 'YQ==',
      }),
    ).toThrow('FORBIDDEN');
  });

  it('A: column writeMinRole blocks members on admin-only priority', () => {
    const repo = new DemoRepository();
    const member = getDemoStore().users.find((u) => u.email === 'member@unison.demo')!;
    const item = getDemoStore().items[0]!;
    const priority = getDemoStore().columns.find(
      (c) => c.boardId === item.boardId && c.type === 'priority',
    )!;
    expect(priority.settings.permissions?.writeMinRole).toBe('admin');
    repo.switchUser(member.id);
    expect(() => repo.setCellValue(item.id, priority.id, 'high')).toThrow(
      'COLUMN_WRITE_FORBIDDEN',
    );
    const owner = getDemoStore().users.find((u) => u.email === 'owner@unison.demo')!;
    repo.switchUser(owner.id);
    const updated = repo.setCellValue(item.id, priority.id, 'high');
    expect(updated.priority).toBe('high');
  });

  it('C: status label admin persists custom labels; relation links same-board items', () => {
    const repo = new DemoRepository();
    const board = repo.listBoards(repo.getSession().org.id)[0]!;
    const status = repo.getBoardBundle(board.id).columns.find((c) => c.type === 'status')!;
    const nextLabels = [
      ...(status.settings.labels ?? []),
      { id: 'blocked', name: 'Blocked', color: '#B91C1C' },
    ];
    const updated = repo.updateColumn(status.id, {
      settings: { ...status.settings, labels: nextLabels },
    });
    expect(updated.settings.labels?.some((l) => l.id === 'blocked')).toBe(true);

    const relation = repo.getBoardBundle(board.id).columns.find((c) => c.type === 'relation')!;
    const [a, b] = repo.getBoardBundle(board.id).items.filter((i) => !i.parentItemId);
    expect(a && b).toBeTruthy();
    const linked = repo.setCellValue(a!.id, relation.id, [b!.id]);
    expect(linked.values[relation.id]).toEqual([b!.id]);
    expect(() => repo.setCellValue(a!.id, relation.id, ['not-a-uuid-item'])).toThrow(
      /RELATION_ITEM_INVALID|ITEM/,
    );
  });

  it('M: form honeypot and submit cap reject abuse', () => {
    const repo = new DemoRepository();
    const form = repo.listForms(repo.getSession().org.id)[0]!;
    expect(() =>
      repo.submitForm(form.id, { name: 'Spam' }, { honeypot: 'http://bot' }),
    ).toThrow('FORM_ABUSE_REJECTED');

    form.submissionCount = 200;
    expect(() => repo.submitForm(form.id, { name: 'Over' })).toThrow('FORM_SUBMIT_LIMIT');
  });
});
