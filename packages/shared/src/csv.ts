import type { BoardColumn, BoardItem } from '@unison/types';
import { getCellValue } from './column-values';

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Export root items to CSV (name + visible columns). */
export function boardItemsToCsv(
  items: BoardItem[],
  columns: BoardColumn[],
): string {
  const cols = columns.filter((c) => !c.isHidden).sort((a, b) => a.position - b.position);
  const header = ['id', 'name', 'groupId', 'status', 'priority', ...cols.map((c) => c.name)];
  const lines = [header.map(escapeCsv).join(',')];
  for (const item of items.filter((i) => !i.parentItemId && !i.archivedAt)) {
    const row = [
      item.id,
      item.name,
      item.groupId,
      item.status,
      item.priority,
      ...cols.map((c) => {
        const v = getCellValue(item, c);
        if (v == null) return '';
        if (Array.isArray(v)) return v.join(';');
        return String(v);
      }),
    ];
    lines.push(row.map(escapeCsv).join(','));
  }
  return lines.join('\n') + '\n';
}

export interface CsvImportRow {
  name: string;
  status?: string;
  priority?: string;
  description?: string;
}

/** Minimal CSV parse for import (header row required). */
export function parseBoardCsv(text: string): CsvImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const nameIdx = headers.findIndex((h) => h === 'name' || h === 'item' || h === 'title');
  if (nameIdx < 0) throw new Error('CSV_NAME_COLUMN_REQUIRED');
  const statusIdx = headers.indexOf('status');
  const priorityIdx = headers.indexOf('priority');
  const descIdx = headers.findIndex((h) => h === 'description' || h === 'desc');
  const rows: CsvImportRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const name = (cells[nameIdx] ?? '').trim();
    if (!name) continue;
    rows.push({
      name: name.slice(0, 240),
      status: statusIdx >= 0 ? cells[statusIdx]?.trim() : undefined,
      priority: priorityIdx >= 0 ? cells[priorityIdx]?.trim() : undefined,
      description: descIdx >= 0 ? cells[descIdx]?.trim() : undefined,
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
