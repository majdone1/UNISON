import type { ColumnType } from '@unison/types';

export type ColumnCapability =
  | 'edit'
  | 'filter'
  | 'sort'
  | 'summarize'
  | 'import'
  | 'export'
  | 'mobile';

export interface ColumnTypeDefinition {
  type: ColumnType;
  label: string;
  category: 'text' | 'number' | 'status' | 'people' | 'datetime' | 'media' | 'relation' | 'system' | 'action';
  /** Whether users can add this type from the board UI */
  addable: boolean;
  readonly: boolean;
  capabilities: ColumnCapability[];
  defaultSummary: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
}

const ALL: ColumnCapability[] = ['edit', 'filter', 'sort', 'summarize', 'import', 'export', 'mobile'];

/** Typed column registry — single source of truth for Phase 3 column engine. */
export const COLUMN_REGISTRY: Record<ColumnType, ColumnTypeDefinition> = {
  text: { type: 'text', label: 'Text', category: 'text', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  long_text: { type: 'long_text', label: 'Long text', category: 'text', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  status: { type: 'status', label: 'Status', category: 'status', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'count' },
  priority: { type: 'priority', label: 'Priority', category: 'status', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'count' },
  people: { type: 'people', label: 'People', category: 'people', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'count' },
  team: { type: 'team', label: 'Team', category: 'people', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'count' },
  date: { type: 'date', label: 'Date', category: 'datetime', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  time: { type: 'time', label: 'Time', category: 'datetime', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  datetime: { type: 'datetime', label: 'Date & time', category: 'datetime', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  date_range: { type: 'date_range', label: 'Date range', category: 'datetime', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  timeline: { type: 'timeline', label: 'Timeline', category: 'datetime', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  duration: { type: 'duration', label: 'Duration', category: 'number', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'sum' },
  number: { type: 'number', label: 'Number', category: 'number', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'sum' },
  currency: { type: 'currency', label: 'Currency', category: 'number', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'sum' },
  percentage: { type: 'percentage', label: 'Percentage', category: 'number', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'avg' },
  checkbox: { type: 'checkbox', label: 'Checkbox', category: 'status', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'count' },
  dropdown: { type: 'dropdown', label: 'Dropdown', category: 'status', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'count' },
  link: { type: 'link', label: 'Link', category: 'text', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  email: { type: 'email', label: 'Email', category: 'text', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  phone: { type: 'phone', label: 'Phone', category: 'text', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  location: { type: 'location', label: 'Location', category: 'text', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  tags: { type: 'tags', label: 'Tags', category: 'text', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'count' },
  files: { type: 'files', label: 'Files', category: 'media', addable: true, readonly: false, capabilities: ['edit', 'filter', 'export', 'mobile'], defaultSummary: 'count' },
  rating: { type: 'rating', label: 'Rating', category: 'number', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'avg' },
  progress: { type: 'progress', label: 'Progress', category: 'number', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'avg' },
  formula: { type: 'formula', label: 'Formula', category: 'number', addable: true, readonly: true, capabilities: ['filter', 'sort', 'summarize', 'export'], defaultSummary: 'sum' },
  dependency: { type: 'dependency', label: 'Dependency', category: 'relation', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'count' },
  relation: { type: 'relation', label: 'Connect boards', category: 'relation', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'count' },
  mirror: { type: 'mirror', label: 'Mirror', category: 'relation', addable: true, readonly: true, capabilities: ['filter', 'sort', 'export'], defaultSummary: 'none' },
  auto_number: { type: 'auto_number', label: 'Auto number', category: 'system', addable: true, readonly: true, capabilities: ['filter', 'sort', 'export'], defaultSummary: 'none' },
  created_at: { type: 'created_at', label: 'Created at', category: 'system', addable: true, readonly: true, capabilities: ['filter', 'sort', 'export'], defaultSummary: 'none' },
  updated_at: { type: 'updated_at', label: 'Updated at', category: 'system', addable: true, readonly: true, capabilities: ['filter', 'sort', 'export'], defaultSummary: 'none' },
  created_by: { type: 'created_by', label: 'Created by', category: 'system', addable: true, readonly: true, capabilities: ['filter', 'sort', 'export'], defaultSummary: 'none' },
  updated_by: { type: 'updated_by', label: 'Updated by', category: 'system', addable: true, readonly: true, capabilities: ['filter', 'sort', 'export'], defaultSummary: 'none' },
  week: { type: 'week', label: 'Week', category: 'datetime', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  country: { type: 'country', label: 'Country', category: 'text', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'count' },
  color: { type: 'color', label: 'Color', category: 'media', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'none' },
  image: { type: 'image', label: 'Image', category: 'media', addable: true, readonly: false, capabilities: ['edit', 'export', 'mobile'], defaultSummary: 'count' },
  vote: { type: 'vote', label: 'Vote', category: 'number', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'sum' },
  button: { type: 'button', label: 'Button', category: 'action', addable: true, readonly: false, capabilities: ['edit', 'mobile'], defaultSummary: 'none' },
  time_tracking: { type: 'time_tracking', label: 'Time tracking', category: 'number', addable: true, readonly: false, capabilities: ALL, defaultSummary: 'sum' },
};

export function listAddableColumnTypes(): ColumnTypeDefinition[] {
  return Object.values(COLUMN_REGISTRY).filter((d) => d.addable && !d.readonly);
}

export function getColumnDefinition(type: ColumnType): ColumnTypeDefinition {
  return COLUMN_REGISTRY[type];
}

export function columnSupports(type: ColumnType, capability: ColumnCapability): boolean {
  return COLUMN_REGISTRY[type].capabilities.includes(capability);
}
