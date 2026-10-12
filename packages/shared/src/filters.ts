import type { BoardColumn, BoardItem } from '@unison/types';

export type FilterOp =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'blank'
  | 'not_blank'
  | 'in';

export interface FilterClause {
  columnId: string;
  op: FilterOp;
  value?: unknown;
}

export interface FilterGroup {
  combinator: 'and' | 'or';
  clauses: FilterClause[];
}

export interface SortSpec {
  columnId: string;
  dir: 'asc' | 'desc';
}

export interface ViewConfig {
  filters?: FilterGroup;
  sorts?: SortSpec[];
  hiddenColumnIds?: string[];
  groupByColumnId?: string | null;
  query?: string;
}

function cellFor(
  item: BoardItem,
  column: BoardColumn,
  getCellValue: (item: BoardItem, column: BoardColumn) => unknown,
): unknown {
  return getCellValue(item, column);
}

function matchClause(
  item: BoardItem,
  clause: FilterClause,
  columnsById: Map<string, BoardColumn>,
  getCellValue: (item: BoardItem, column: BoardColumn) => unknown,
): boolean {
  const column = columnsById.get(clause.columnId);
  if (!column) return false;
  const raw = cellFor(item, column, getCellValue);
  switch (clause.op) {
    case 'blank':
      return raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0);
    case 'not_blank':
      return !(raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0));
    case 'eq':
      return String(raw ?? '') === String(clause.value ?? '');
    case 'neq':
      return String(raw ?? '') !== String(clause.value ?? '');
    case 'contains':
      return String(raw ?? '')
        .toLowerCase()
        .includes(String(clause.value ?? '').toLowerCase());
    case 'gt':
      return Number(raw) > Number(clause.value);
    case 'lt':
      return Number(raw) < Number(clause.value);
    case 'gte':
      return Number(raw) >= Number(clause.value);
    case 'lte':
      return Number(raw) <= Number(clause.value);
    case 'in': {
      const list = Array.isArray(clause.value) ? clause.value.map(String) : [];
      if (Array.isArray(raw)) return raw.some((v) => list.includes(String(v)));
      return list.includes(String(raw ?? ''));
    }
    default:
      return true;
  }
}

export function applyFilterGroup(
  items: BoardItem[],
  group: FilterGroup | undefined,
  columns: BoardColumn[],
  getCellValue: (item: BoardItem, column: BoardColumn) => unknown,
): BoardItem[] {
  if (!group || !group.clauses.length) return items;
  const columnsById = new Map(columns.map((c) => [c.id, c]));
  return items.filter((item) => {
    const results = group.clauses.map((c) => matchClause(item, c, columnsById, getCellValue));
    return group.combinator === 'or' ? results.some(Boolean) : results.every(Boolean);
  });
}

export function applySorts(
  items: BoardItem[],
  sorts: SortSpec[] | undefined,
  columns: BoardColumn[],
  getCellValue: (item: BoardItem, column: BoardColumn) => unknown,
): BoardItem[] {
  if (!sorts?.length) return items;
  const columnsById = new Map(columns.map((c) => [c.id, c]));
  return [...items].sort((a, b) => {
    for (const sort of sorts) {
      const col = columnsById.get(sort.columnId);
      if (!col) continue;
      const av = getCellValue(a, col);
      const bv = getCellValue(b, col);
      const as = av == null ? '' : String(av);
      const bs = bv == null ? '' : String(bv);
      const cmp = as.localeCompare(bs, undefined, { numeric: true });
      if (cmp !== 0) return sort.dir === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

export function applyViewConfig(
  items: BoardItem[],
  config: ViewConfig | undefined,
  columns: BoardColumn[],
  getCellValue: (item: BoardItem, column: BoardColumn) => unknown,
): BoardItem[] {
  let list = items;
  if (config?.query?.trim()) {
    const q = config.query.trim().toLowerCase();
    list = list.filter((i) => i.name.toLowerCase().includes(q));
  }
  list = applyFilterGroup(list, config?.filters, columns, getCellValue);
  list = applySorts(list, config?.sorts, columns, getCellValue);
  return list;
}
