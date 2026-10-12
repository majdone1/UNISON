import { describe, expect, it } from 'vitest';
import type { BoardColumn, BoardItem } from '@unison/types';
import {
  buildCellPatch,
  coerceCellValue,
  defaultSettingsForType,
  getCellValue,
  summarizeColumn,
} from './column-values';

function col(partial: Partial<BoardColumn> & Pick<BoardColumn, 'id' | 'type'>): BoardColumn {
  return {
    boardId: 'b',
    orgId: 'o',
    name: partial.name ?? partial.type,
    position: 0,
    width: 140,
    isHidden: false,
    settings: defaultSettingsForType(partial.type),
    ...partial,
  };
}

function item(partial: Partial<BoardItem> = {}): BoardItem {
  return {
    id: 'i1',
    boardId: 'b',
    groupId: 'g',
    orgId: 'o',
    name: 'Row',
    status: 'working',
    priority: 'high',
    position: 0,
    progress: 40,
    assigneeIds: ['u1'],
    watcherIds: [],
    values: {},
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('column values', () => {
  it('reads system fields for status/people/date', () => {
    const row = item();
    expect(getCellValue(row, col({ id: 'c1', type: 'status' }))).toBe('working');
    expect(getCellValue(row, col({ id: 'c2', type: 'people' }))).toEqual(['u1']);
    expect(getCellValue(row, col({ id: 'c3', type: 'progress' }))).toBe(40);
  });

  it('coerces and patches custom number cells by column id', () => {
    const column = col({ id: 'c-num', type: 'number' });
    expect(coerceCellValue(column, '12.5')).toBe(12.5);
    const patch = buildCellPatch(item(), column, '12.5');
    expect(patch.values?.['c-num']).toBe(12.5);
  });

  it('rejects invalid status labels', () => {
    expect(() => coerceCellValue(col({ id: 'c1', type: 'status' }), 'nope')).toThrow(
      'INVALID_LABEL',
    );
  });

  it('summarizes numeric columns', () => {
    const column = col({ id: 'c-num', type: 'number', settings: { summary: 'sum' } });
    const items = [
      item({ id: 'a', values: { 'c-num': 2 } }),
      item({ id: 'b', values: { 'c-num': 5 } }),
    ];
    expect(summarizeColumn(items, column)).toBe(7);
  });
});
