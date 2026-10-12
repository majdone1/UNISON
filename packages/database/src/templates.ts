import type { ColumnType, ViewType } from '@unison/types';

export interface BoardTemplate {
  key: string;
  name: string;
  description: string;
  groups: string[];
  columns: Array<{ name: string; type: ColumnType }>;
  views: Array<{ name: string; type: ViewType; isDefault?: boolean }>;
  sampleItems?: string[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    key: 'project_management',
    name: 'Project management',
    description: 'Ship work with status, owners, and due dates.',
    groups: ['This week', 'Up next', 'Backlog'],
    columns: [
      { name: 'Status', type: 'status' },
      { name: 'Priority', type: 'priority' },
      { name: 'Owner', type: 'people' },
      { name: 'Due', type: 'date' },
      { name: 'Progress', type: 'progress' },
    ],
    views: [
      { name: 'Table', type: 'table', isDefault: true },
      { name: 'Kanban', type: 'kanban' },
      { name: 'Timeline', type: 'timeline' },
    ],
    sampleItems: ['Kickoff', 'Define milestones'],
  },
  {
    key: 'sprint_board',
    name: 'Sprint board',
    description: 'Lightweight sprint planning board.',
    groups: ['Sprint backlog', 'In progress', 'Review'],
    columns: [
      { name: 'Status', type: 'status' },
      { name: 'Points', type: 'number' },
      { name: 'Owner', type: 'people' },
    ],
    views: [
      { name: 'Table', type: 'table', isDefault: true },
      { name: 'Kanban', type: 'kanban' },
    ],
    sampleItems: ['Story A', 'Bug bash'],
  },
  {
    key: 'crm_pipeline',
    name: 'CRM pipeline',
    description: 'Track deals and follow-ups.',
    groups: ['Leads', 'Qualified', 'Won'],
    columns: [
      { name: 'Status', type: 'status' },
      { name: 'Owner', type: 'people' },
      { name: 'Value', type: 'number' },
      { name: 'Email', type: 'email' },
      { name: 'Next step', type: 'date' },
    ],
    views: [
      { name: 'Table', type: 'table', isDefault: true },
      { name: 'Calendar', type: 'calendar' },
    ],
    sampleItems: ['Acme intro', 'Renewal talk'],
  },
];

export function getBoardTemplate(key: string): BoardTemplate | undefined {
  return BOARD_TEMPLATES.find((t) => t.key === key);
}
