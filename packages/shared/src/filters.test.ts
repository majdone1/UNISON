import { describe, expect, it } from 'vitest';
import type { BoardColumn, BoardItem } from '@unison/types';
import { applyViewConfig } from './filters';
import { getCellValue, defaultSettingsForType } from './column-values';

function col(id: string, name: string, type: BoardColumn['type']): BoardColumn {
  return {
    id,
    boardId: 'b',
    orgId: 'o',
    name,
    type,
    position: 0,
    width: 120,
    isHidden: false,
    settings: defaultSettingsForType(type),
  };
}

function item(partial: Partial<BoardItem>): BoardItem {
  return {
    id: 'i',
    boardId: 'b',
    groupId: 'g',
    orgId: 'o',
    name: 'Item',
    status: 'working',
    priority: 'medium',
    position: 0,
    progress: 0,
    assigneeIds: [],
    watcherIds: [],
    values: {},
    createdBy: 'u',
    updatedBy: 'u',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('view filters', () => {
  it('filters by status eq and sorts by name', () => {
    const status = col('c-status', 'Status', 'status');
    const items = [
      item({ id: '1', name: 'B', status: 'done' }),
      item({ id: '2', name: 'A', status: 'working' }),
      item({ id: '3', name: 'C', status: 'done' }),
    ];
    const out = applyViewConfig(
      items,
      {
        filters: { combinator: 'and', clauses: [{ columnId: 'c-status', op: 'eq', value: 'done' }] },
        sorts: [{ columnId: 'c-status', dir: 'asc' }],
        query: '',
      },
      [status],
      getCellValue,
    );
    expect(out.map((i) => i.id)).toEqual(['1', '3']);
  });

  it('supports OR contains on name via query + number gt', () => {
    const num = col('c-num', 'Points', 'number');
    const items = [
      item({ id: '1', name: 'Alpha', values: { 'c-num': 2 } }),
      item({ id: '2', name: 'Beta', values: { 'c-num': 9 } }),
    ];
    const out = applyViewConfig(
      items,
      {
        filters: {
          combinator: 'or',
          clauses: [
            { columnId: 'c-num', op: 'gt', value: 5 },
            { columnId: 'c-num', op: 'eq', value: 2 },
          ],
        },
      },
      [num],
      getCellValue,
    );
    expect(out).toHaveLength(2);
  });
});
