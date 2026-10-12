import type { BoardColumn, BoardItem, ColumnSettings, StatusLabel } from '@unison/types';

export const DEFAULT_STATUS_LABELS: StatusLabel[] = [
  { id: 'not_started', name: 'Not started', color: '#94A3B8' },
  { id: 'working', name: 'Working', color: '#3B82F6' },
  { id: 'stuck', name: 'Stuck', color: '#EF4444' },
  { id: 'done', name: 'Done', color: '#22C55E' },
  { id: 'cancelled', name: 'Cancelled', color: '#64748B' },
];

export const DEFAULT_PRIORITY_LABELS: StatusLabel[] = [
  { id: 'none', name: 'None', color: '#CBD5E1' },
  { id: 'low', name: 'Low', color: '#38BDF8' },
  { id: 'medium', name: 'Medium', color: '#FBBF24' },
  { id: 'high', name: 'High', color: '#F97316' },
  { id: 'urgent', name: 'Urgent', color: '#DC2626' },
];

export function defaultSettingsForType(type: BoardColumn['type']): ColumnSettings {
  switch (type) {
    case 'status':
      return {
        labels: DEFAULT_STATUS_LABELS,
        defaultLabelId: 'not_started',
        systemField: 'status',
        summary: 'count',
      };
    case 'priority':
      return {
        labels: DEFAULT_PRIORITY_LABELS,
        defaultLabelId: 'none',
        systemField: 'priority',
        summary: 'count',
      };
    case 'people':
      return { systemField: 'assigneeIds', summary: 'count' };
    case 'date':
      return { systemField: 'dueDate' };
    case 'progress':
      return { systemField: 'progress', summary: 'avg' };
    case 'number':
    case 'duration':
    case 'rating':
    case 'currency':
    case 'vote':
    case 'time_tracking':
      return { summary: 'sum' };
    case 'percentage':
      return { summary: 'avg' };
    case 'formula':
      return { formula: '', summary: 'sum' };
    case 'checkbox':
      return { summary: 'count' };
    default:
      return {};
  }
}

export function getStatusLabels(column: BoardColumn): StatusLabel[] {
  if (column.settings.labels?.length) return column.settings.labels;
  if (column.type === 'priority') return DEFAULT_PRIORITY_LABELS;
  return DEFAULT_STATUS_LABELS;
}

/** Read a cell value for a dynamic column (system fields or values[columnId]). */
export function getCellValue(item: BoardItem, column: BoardColumn): unknown {
  const system = column.settings.systemField;
  if (system === 'status') return item.status;
  if (system === 'priority') return item.priority;
  if (system === 'assigneeIds') return item.assigneeIds;
  if (system === 'dueDate') return item.dueDate ?? null;
  if (system === 'progress') return item.progress;
  if (system === 'name') return item.name;
  if (column.type === 'created_at') return item.createdAt;
  if (column.type === 'updated_at') return item.updatedAt;
  if (column.type === 'created_by') return item.createdBy;
  if (column.type === 'updated_by') return item.updatedBy;
  if (Object.prototype.hasOwnProperty.call(item.values, column.id)) {
    return item.values[column.id];
  }
  // Legacy demo keys (pre–column-id values)
  if (Object.prototype.hasOwnProperty.call(item.values, column.type)) {
    return item.values[column.type];
  }
  return null;
}

export function coerceCellValue(column: BoardColumn, raw: unknown): unknown {
  switch (column.type) {
    case 'number':
    case 'duration':
    case 'progress':
    case 'rating':
    case 'currency':
    case 'percentage':
    case 'vote':
    case 'time_tracking': {
      if (raw === '' || raw === null || raw === undefined) return null;
      const n = Number(raw);
      if (Number.isNaN(n)) throw new Error('INVALID_NUMBER');
      if (column.type === 'progress' || column.type === 'percentage') {
        return Math.min(100, Math.max(0, n));
      }
      if (column.type === 'rating') return Math.min(5, Math.max(0, Math.round(n)));
      if (column.type === 'vote') return Math.max(0, Math.round(n));
      if (column.type === 'currency') return Math.round(n * 100) / 100;
      return n;
    }
    case 'color': {
      const s = String(raw ?? '').trim();
      if (!s) return null;
      if (!/^#[0-9A-Fa-f]{6}$/.test(s)) throw new Error('INVALID_COLOR');
      return s;
    }
    case 'button': {
      // Button cells store optional last-pressed ISO timestamp
      if (raw == null || raw === '') return null;
      return String(raw);
    }
    case 'checkbox':
      return Boolean(raw);
    case 'tags':
    case 'people':
    case 'team':
    case 'dependency':
    case 'relation': {
      if (raw == null) return [];
      if (Array.isArray(raw)) return raw.map(String);
      if (typeof raw === 'string') {
        return raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      throw new Error('INVALID_ARRAY');
    }
    case 'status':
    case 'priority':
    case 'dropdown': {
      const id = String(raw ?? '');
      const labels =
        column.type === 'dropdown'
          ? (column.settings.options ?? []).map((o) => o.id)
          : getStatusLabels(column).map((l) => l.id);
      if (id && labels.length && !labels.includes(id)) {
        throw new Error('INVALID_LABEL');
      }
      return id || null;
    }
    case 'formula':
    case 'created_at':
    case 'updated_at':
    case 'created_by':
    case 'updated_by':
    case 'auto_number':
    case 'mirror':
      throw new Error('COLUMN_READONLY');
    default:
      if (raw == null) return null;
      return typeof raw === 'string' ? raw : String(raw);
  }
}

export type CellPatch = Partial<
  Pick<BoardItem, 'name' | 'status' | 'priority' | 'dueDate' | 'progress' | 'assigneeIds' | 'values'>
>;

/** Build an item patch for a single cell write. */
export function buildCellPatch(
  item: BoardItem,
  column: BoardColumn,
  raw: unknown,
): CellPatch {
  const value = coerceCellValue(column, raw);
  const system = column.settings.systemField;
  if (system === 'status') {
    return { status: value as BoardItem['status'] };
  }
  if (system === 'priority') {
    return { priority: value as BoardItem['priority'] };
  }
  if (system === 'assigneeIds') {
    return { assigneeIds: value as string[] };
  }
  if (system === 'dueDate') {
    return { dueDate: (value as string | null) ?? null };
  }
  if (system === 'progress') {
    return { progress: Number(value ?? 0) };
  }
  if (system === 'name') {
    return { name: String(value ?? '') };
  }
  return {
    values: {
      ...item.values,
      [column.id]: value,
    },
  };
}

export function summarizeColumn(
  items: BoardItem[],
  column: BoardColumn,
): number | null {
  const mode = column.settings.summary ?? 'none';
  if (mode === 'none') return null;
  const nums = items
    .map((item) => getCellValue(item, column))
    .map((v) => (typeof v === 'number' ? v : v == null || v === '' ? null : Number(v)))
    .filter((v): v is number => v != null && !Number.isNaN(v));
  if (mode === 'count') {
    if (column.type === 'checkbox') {
      return items.filter((i) => Boolean(getCellValue(i, column))).length;
    }
    return items.filter((i) => {
      const v = getCellValue(i, column);
      return v != null && v !== '' && !(Array.isArray(v) && v.length === 0);
    }).length;
  }
  if (!nums.length) return null;
  if (mode === 'sum') return nums.reduce((a, b) => a + b, 0);
  if (mode === 'avg') return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (mode === 'min') return Math.min(...nums);
  if (mode === 'max') return Math.max(...nums);
  return null;
}
