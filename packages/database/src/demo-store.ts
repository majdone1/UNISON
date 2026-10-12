import {
  accumulateTimeEntries,
  boardItemsToCsv,
  buildCellPatch,
  buildFormulaContext,
  createMockSignedFileUrl,
  defaultSettingsForType,
  DEFAULT_STATUS_LABELS,
  DEFAULT_PRIORITY_LABELS,
  demoUuid,
  evaluateFormula,
  getCellValue,
  INTEGRATION_REGISTRY,
  mockConnectProvider,
  nowIso,
  parseBoardCsv,
  redactTimeEntryFinancial,
  resolveMentions,
  slugify,
  sortByPosition,
  summarizeColumn,
  validateTimeEntryInput,
  type ViewConfig,
  type WebhookDeliveryRecord,
} from '@unison/shared';
import type {
  ApiAppExtension,
  AuditLogEntry,
  Board,
  BoardColumn,
  BoardGroup,
  BoardItem,
  BoardView,
  ChatChannel,
  ChatMessage,
  Comment,
  ColumnType,
  CustomRole,
  DemoSession,
  IntegrationConnection,
  IntegrationProviderId,
  Notification,
  NotificationPreferences,
  Organization,
  OrgMembership,
  OrgRole,
  PlanId,
  PlatformRole,
  Subscription,
  SubscriptionStatus,
  Team,
  TimeEntry,
  TimeEntryKind,
  User,
  ViewVisibility,
  Workdoc,
  Workspace,
} from '@unison/types';
import { runAutomations } from './automation-runner';
import { BOARD_TEMPLATES, getBoardTemplate } from './templates';
import { authorize, hasMinOrgRole, PERMISSION_CATALOG, previewPermission } from '@unison/auth';
import type { PermissionAction } from '@unison/auth';
import { MockBillingProvider, resolveEntitlements, PLANS, type BillingWebhookEvent } from '@unison/billing';
import type { AutomationCondition } from './automation-runner';

export interface ActivityEvent {
  id: string;
  orgId: string;
  boardId?: string | null;
  itemId?: string | null;
  actorUserId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface Attachment {
  id: string;
  orgId: string;
  itemId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storagePath: string;
  /** Demo-only inline payload (base64) — never for production */
  dataBase64?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface AutomationRule {
  id: string;
  orgId: string;
  boardId?: string | null;
  name: string;
  enabled: boolean;
  /** WHEN */
  trigger: { type: string; to?: string; from?: string; withinDays?: number };
  /** IF (optional) */
  conditions?: AutomationCondition[];
  /** THEN */
  actions: Array<{
    type: string;
    channel?: string;
    adapter?: string;
    userId?: string;
    status?: string;
    field?: string;
    value?: unknown;
    groupId?: string;
    url?: string;
    method?: string;
    headers?: Record<string, string>;
  }>;
  createdAt: string;
  lastRunAt?: string | null;
  runCount: number;
}

export type WebhookDelivery = WebhookDeliveryRecord;

export interface AutomationRun {
  id: string;
  orgId: string;
  automationId: string;
  itemId: string;
  triggerType: string;
  actionsFired: string[];
  status: 'ok' | 'error' | 'skipped_loop';
  detail?: string;
  createdAt: string;
}

export interface BoardForm {
  id: string;
  orgId: string;
  boardId: string;
  name: string;
  description?: string | null;
  /** Column ids (or system fields) collected by the form */
  fieldKeys: string[];
  visibility: 'private' | 'public';
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  submissionCount: number;
}

export interface Invitation {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  token: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  createdAt: string;
}

export interface DemoStoreState {
  users: User[];
  organizations: Organization[];
  memberships: OrgMembership[];
  platformRoles: Record<string, PlatformRole>;
  workspaces: Workspace[];
  teams: Team[];
  boards: Board[];
  groups: BoardGroup[];
  columns: BoardColumn[];
  items: BoardItem[];
  views: BoardView[];
  comments: Comment[];
  notifications: Notification[];
  auditLogs: AuditLogEntry[];
  subscriptions: Subscription[];
  activity: ActivityEvent[];
  attachments: Attachment[];
  automations: AutomationRule[];
  automationRuns: AutomationRun[];
  webhookDeliveries: WebhookDelivery[];
  notificationPrefs: Record<string, NotificationPreferences>;
  forms: BoardForm[];
  invitations: Invitation[];
  teamMembers: TeamMember[];
  boardRevisions: Record<string, number>;
  /** Phase 3 */
  customRoles: CustomRole[];
  chatChannels: ChatChannel[];
  chatMessages: ChatMessage[];
  timeEntries: TimeEntry[];
  integrationConnections: IntegrationConnection[];
  workdocs: Workdoc[];
  apiExtensions: ApiAppExtension[];
  currentUserId: string;
  impersonatorUserId?: string | null;
}

function seedState(): DemoStoreState {
  const ownerId = demoUuid('user-owner');
  const memberId = demoUuid('user-member');
  const wsAdminId = demoUuid('user-ws-admin');
  const viewerId = demoUuid('user-viewer');
  const guestId = demoUuid('user-guest');
  const supportId = demoUuid('user-support');
  const orgId = demoUuid('org-acme');
  const org2Id = demoUuid('org-other');
  const wsId = demoUuid('ws-product');
  const teamId = demoUuid('team-core');
  const boardId = demoUuid('board-launch');
  const boardMarketingId = demoUuid('board-marketing');
  const g1 = demoUuid('group-now');
  const g2 = demoUuid('group-next');
  const gMkt = demoUuid('group-mkt');
  const now = nowIso();

  const users: User[] = [
    {
      id: ownerId,
      email: 'owner@unison.demo',
      displayName: 'Ava Chen',
      locale: 'en',
      createdAt: now,
    },
    {
      id: memberId,
      email: 'member@unison.demo',
      displayName: 'Jordan Lee',
      locale: 'en',
      createdAt: now,
    },
    {
      id: wsAdminId,
      email: 'wsadmin@unison.demo',
      displayName: 'Wendy Workspace',
      locale: 'en',
      createdAt: now,
    },
    {
      id: viewerId,
      email: 'viewer@unison.demo',
      displayName: 'Vera Viewer',
      locale: 'en',
      createdAt: now,
    },
    {
      id: guestId,
      email: 'guest@unison.demo',
      displayName: 'Sam Guest',
      locale: 'en',
      createdAt: now,
    },
    {
      id: supportId,
      email: 'support@unison.demo',
      displayName: 'Riley Support',
      locale: 'en',
      createdAt: now,
    },
  ];

  const organizations: Organization[] = [
    {
      id: orgId,
      name: 'Acme Collective',
      slug: 'acme',
      status: 'active',
      planId: 'trial',
      seatLimit: PLANS.trial.seatLimit,
      createdAt: now,
    },
    {
      id: org2Id,
      name: 'Other Tenant',
      slug: 'other-tenant',
      status: 'active',
      planId: 'starter',
      seatLimit: PLANS.starter.seatLimit,
      createdAt: now,
    },
  ];

  const memberships: OrgMembership[] = [
    { id: demoUuid('mem-1'), orgId, userId: ownerId, role: 'owner', createdAt: now },
    { id: demoUuid('mem-2'), orgId, userId: memberId, role: 'member', createdAt: now },
    {
      id: demoUuid('mem-ws-admin'),
      orgId,
      userId: wsAdminId,
      role: 'workspace_admin',
      createdAt: now,
    },
    { id: demoUuid('mem-viewer'), orgId, userId: viewerId, role: 'viewer', createdAt: now },
    { id: demoUuid('mem-3'), orgId, userId: guestId, role: 'guest', createdAt: now },
    {
      id: demoUuid('mem-4'),
      orgId: org2Id,
      userId: demoUuid('user-other-owner'),
      role: 'owner',
      createdAt: now,
    },
  ];

  users.push({
    id: demoUuid('user-other-owner'),
    email: 'other@tenant.demo',
    displayName: 'Other Owner',
    locale: 'en',
    createdAt: now,
  });

  const workspaces: Workspace[] = [
    {
      id: wsId,
      orgId,
      name: 'Product',
      slug: 'product',
      description: 'Product delivery workspace',
      createdAt: now,
    },
  ];

  const teams: Team[] = [{ id: teamId, orgId, workspaceId: wsId, name: 'Core', createdAt: now }];

  const boards: Board[] = [
    {
      id: boardId,
      orgId,
      workspaceId: wsId,
      name: 'Launch Orchestration',
      description: 'Ship the UNISON launch together.',
      visibility: 'workspace',
      templateKey: 'project_management',
      position: 0,
      createdBy: ownerId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: boardMarketingId,
      orgId,
      workspaceId: wsId,
      name: 'Marketing Ops',
      description: 'Campaigns linked from product boards.',
      visibility: 'workspace',
      position: 1,
      createdBy: ownerId,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const groups: BoardGroup[] = [
    { id: g1, boardId, orgId, name: 'This week', color: '#1F6F6A', position: 0 },
    { id: g2, boardId, orgId, name: 'Up next', color: '#E86F4A', position: 1 },
    { id: gMkt, boardId: boardMarketingId, orgId, name: 'Campaigns', color: '#0E7490', position: 0 },
  ];

  const columns: BoardColumn[] = [
    {
      id: demoUuid('col-status'),
      boardId,
      orgId,
      name: 'Status',
      type: 'status',
      position: 0,
      width: 140,
      isHidden: false,
      settings: {
        labels: DEFAULT_STATUS_LABELS,
        defaultLabelId: 'not_started',
        systemField: 'status',
        summary: 'count',
      },
    },
    {
      id: demoUuid('col-priority'),
      boardId,
      orgId,
      name: 'Priority',
      type: 'priority',
      position: 1,
      width: 120,
      isHidden: false,
      settings: {
        labels: DEFAULT_PRIORITY_LABELS,
        defaultLabelId: 'none',
        systemField: 'priority',
        summary: 'count',
        /** Demo: only admin+ can change priority cells */
        permissions: { writeMinRole: 'admin' },
      },
    },
    {
      id: demoUuid('col-people'),
      boardId,
      orgId,
      name: 'Owner',
      type: 'people',
      position: 2,
      width: 160,
      isHidden: false,
      settings: { systemField: 'assigneeIds', summary: 'count' },
    },
    {
      id: demoUuid('col-date'),
      boardId,
      orgId,
      name: 'Due',
      type: 'date',
      position: 3,
      width: 140,
      isHidden: false,
      settings: { systemField: 'dueDate' },
    },
    {
      id: demoUuid('col-progress'),
      boardId,
      orgId,
      name: 'Progress',
      type: 'progress',
      position: 4,
      width: 120,
      isHidden: false,
      settings: { systemField: 'progress', summary: 'avg' },
    },
    {
      id: demoUuid('col-travel'),
      boardId,
      orgId,
      name: 'Travel hours',
      type: 'duration',
      position: 5,
      width: 120,
      isHidden: false,
      settings: { summary: 'sum' },
    },
    {
      id: demoUuid('col-work'),
      boardId,
      orgId,
      name: 'Work hours',
      type: 'duration',
      position: 6,
      width: 120,
      isHidden: false,
      settings: { summary: 'sum' },
    },
    {
      id: demoUuid('col-total-hours'),
      boardId,
      orgId,
      name: 'Total hours',
      type: 'formula',
      position: 7,
      width: 120,
      isHidden: false,
      settings: {
        formula: '{Travel hours} + {Work hours}',
        summary: 'sum',
      },
    },
    {
      id: demoUuid('col-related'),
      boardId,
      orgId,
      name: 'Related items',
      type: 'relation',
      position: 8,
      width: 180,
      isHidden: false,
      settings: {
        relatedBoardId: boardId,
        summary: 'count',
      },
    },
    {
      id: demoUuid('col-cross-board'),
      boardId,
      orgId,
      name: 'Campaign',
      type: 'relation',
      position: 9,
      width: 180,
      isHidden: false,
      settings: {
        relatedBoardId: boardMarketingId,
        summary: 'count',
      },
    },
    {
      id: demoUuid('col-mkt-status'),
      boardId: boardMarketingId,
      orgId,
      name: 'Status',
      type: 'status',
      position: 0,
      width: 140,
      isHidden: false,
      settings: {
        labels: DEFAULT_STATUS_LABELS,
        defaultLabelId: 'not_started',
        systemField: 'status',
      },
    },
  ];

  const items: BoardItem[] = [
    {
      id: demoUuid('item-1'),
      boardId,
      groupId: g1,
      orgId,
      name: 'Finalize board templates',
      description: 'Table, Kanban, and Calendar starter layouts.',
      status: 'working',
      priority: 'high',
      position: 0,
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      progress: 60,
      assigneeIds: [ownerId],
      watcherIds: [memberId],
      values: {
        [demoUuid('col-travel')]: 1.5,
        [demoUuid('col-work')]: 6,
        [demoUuid('col-total-hours')]: 7.5,
      },
      createdBy: ownerId,
      updatedBy: ownerId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: demoUuid('item-2'),
      boardId,
      groupId: g1,
      orgId,
      name: 'Wire RLS deny-by-default',
      description: 'Tenant isolation tests must pass.',
      status: 'stuck',
      priority: 'urgent',
      position: 1,
      dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
      progress: 35,
      assigneeIds: [memberId],
      watcherIds: [ownerId],
      values: {
        [demoUuid('col-travel')]: 0.5,
        [demoUuid('col-work')]: 4,
        [demoUuid('col-total-hours')]: 4.5,
      },
      createdBy: ownerId,
      updatedBy: memberId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: demoUuid('item-3'),
      boardId,
      groupId: g2,
      orgId,
      name: 'Ship mobile My Work',
      status: 'not_started',
      priority: 'medium',
      position: 0,
      progress: 0,
      assigneeIds: [memberId],
      watcherIds: [],
      values: {
        [demoUuid('col-travel')]: 0,
        [demoUuid('col-work')]: 0,
        [demoUuid('col-total-hours')]: 0,
      },
      createdBy: ownerId,
      updatedBy: ownerId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: demoUuid('sub-1'),
      boardId,
      groupId: g1,
      orgId,
      parentItemId: demoUuid('item-1'),
      name: 'Document column types',
      status: 'done',
      priority: 'low',
      position: 0,
      progress: 100,
      assigneeIds: [ownerId],
      watcherIds: [],
      values: {},
      createdBy: ownerId,
      updatedBy: ownerId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: demoUuid('item-mkt-1'),
      boardId: boardMarketingId,
      groupId: gMkt,
      orgId,
      name: 'Launch webinar',
      status: 'working',
      priority: 'high',
      position: 0,
      progress: 40,
      assigneeIds: [memberId],
      watcherIds: [ownerId],
      values: {},
      createdBy: ownerId,
      updatedBy: ownerId,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: demoUuid('item-mkt-2'),
      boardId: boardMarketingId,
      groupId: gMkt,
      orgId,
      name: 'Partner newsletter',
      status: 'not_started',
      priority: 'medium',
      position: 1,
      progress: 0,
      assigneeIds: [wsAdminId],
      watcherIds: [],
      values: {},
      createdBy: ownerId,
      updatedBy: ownerId,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const views: BoardView[] = [
    {
      id: demoUuid('view-table'),
      boardId,
      orgId,
      name: 'Table',
      type: 'table',
      config: {},
      position: 0,
      isDefault: true,
      visibility: 'shared',
      ownerUserId: null,
    },
    {
      id: demoUuid('view-kanban'),
      boardId,
      orgId,
      name: 'Kanban',
      type: 'kanban',
      config: { groupBy: 'status' },
      position: 1,
      visibility: 'shared',
      ownerUserId: null,
    },
    {
      id: demoUuid('view-calendar'),
      boardId,
      orgId,
      name: 'Calendar',
      type: 'calendar',
      config: { dateField: 'dueDate' },
      position: 2,
      visibility: 'shared',
      ownerUserId: null,
    },
    {
      id: demoUuid('view-timeline'),
      boardId,
      orgId,
      name: 'Timeline',
      type: 'timeline',
      config: {},
      position: 3,
      visibility: 'shared',
      ownerUserId: null,
    },
    {
      id: demoUuid('view-my-working'),
      boardId,
      orgId,
      name: 'My working items',
      type: 'table',
      config: {
        filters: {
          combinator: 'and',
          clauses: [{ columnId: demoUuid('col-status'), op: 'eq', value: 'working' }],
        },
        sorts: [{ columnId: demoUuid('col-priority'), dir: 'desc' }],
      } satisfies ViewConfig,
      position: 4,
      visibility: 'personal',
      ownerUserId: ownerId,
    },
    {
      id: demoUuid('view-workload'),
      boardId,
      orgId,
      name: 'Workload',
      type: 'workload',
      config: {},
      position: 5,
      visibility: 'shared',
      ownerUserId: null,
    },
    {
      id: demoUuid('view-chart'),
      boardId,
      orgId,
      name: 'Status chart',
      type: 'chart',
      config: {},
      position: 6,
      visibility: 'shared',
      ownerUserId: null,
    },
    {
      id: demoUuid('view-gantt'),
      boardId,
      orgId,
      name: 'Gantt',
      type: 'gantt',
      config: {},
      position: 7,
      visibility: 'shared',
      ownerUserId: null,
    },
    {
      id: demoUuid('view-pivot'),
      boardId,
      orgId,
      name: 'Pivot',
      type: 'pivot',
      config: {},
      position: 8,
      visibility: 'shared',
      ownerUserId: null,
    },
    {
      id: demoUuid('view-cards'),
      boardId,
      orgId,
      name: 'Cards',
      type: 'cards',
      config: {},
      position: 9,
      visibility: 'shared',
      ownerUserId: null,
    },
    {
      id: demoUuid('view-map'),
      boardId,
      orgId,
      name: 'Map',
      type: 'map',
      config: {},
      position: 10,
      visibility: 'shared',
      ownerUserId: null,
    },
  ];

  const comments: Comment[] = [
    {
      id: demoUuid('comment-1'),
      orgId,
      itemId: demoUuid('item-2'),
      authorId: ownerId,
      body: 'Please prioritize tenant isolation tests before UI polish.',
      mentionUserIds: [memberId],
      parentCommentId: null,
      reactions: { '👍': [memberId] },
      createdAt: now,
      updatedAt: now,
    },
  ];

  const notifications: Notification[] = [
    {
      id: demoUuid('notif-1'),
      userId: memberId,
      orgId,
      type: 'mention',
      title: 'You were mentioned',
      body: 'Ava mentioned you on Wire RLS deny-by-default',
      href: `/app/boards/${boardId}?item=${demoUuid('item-2')}`,
      createdAt: now,
    },
  ];

  const subscriptions: Subscription[] = [
    {
      id: demoUuid('sub-acme'),
      orgId,
      planId: 'trial',
      status: 'trialing',
      seats: 10,
      trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      provider: 'mock',
    },
    {
      id: demoUuid('sub-other'),
      orgId: org2Id,
      planId: 'starter',
      status: 'active',
      seats: 15,
      provider: 'mock',
    },
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: demoUuid('audit-1'),
      orgId,
      actorUserId: ownerId,
      action: 'board.created',
      resourceType: 'board',
      resourceId: boardId,
      metadata: { name: 'Launch Orchestration' },
      createdAt: now,
    },
  ];

  return {
    users,
    organizations,
    memberships,
    platformRoles: {
      [ownerId]: 'none',
      [supportId]: 'super_admin',
    },
    workspaces,
    teams,
    boards,
    groups,
    columns,
    items,
    views,
    comments,
    notifications,
    auditLogs,
    subscriptions,
    activity: [
      {
        id: demoUuid('activity-1'),
        orgId,
        boardId,
        itemId: demoUuid('item-1'),
        actorUserId: ownerId,
        eventType: 'item.created',
        payload: { name: 'Finalize board templates' },
        createdAt: now,
      },
    ],
    attachments: [],
    automations: [
      {
        id: demoUuid('auto-done-notify'),
        orgId,
        boardId,
        name: 'Notify watchers when done',
        enabled: true,
        trigger: { type: 'item.status_changed', to: 'done' },
        actions: [
          { type: 'notify.watchers', channel: 'in_app' },
          { type: 'notify.email', adapter: 'mock' },
        ],
        createdAt: now,
        lastRunAt: null,
        runCount: 0,
      },
      {
        id: demoUuid('auto-stuck-alert'),
        orgId,
        boardId,
        name: 'Alert assignees when stuck',
        enabled: true,
        trigger: { type: 'item.status_changed', to: 'stuck' },
        actions: [{ type: 'notify.assignees', channel: 'in_app' }],
        createdAt: now,
        lastRunAt: null,
        runCount: 0,
      },
      {
        id: demoUuid('auto-created-assign'),
        orgId,
        boardId,
        name: 'Assign creator on item created',
        enabled: true,
        trigger: { type: 'item.created' },
        actions: [{ type: 'assign.actor' }],
        createdAt: now,
        lastRunAt: null,
        runCount: 0,
      },
      {
        id: demoUuid('auto-webhook-done'),
        orgId,
        boardId,
        name: 'Webhook when done (mock HTTP)',
        enabled: true,
        trigger: { type: 'item.status_changed', to: 'done' },
        actions: [
          {
            type: 'webhook.http',
            url: 'https://hooks.example.com/unison/done',
            method: 'POST',
            adapter: 'mock',
          },
        ],
        createdAt: now,
        lastRunAt: null,
        runCount: 0,
      },
      {
        id: demoUuid('auto-channel-stuck'),
        orgId,
        boardId,
        name: 'Post to #general when stuck',
        enabled: true,
        trigger: { type: 'item.status_changed', to: 'stuck' },
        actions: [{ type: 'notify.channel', value: 'general' }],
        createdAt: now,
        lastRunAt: null,
        runCount: 0,
      },
      {
        id: demoUuid('auto-slack-done'),
        orgId,
        boardId,
        name: 'Slack mock when done (requires Slack mock connect)',
        enabled: true,
        trigger: { type: 'item.status_changed', to: 'done' },
        actions: [{ type: 'integration.slack' }],
        createdAt: now,
        lastRunAt: null,
        runCount: 0,
      },
      {
        id: demoUuid('auto-due-soon'),
        orgId,
        boardId,
        name: 'Notify watchers when due within 2 days',
        enabled: true,
        trigger: { type: 'item.due_within', withinDays: 2 },
        actions: [{ type: 'notify.watchers', channel: 'in_app' }],
        createdAt: now,
        lastRunAt: null,
        runCount: 0,
      },
      {
        id: demoUuid('auto-done-complete-date'),
        orgId,
        boardId,
        name: 'WHEN done IF not blank name THEN set completion note',
        enabled: true,
        trigger: { type: 'item.status_changed', to: 'done' },
        conditions: [{ field: 'name', op: 'not_blank' }],
        actions: [
          { type: 'set_field', field: 'progress', value: 100 },
          { type: 'set_date', field: 'dueDate', value: 0 },
        ],
        createdAt: now,
        lastRunAt: null,
        runCount: 0,
      },
      {
        id: demoUuid('auto-created-default-status'),
        orgId,
        boardId,
        name: 'WHEN created THEN default status working',
        enabled: false,
        trigger: { type: 'item.created' },
        actions: [{ type: 'set_status', status: 'working' }],
        createdAt: now,
        lastRunAt: null,
        runCount: 0,
      },
    ],
    automationRuns: [],
    webhookDeliveries: [],
    notificationPrefs: {
      [ownerId]: {
        userId: ownerId,
        orgId,
        inApp: true,
        email: true,
        push: false,
        desktop: true,
        digestEmail: false,
        muteAssign: false,
        muteMention: false,
        muteAutomation: false,
        muteMessage: false,
      },
      [memberId]: {
        userId: memberId,
        orgId,
        inApp: true,
        email: true,
        push: true,
        desktop: true,
        digestEmail: true,
        muteAssign: false,
        muteMention: false,
        muteAutomation: false,
        muteMessage: false,
      },
    },
    forms: [
      {
        id: demoUuid('form-intake'),
        orgId,
        boardId,
        name: 'Intake request',
        description: 'Public-style intake that creates a board item (demo).',
        fieldKeys: ['name', 'description', demoUuid('col-priority')],
        visibility: 'public',
        enabled: true,
        createdBy: ownerId,
        createdAt: now,
        submissionCount: 0,
      },
    ],
    invitations: [],
    teamMembers: [{ teamId, userId: ownerId, createdAt: now }],
    boardRevisions: { [boardId]: 1, [boardMarketingId]: 1 },
    customRoles: [
      {
        id: demoUuid('role-contractor'),
        orgId,
        name: 'Contractor',
        description: 'Member baseline without financial time fields or integration manage',
        baseRole: 'member',
        grants: [],
        denies: ['time:read_financial', 'integration:manage'],
        createdAt: now,
        updatedAt: now,
      },
    ],
    chatChannels: [
      {
        id: demoUuid('channel-general'),
        orgId,
        kind: 'workspace',
        name: 'general',
        topic: 'Org-wide coordination',
        workspaceId: wsId,
        memberIds: [ownerId, memberId, wsAdminId, viewerId],
        createdBy: ownerId,
        createdAt: now,
      },
      {
        id: demoUuid('channel-dm'),
        orgId,
        kind: 'dm',
        name: 'Ava ↔ Jordan',
        memberIds: [ownerId, memberId],
        createdBy: ownerId,
        createdAt: now,
      },
    ],
    chatMessages: [
      {
        id: demoUuid('msg-1'),
        orgId,
        channelId: demoUuid('channel-general'),
        authorId: ownerId,
        body: 'Welcome to UNISON Messages — share board and item links safely.',
        mentionUserIds: [],
        linkRefs: [{ type: 'board', id: boardId, href: `/app/boards/${boardId}` }],
        createdAt: now,
        updatedAt: now,
      },
    ],
    timeEntries: [
      {
        id: demoUuid('time-1'),
        orgId,
        boardId,
        itemId: demoUuid('item-1'),
        userId: memberId,
        kind: 'work',
        minutes: 90,
        note: 'Template polish',
        workedOn: now.slice(0, 10),
        costCents: 7500,
        billableCents: 12000,
        createdAt: now,
      },
    ],
    integrationConnections: INTEGRATION_REGISTRY.map((p) => ({
      id: demoUuid(`integ-${p.id}`),
      orgId,
      providerId: p.id,
      status: p.id === 'webhooks' ? 'connected_mock' : 'disconnected',
      displayName: p.name,
      credentialRef: p.id === 'webhooks' ? 'cred_ref_webhooks_demo' : null,
      scopes: p.id === 'webhooks' ? ['write'] : [],
      createdAt: now,
      updatedAt: now,
      lastError: null,
    })),
    workdocs: [
      {
        id: demoUuid('doc-1'),
        orgId,
        workspaceId: wsId,
        boardId,
        title: 'Launch notes',
        body: {
          blocks: [
            { id: demoUuid('blk-1'), type: 'paragraph', text: 'Draft launch checklist for UNISON.' },
          ],
        },
        createdBy: ownerId,
        updatedBy: ownerId,
        createdAt: now,
        updatedAt: now,
      },
    ],
    apiExtensions: [],
    currentUserId: ownerId,
    impersonatorUserId: null,
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __UNISON_DEMO_STORE__: DemoStoreState | undefined;
}

export function getDemoStore(): DemoStoreState {
  if (!globalThis.__UNISON_DEMO_STORE__) {
    globalThis.__UNISON_DEMO_STORE__ = seedState();
  } else {
    // Hot-reload safety: ensure newly added collections exist
    const store = globalThis.__UNISON_DEMO_STORE__;
    store.activity ??= [];
    store.attachments ??= [];
    store.automations ??= seedState().automations;
    store.automationRuns ??= [];
    store.webhookDeliveries ??= [];
    store.notificationPrefs ??= {};
    store.forms ??= [];
    store.invitations ??= [];
    store.teamMembers ??= [];
    store.boardRevisions ??= {};
    store.customRoles ??= [];
    store.chatChannels ??= [];
    store.chatMessages ??= [];
    store.timeEntries ??= [];
    store.integrationConnections ??= [];
    store.workdocs ??= [];
    store.apiExtensions ??= [];
    for (const v of store.views ?? []) {
      if (!v.visibility) {
        v.visibility = 'shared';
        v.ownerUserId = null;
      }
    }
    for (const c of store.comments ?? []) {
      c.parentCommentId ??= null;
      c.reactions ??= {};
    }
  }
  return globalThis.__UNISON_DEMO_STORE__;
}

export function resetDemoStore(): DemoStoreState {
  globalThis.__UNISON_DEMO_STORE__ = seedState();
  return globalThis.__UNISON_DEMO_STORE__;
}

function audit(
  store: DemoStoreState,
  entry: Omit<AuditLogEntry, 'id' | 'createdAt' | 'impersonatorUserId'>,
) {
  store.auditLogs.unshift({
    ...entry,
    id: demoUuid(`audit-${Date.now()}-${Math.random()}`),
    createdAt: nowIso(),
    impersonatorUserId: store.impersonatorUserId ?? null,
  });
}

export class DemoRepository {
  constructor(private store: DemoStoreState = getDemoStore()) {}

  getSession(): DemoSession {
    const user = this.store.users.find((u) => u.id === this.store.currentUserId);
    if (!user) throw new Error('NO_SESSION');
    const platformRole = this.store.platformRoles[user.id] ?? 'none';
    let membership = this.store.memberships.find((m) => m.userId === user.id);
    // Platform staff may have no org seat; attach a read-only synthetic membership on first org.
    if (!membership && (platformRole === 'super_admin' || platformRole === 'support')) {
      const org = this.store.organizations[0];
      if (!org) throw new Error('NO_ORG');
      membership = {
        id: demoUuid(`synthetic-mem-${user.id}`),
        orgId: org.id,
        userId: user.id,
        role: 'guest',
        createdAt: nowIso(),
      };
    }
    if (!membership) throw new Error('NO_MEMBERSHIP');
    const org = this.store.organizations.find((o) => o.id === membership!.orgId);
    if (!org) throw new Error('NO_ORG');
    return {
      user,
      org,
      membership,
      platformRole,
    };
  }

  switchUser(userId: string) {
    if (!this.store.users.some((u) => u.id === userId)) throw new Error('USER_NOT_FOUND');
    this.store.currentUserId = userId;
    this.store.impersonatorUserId = null;
  }

  startImpersonation(targetUserId: string, actorPlatformRole: PlatformRole) {
    if (actorPlatformRole !== 'super_admin' && actorPlatformRole !== 'support') {
      throw new Error('FORBIDDEN');
    }
    const actorId = this.store.currentUserId;
    this.store.impersonatorUserId = actorId;
    this.store.currentUserId = targetUserId;
    audit(this.store, {
      orgId: null,
      actorUserId: actorId,
      action: 'support.impersonation_start',
      resourceType: 'user',
      resourceId: targetUserId,
      metadata: { auditable: true },
    });
  }

  stopImpersonation() {
    if (!this.store.impersonatorUserId) return;
    const target = this.store.currentUserId;
    const actor = this.store.impersonatorUserId;
    this.store.currentUserId = actor;
    this.store.impersonatorUserId = null;
    audit(this.store, {
      orgId: null,
      actorUserId: actor,
      action: 'support.impersonation_stop',
      resourceType: 'user',
      resourceId: target,
      metadata: { auditable: true },
    });
  }

  listWorkspaces(orgId: string): Workspace[] {
    this.assertOrgAccess(orgId);
    return this.store.workspaces.filter((w) => w.orgId === orgId);
  }

  listBoards(orgId: string, workspaceId?: string): Board[] {
    this.assertOrgAccess(orgId);
    const session = this.getSession();
    return sortByPosition(
      this.store.boards.filter((b) => {
        if (b.orgId !== orgId || b.archivedAt) return false;
        if (workspaceId && b.workspaceId !== workspaceId) return false;
        if (b.visibility === 'private' && b.createdBy !== session.user.id) {
          return session.platformRole !== 'none';
        }
        return true;
      }),
    );
  }

  assertBoardAccess(board: Board) {
    this.assertOrgAccess(board.orgId);
    const session = this.getSession();
    if (
      board.visibility === 'private' &&
      board.createdBy !== session.user.id &&
      session.platformRole === 'none'
    ) {
      throw new Error('BOARD_PRIVATE_DENIED');
    }
  }

  getBoardBundle(boardId: string) {
    const board = this.store.boards.find((b) => b.id === boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    return {
      board,
      groups: sortByPosition(
        this.store.groups.filter((g) => g.boardId === boardId && !g.archivedAt),
      ),
      columns: sortByPosition(this.store.columns.filter((c) => c.boardId === boardId)),
      items: sortByPosition(
        this.store.items.filter((i) => i.boardId === boardId && !i.archivedAt),
      ),
      views: sortByPosition(
        this.store.views.filter((v) => {
          if (v.boardId !== boardId) return false;
          if (v.visibility === 'personal' && v.ownerUserId !== this.getSession().user.id) {
            return false;
          }
          return true;
        }),
      ),
      comments: this.store.comments.filter((c) =>
        this.store.items.some((i) => i.id === c.itemId && i.boardId === boardId),
      ),
      members: this.store.memberships
        .filter((m) => m.orgId === board.orgId)
        .map((m) => ({
          ...m,
          user: this.store.users.find((u) => u.id === m.userId)!,
        })),
    };
  }

  requireWriteAccess(orgId: string) {
    this.assertOrgAccess(orgId);
    const entitlements = this.getEntitlements();
    if (!entitlements.canWriteItems) {
      throw new Error(entitlements.isPastDue ? 'ENTITLEMENT_PAST_DUE' : 'ENTITLEMENT_SUSPENDED');
    }
    if (
      !authorize({
        orgRole: this.getSession().membership.role,
        platformRole: this.getSession().platformRole,
        action: 'board:write',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
  }

  requireStructureAccess(orgId: string) {
    this.assertOrgAccess(orgId);
    const entitlements = this.getEntitlements();
    if (!entitlements.canWriteItems) {
      throw new Error(entitlements.isPastDue ? 'ENTITLEMENT_PAST_DUE' : 'ENTITLEMENT_SUSPENDED');
    }
    if (
      !authorize({
        orgRole: this.getSession().membership.role,
        platformRole: this.getSession().platformRole,
        action: 'board:structure',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
  }

  createBoard(input: {
    orgId: string;
    workspaceId: string;
    name: string;
    description?: string;
    visibility?: Board['visibility'];
    templateKey?: string;
  }): Board {
    this.assertOrgAccess(input.orgId);
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'board:write',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    const subscription = this.store.subscriptions.find((s) => s.orgId === input.orgId)!;
    const org = this.store.organizations.find((o) => o.id === input.orgId)!;
    const entitlements = resolveEntitlements({
      org,
      subscription,
      seatUsage: this.store.memberships.filter((m) => m.orgId === input.orgId).length,
      boardUsage: this.store.boards.filter((b) => b.orgId === input.orgId && !b.archivedAt).length,
    });
    if (!entitlements.canCreateBoard) {
      throw new Error(
        entitlements.isPastDue
          ? 'ENTITLEMENT_PAST_DUE'
          : entitlements.isSuspended
            ? 'ENTITLEMENT_SUSPENDED'
            : 'ENTITLEMENT_BOARD_LIMIT',
      );
    }

    const template = input.templateKey ? getBoardTemplate(input.templateKey) : undefined;
    const now = nowIso();
    const board: Board = {
      id: demoUuid(`board-${Date.now()}`),
      orgId: input.orgId,
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description ?? template?.description,
      visibility: input.visibility ?? 'workspace',
      templateKey: input.templateKey ?? template?.key ?? null,
      position: this.store.boards.filter((b) => b.workspaceId === input.workspaceId).length,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };
    this.store.boards.push(board);
    this.store.boardRevisions[board.id] = 1;

    const groupNames = template?.groups ?? ['New group'];
    groupNames.forEach((name, index) => {
      this.store.groups.push({
        id: demoUuid(`group-${Date.now()}-${index}`),
        boardId: board.id,
        orgId: input.orgId,
        name,
        color: index === 0 ? '#1F6F6A' : '#E86F4A',
        position: index,
      });
    });

    (template?.columns ?? [{ name: 'Status', type: 'status' as const }]).forEach((col, index) => {
      this.store.columns.push({
        id: demoUuid(`col-${Date.now()}-${index}`),
        boardId: board.id,
        orgId: input.orgId,
        name: col.name,
        type: col.type,
        position: index,
        width: 140,
        isHidden: false,
        settings: defaultSettingsForType(col.type),
      });
    });

    (template?.views ?? [{ name: 'Table', type: 'table' as const, isDefault: true }]).forEach(
      (view, index) => {
        this.store.views.push({
          id: demoUuid(`view-${Date.now()}-${index}`),
          boardId: board.id,
          orgId: input.orgId,
          name: view.name,
          type: view.type,
          config: {},
          position: index,
          isDefault: Boolean(view.isDefault),
          visibility: 'shared',
          ownerUserId: null,
        });
      },
    );

    const firstGroup = this.store.groups.find((g) => g.boardId === board.id)!;
    for (const sample of template?.sampleItems ?? []) {
      this.createItem({
        boardId: board.id,
        groupId: firstGroup.id,
        name: sample,
      });
    }

    audit(this.store, {
      orgId: input.orgId,
      actorUserId: session.user.id,
      action: 'board.created',
      resourceType: 'board',
      resourceId: board.id,
      metadata: { name: board.name, templateKey: board.templateKey },
    });
    return board;
  }

  createGroup(boardId: string, name: string, color = '#1F6F6A'): BoardGroup {
    const board = this.store.boards.find((b) => b.id === boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    this.requireStructureAccess(board.orgId);
    const group: BoardGroup = {
      id: demoUuid(`group-${Date.now()}`),
      boardId,
      orgId: board.orgId,
      name,
      color,
      position: this.store.groups.filter((g) => g.boardId === boardId).length,
    };
    this.store.groups.push(group);
    this.bumpBoard(boardId);
    return group;
  }

  createColumn(input: {
    boardId: string;
    name: string;
    type: ColumnType;
    settings?: BoardColumn['settings'];
    width?: number;
    position?: number;
  }): BoardColumn {
    const board = this.store.boards.find((b) => b.id === input.boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    this.requireStructureAccess(board.orgId);
    const boardCols = this.store.columns.filter((c) => c.boardId === input.boardId);
    const column: BoardColumn = {
      id: demoUuid(`col-${Date.now()}`),
      boardId: input.boardId,
      orgId: board.orgId,
      name: input.name,
      type: input.type,
      position: input.position ?? boardCols.length,
      width: input.width ?? 140,
      isHidden: false,
      settings: {
        ...defaultSettingsForType(input.type),
        ...(input.settings ?? {}),
      },
    };
    this.store.columns.push(column);
    this.bumpBoard(input.boardId);
    audit(this.store, {
      orgId: board.orgId,
      actorUserId: this.getSession().user.id,
      action: 'column.created',
      resourceType: 'column',
      resourceId: column.id,
      metadata: { boardId: board.id, type: column.type, name: column.name },
    });
    return column;
  }

  updateColumn(
    columnId: string,
    patch: Partial<Pick<BoardColumn, 'name' | 'settings' | 'width' | 'isHidden' | 'position'>>,
  ): BoardColumn {
    const column = this.store.columns.find((c) => c.id === columnId);
    if (!column) throw new Error('COLUMN_NOT_FOUND');
    const board = this.store.boards.find((b) => b.id === column.boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    this.requireStructureAccess(board.orgId);
    if (patch.name !== undefined) column.name = patch.name;
    if (patch.width !== undefined) column.width = patch.width;
    if (patch.isHidden !== undefined) column.isHidden = patch.isHidden;
    if (patch.position !== undefined) column.position = patch.position;
    if (patch.settings !== undefined) {
      column.settings = { ...column.settings, ...patch.settings };
    }
    this.bumpBoard(board.id);
    return column;
  }

  deleteColumn(columnId: string): void {
    const column = this.store.columns.find((c) => c.id === columnId);
    if (!column) throw new Error('COLUMN_NOT_FOUND');
    const board = this.store.boards.find((b) => b.id === column.boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    this.requireStructureAccess(board.orgId);
    if (column.settings.systemField) {
      throw new Error('COLUMN_SYSTEM_LOCKED');
    }
    this.store.columns = this.store.columns.filter((c) => c.id !== columnId);
    for (const item of this.store.items.filter((i) => i.boardId === board.id)) {
      if (column.id in item.values) {
        const next = { ...item.values };
        delete next[column.id];
        item.values = next;
      }
    }
    this.bumpBoard(board.id);
    audit(this.store, {
      orgId: board.orgId,
      actorUserId: this.getSession().user.id,
      action: 'column.deleted',
      resourceType: 'column',
      resourceId: columnId,
      metadata: { boardId: board.id },
    });
  }

  reorderColumns(boardId: string, orderedIds: string[]): BoardColumn[] {
    const board = this.store.boards.find((b) => b.id === boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    this.requireStructureAccess(board.orgId);
    orderedIds.forEach((id, index) => {
      const col = this.store.columns.find((c) => c.id === id && c.boardId === boardId);
      if (col) col.position = index;
    });
    this.bumpBoard(boardId);
    return sortByPosition(this.store.columns.filter((c) => c.boardId === boardId));
  }

  assertColumnWrite(column: BoardColumn): void {
    const session = this.getSession();
    const min = (column.settings.permissions?.writeMinRole ?? 'member') as OrgRole;
    if (!hasMinOrgRole(session.membership.role, min)) {
      throw new Error('COLUMN_WRITE_FORBIDDEN');
    }
  }

  setCellValue(itemId: string, columnId: string, raw: unknown): BoardItem {
    const item = this.store.items.find((i) => i.id === itemId && !i.archivedAt);
    if (!item) throw new Error('ITEM_NOT_FOUND');
    const column = this.store.columns.find((c) => c.id === columnId && c.boardId === item.boardId);
    if (!column) throw new Error('COLUMN_NOT_FOUND');
    const board = this.store.boards.find((b) => b.id === item.boardId)!;
    this.assertBoardAccess(board);
    this.requireWriteAccess(board.orgId);
    this.assertColumnWrite(column);
    if (column.type === 'formula') throw new Error('COLUMN_READONLY');
    if (column.type === 'relation') {
      const ids = Array.isArray(raw) ? raw.map(String) : [];
      const targetBoardId = column.settings.relatedBoardId ?? board.id;
      const targetBoard = this.store.boards.find((b) => b.id === targetBoardId);
      if (!targetBoard || targetBoard.orgId !== board.orgId) {
        throw new Error('RELATION_BOARD_INVALID');
      }
      if (!this.canAccessBoard(targetBoard)) throw new Error('RELATION_BOARD_FORBIDDEN');
      for (const rid of ids) {
        const related = this.store.items.find((i) => i.id === rid && !i.archivedAt);
        if (!related || related.boardId !== targetBoardId || related.orgId !== board.orgId) {
          throw new Error('RELATION_ITEM_INVALID');
        }
      }
    }
    const patch = buildCellPatch(item, column, raw);
    const updated = this.updateItem(itemId, patch);
    this.recalcFormulas(updated.boardId, updated.id);
    return this.store.items.find((i) => i.id === itemId)!;
  }

  recalcFormulas(boardId: string, itemId?: string): void {
    const columns = this.store.columns.filter((c) => c.boardId === boardId);
    const formulaCols = columns.filter((c) => c.type === 'formula' && c.settings.formula);
    if (!formulaCols.length) return;
    const items = this.store.items.filter(
      (i) => i.boardId === boardId && !i.archivedAt && (!itemId || i.id === itemId),
    );
    for (const item of items) {
      const ctx = buildFormulaContext(item, columns, (columnId) => {
        const col = columns.find((c) => c.id === columnId)!;
        return getCellValue(item, col);
      });
      const nextValues = { ...item.values };
      for (const col of formulaCols) {
        try {
          nextValues[col.id] = evaluateFormula(String(col.settings.formula), ctx);
        } catch {
          nextValues[col.id] = null;
        }
      }
      item.values = nextValues;
    }
  }

  columnSummaries(boardId: string): Record<string, number | null> {
    const bundle = this.getBoardBundle(boardId);
    const roots = bundle.items.filter((i) => !i.parentItemId);
    const out: Record<string, number | null> = {};
    for (const col of bundle.columns) {
      out[col.id] = summarizeColumn(roots, col);
    }
    return out;
  }

  createView(input: {
    boardId: string;
    name: string;
    type?: BoardView['type'];
    config?: ViewConfig;
    visibility?: ViewVisibility;
    isDefault?: boolean;
  }): BoardView {
    const board = this.store.boards.find((b) => b.id === input.boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    const session = this.getSession();
    const visibility = input.visibility ?? 'personal';
    if (visibility === 'shared') {
      this.requireStructureAccess(board.orgId);
    } else {
      this.requireWriteAccess(board.orgId);
    }
    const view: BoardView = {
      id: demoUuid(`view-${Date.now()}`),
      boardId: board.id,
      orgId: board.orgId,
      name: input.name,
      type: input.type ?? 'table',
      config: (input.config ?? {}) as Record<string, unknown>,
      position: this.store.views.filter((v) => v.boardId === board.id).length,
      isDefault: Boolean(input.isDefault),
      visibility,
      ownerUserId: visibility === 'personal' ? session.user.id : null,
    };
    this.store.views.push(view);
    this.bumpBoard(board.id);
    return view;
  }

  updateView(
    viewId: string,
    patch: Partial<Pick<BoardView, 'name' | 'config' | 'type' | 'isDefault' | 'position'>>,
  ): BoardView {
    const view = this.store.views.find((v) => v.id === viewId);
    if (!view) throw new Error('VIEW_NOT_FOUND');
    const board = this.store.boards.find((b) => b.id === view.boardId)!;
    this.assertBoardAccess(board);
    const session = this.getSession();
    if (view.visibility === 'personal' && view.ownerUserId !== session.user.id) {
      throw new Error('FORBIDDEN');
    }
    if (view.visibility === 'shared') this.requireStructureAccess(board.orgId);
    if (patch.name !== undefined) view.name = patch.name;
    if (patch.type !== undefined) view.type = patch.type;
    if (patch.config !== undefined) view.config = patch.config;
    if (patch.isDefault !== undefined) view.isDefault = patch.isDefault;
    if (patch.position !== undefined) view.position = patch.position;
    this.bumpBoard(board.id);
    return view;
  }

  deleteView(viewId: string): void {
    const view = this.store.views.find((v) => v.id === viewId);
    if (!view) throw new Error('VIEW_NOT_FOUND');
    const board = this.store.boards.find((b) => b.id === view.boardId)!;
    this.assertBoardAccess(board);
    const session = this.getSession();
    if (view.visibility === 'personal' && view.ownerUserId !== session.user.id) {
      throw new Error('FORBIDDEN');
    }
    if (view.visibility === 'shared') this.requireStructureAccess(board.orgId);
    if (view.isDefault) throw new Error('VIEW_DEFAULT_LOCKED');
    this.store.views = this.store.views.filter((v) => v.id !== viewId);
    this.bumpBoard(board.id);
  }

  createItem(input: {
    boardId: string;
    groupId: string;
    name: string;
    parentItemId?: string | null;
  }): BoardItem {
    const board = this.store.boards.find((b) => b.id === input.boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    this.requireWriteAccess(board.orgId);
    const session = this.getSession();
    const now = nowIso();
    const item: BoardItem = {
      id: demoUuid(`item-${Date.now()}`),
      boardId: input.boardId,
      groupId: input.groupId,
      orgId: board.orgId,
      parentItemId: input.parentItemId ?? null,
      name: input.name,
      status: 'not_started',
      priority: 'none',
      position: this.store.items.filter(
        (i) =>
          i.groupId === input.groupId &&
          Boolean(i.parentItemId) === Boolean(input.parentItemId ?? null) &&
          (input.parentItemId ? i.parentItemId === input.parentItemId : !i.parentItemId),
      ).length,
      progress: 0,
      assigneeIds: [],
      watcherIds: [],
      values: {},
      createdBy: session.user.id,
      updatedBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };
    this.store.items.push(item);
    this.bumpBoard(board.id);
    const entitlements = this.getEntitlements();
    if (entitlements.canRunAutomations) {
      runAutomations(this.store, item, { type: 'item.created' }, session.user.id);
    }
    if (item.assigneeIds.length === 0) {
      item.assigneeIds = [session.user.id];
    }
    audit(this.store, {
      orgId: board.orgId,
      actorUserId: session.user.id,
      action: 'item.created',
      resourceType: 'item',
      resourceId: item.id,
      metadata: { name: item.name },
    });
    return item;
  }

  bumpBoard(boardId: string) {
    this.store.boardRevisions[boardId] = (this.store.boardRevisions[boardId] ?? 0) + 1;
  }

  updateItem(
    itemId: string,
    patch: Partial<
      Pick<
        BoardItem,
        | 'name'
        | 'description'
        | 'status'
        | 'priority'
        | 'dueDate'
        | 'progress'
        | 'assigneeIds'
        | 'watcherIds'
        | 'values'
        | 'groupId'
        | 'position'
      >
    >,
  ): BoardItem {
    const item = this.store.items.find((i) => i.id === itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');
    this.assertOrgAccess(item.orgId);
    const session = this.getSession();
    this.requireWriteAccess(item.orgId);
    const previousStatus = item.status;
    const previousDue = item.dueDate;
    const previousGroupId = item.groupId;
    Object.assign(item, patch, { updatedBy: session.user.id, updatedAt: nowIso() });
    this.bumpBoard(item.boardId);
    this.recalcFormulas(item.boardId, item.id);
    this.store.activity.unshift({
      id: demoUuid(`activity-${Date.now()}-${itemId}`),
      orgId: item.orgId,
      boardId: item.boardId,
      itemId: item.id,
      actorUserId: session.user.id,
      eventType: 'item.updated',
      payload: { patch, previousStatus },
      createdAt: nowIso(),
    });
    const entitlements = this.getEntitlements();
    if (entitlements.canRunAutomations) {
      if (patch.status && patch.status !== previousStatus) {
        runAutomations(
          this.store,
          item,
          { type: 'item.status_changed', previousStatus },
          session.user.id,
        );
      }
      if (patch.dueDate !== undefined && patch.dueDate !== previousDue) {
        runAutomations(this.store, item, { type: 'item.due_within' }, session.user.id);
      }
      if (patch.groupId && patch.groupId !== previousGroupId) {
        runAutomations(
          this.store,
          item,
          { type: 'item.group_changed', previousGroupId },
          session.user.id,
        );
      }
    }
    return item;
  }

  reorderItems(orderedIds: string[]): void {
    orderedIds.forEach((id, index) => {
      const item = this.store.items.find((i) => i.id === id);
      if (item) {
        this.assertOrgAccess(item.orgId);
        item.position = index;
        item.updatedAt = nowIso();
      }
    });
  }

  duplicateItem(itemId: string): BoardItem {
    const item = this.store.items.find((i) => i.id === itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');
    this.assertOrgAccess(item.orgId);
    const copy = this.createItem({
      boardId: item.boardId,
      groupId: item.groupId,
      name: `${item.name} (copy)`,
      parentItemId: item.parentItemId,
    });
    return this.updateItem(copy.id, {
      status: item.status,
      priority: item.priority,
      description: item.description,
      progress: item.progress,
      values: { ...item.values },
    });
  }

  archiveItem(itemId: string): void {
    const item = this.store.items.find((i) => i.id === itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');
    this.assertOrgAccess(item.orgId);
    item.archivedAt = nowIso();
  }

  restoreItem(itemId: string): void {
    const item = this.store.items.find((i) => i.id === itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');
    this.assertOrgAccess(item.orgId);
    item.archivedAt = null;
  }

  addComment(
    itemId: string,
    body: string,
    mentionUserIds: string[] = [],
    parentCommentId?: string | null,
  ): Comment {
    const item = this.store.items.find((i) => i.id === itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');
    this.assertOrgAccess(item.orgId);
    this.requireWriteAccess(item.orgId);
    const session = this.getSession();
    const now = nowIso();
    if (parentCommentId) {
      const parent = this.store.comments.find((c) => c.id === parentCommentId);
      if (!parent || parent.itemId !== itemId) throw new Error('COMMENT_NOT_FOUND');
      if (parent.parentCommentId) throw new Error('REPLY_DEPTH_EXCEEDED');
    }
    const members = this.store.memberships
      .filter((m) => m.orgId === item.orgId)
      .map((m) => ({
        userId: m.userId,
        displayName: this.store.users.find((u) => u.id === m.userId)?.displayName ?? '',
      }))
      .filter((m) => m.displayName);
    const resolved = [
      ...new Set([...mentionUserIds, ...resolveMentions(body, members)]),
    ].filter((id) => id !== session.user.id);
    const comment: Comment = {
      id: demoUuid(`comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      orgId: item.orgId,
      itemId,
      authorId: session.user.id,
      body,
      mentionUserIds: resolved,
      parentCommentId: parentCommentId ?? null,
      reactions: {},
      createdAt: now,
      updatedAt: now,
    };
    this.store.comments.push(comment);
    this.store.activity.unshift({
      id: demoUuid(`activity-comment-${Date.now()}`),
      orgId: item.orgId,
      boardId: item.boardId,
      itemId: item.id,
      actorUserId: session.user.id,
      eventType: parentCommentId ? 'comment.replied' : 'comment.created',
      payload: { mentionUserIds: resolved, parentCommentId: parentCommentId ?? null },
      createdAt: now,
    });
    for (const uid of resolved) {
      this.store.notifications.unshift({
        id: demoUuid(`notif-${Date.now()}-${uid}`),
        userId: uid,
        orgId: item.orgId,
        type: 'mention',
        title: 'You were mentioned',
        body: `${session.user.displayName} mentioned you on ${item.name}`,
        href: `/app/boards/${item.boardId}?item=${item.id}`,
        createdAt: now,
      });
    }
    return comment;
  }

  toggleCommentReaction(commentId: string, emoji: string): Comment {
    const comment = this.store.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('COMMENT_NOT_FOUND');
    this.assertOrgAccess(comment.orgId);
    this.requireWriteAccess(comment.orgId);
    const session = this.getSession();
    const key = emoji.trim().slice(0, 16);
    if (!key) throw new Error('VALIDATION_ERROR');
    comment.reactions ??= {};
    const current = new Set(comment.reactions[key] ?? []);
    if (current.has(session.user.id)) current.delete(session.user.id);
    else current.add(session.user.id);
    if (current.size === 0) delete comment.reactions[key];
    else comment.reactions[key] = [...current];
    comment.updatedAt = nowIso();
    return comment;
  }

  listSubitems(parentItemId: string): BoardItem[] {
    const parent = this.store.items.find((i) => i.id === parentItemId);
    if (!parent) throw new Error('ITEM_NOT_FOUND');
    this.assertOrgAccess(parent.orgId);
    return sortByPosition(
      this.store.items.filter((i) => i.parentItemId === parentItemId && !i.archivedAt),
    );
  }

  listNotifications(userId?: string): Notification[] {
    const id = userId ?? this.store.currentUserId;
    return this.store.notifications.filter((n) => n.userId === id);
  }

  markNotificationRead(id: string): void {
    const n = this.store.notifications.find((x) => x.id === id);
    if (!n) return;
    if (n.userId !== this.store.currentUserId) throw new Error('FORBIDDEN');
    n.readAt = nowIso();
  }

  markAllNotificationsRead(): number {
    const uid = this.store.currentUserId;
    let count = 0;
    for (const n of this.store.notifications) {
      if (n.userId === uid && !n.readAt) {
        n.readAt = nowIso();
        count += 1;
      }
    }
    return count;
  }

  listActivity(orgId: string, opts?: { boardId?: string; itemId?: string; limit?: number }) {
    this.assertOrgAccess(orgId);
    return this.store.activity
      .filter(
        (a) =>
          a.orgId === orgId &&
          (!opts?.boardId || a.boardId === opts.boardId) &&
          (!opts?.itemId || a.itemId === opts.itemId),
      )
      .slice(0, opts?.limit ?? 50);
  }

  archiveBoard(boardId: string): Board {
    const board = this.store.boards.find((b) => b.id === boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertOrgAccess(board.orgId);
    board.archivedAt = nowIso();
    board.updatedAt = nowIso();
    audit(this.store, {
      orgId: board.orgId,
      actorUserId: this.getSession().user.id,
      action: 'board.archived',
      resourceType: 'board',
      resourceId: board.id,
      metadata: {},
    });
    return board;
  }

  restoreBoard(boardId: string): Board {
    const board = this.store.boards.find((b) => b.id === boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertOrgAccess(board.orgId);
    board.archivedAt = null;
    board.updatedAt = nowIso();
    return board;
  }

  listArchivedItems(boardId: string): BoardItem[] {
    const board = this.store.boards.find((b) => b.id === boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertOrgAccess(board.orgId);
    return sortByPosition(this.store.items.filter((i) => i.boardId === boardId && i.archivedAt));
  }

  addAttachment(input: {
    itemId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    dataBase64: string;
  }): Attachment {
    const item = this.store.items.find((i) => i.id === input.itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');
    this.assertOrgAccess(item.orgId);
    if (
      !authorize({
        orgRole: this.getSession().membership.role,
        platformRole: this.getSession().platformRole,
        action: 'file:write',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    const allowed = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
    ];
    if (!allowed.includes(input.contentType)) {
      throw new Error('ATTACHMENT_TYPE_DENIED');
    }
    if (input.sizeBytes > 5 * 1024 * 1024) {
      throw new Error('ATTACHMENT_TOO_LARGE');
    }
    if (!input.fileName.trim() || input.fileName.includes('..') || input.fileName.includes('/')) {
      throw new Error('ATTACHMENT_NAME_INVALID');
    }
    const session = this.getSession();
    const id = demoUuid(`att-${Date.now()}`);
    const attachment: Attachment = {
      id,
      orgId: item.orgId,
      itemId: item.id,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      storagePath: `org/${item.orgId}/items/${item.id}/${id}-${input.fileName}`,
      dataBase64: input.dataBase64,
      uploadedBy: session.user.id,
      createdAt: nowIso(),
    };
    this.store.attachments.push(attachment);
    this.store.activity.unshift({
      id: demoUuid(`activity-att-${Date.now()}`),
      orgId: item.orgId,
      boardId: item.boardId,
      itemId: item.id,
      actorUserId: session.user.id,
      eventType: 'attachment.added',
      payload: { fileName: attachment.fileName, sizeBytes: attachment.sizeBytes },
      createdAt: nowIso(),
    });
    return { ...attachment, dataBase64: undefined };
  }

  listAttachments(itemId: string): Attachment[] {
    const item = this.store.items.find((i) => i.id === itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');
    this.assertOrgAccess(item.orgId);
    return this.store.attachments
      .filter((a) => a.itemId === itemId)
      .map((a) => ({ ...a, dataBase64: undefined }));
  }

  getAttachment(id: string): Attachment {
    const att = this.store.attachments.find((a) => a.id === id);
    if (!att) throw new Error('ATTACHMENT_NOT_FOUND');
    this.assertOrgAccess(att.orgId);
    return att;
  }

  /** Short-lived signed URL for protected attachments (demo mock — no permanent public URL). */
  getSignedAttachmentUrl(id: string, ttlSeconds = 300) {
    const att = this.getAttachment(id);
    if (
      !authorize({
        orgRole: this.getSession().membership.role,
        platformRole: this.getSession().platformRole,
        action: 'board:read',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    return createMockSignedFileUrl({
      attachmentId: att.id,
      orgId: att.orgId,
      ttlSeconds,
    });
  }

  deleteAttachment(id: string): void {
    const att = this.store.attachments.find((a) => a.id === id);
    if (!att) throw new Error('ATTACHMENT_NOT_FOUND');
    this.assertOrgAccess(att.orgId);
    if (
      !authorize({
        orgRole: this.getSession().membership.role,
        platformRole: this.getSession().platformRole,
        action: 'file:write',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    this.requireWriteAccess(att.orgId);
    const session = this.getSession();
    const role = session.membership.role;
    if (att.uploadedBy !== session.user.id && role !== 'admin' && role !== 'owner') {
      throw new Error('FORBIDDEN');
    }
    this.store.attachments = this.store.attachments.filter((a) => a.id !== id);
    const item = this.store.items.find((i) => i.id === att.itemId);
    this.store.activity.unshift({
      id: demoUuid(`activity-att-del-${Date.now()}`),
      orgId: att.orgId,
      boardId: item?.boardId,
      itemId: att.itemId,
      actorUserId: session.user.id,
      eventType: 'attachment.deleted',
      payload: { fileName: att.fileName },
      createdAt: nowIso(),
    });
  }

  listAutomations(orgId: string): AutomationRule[] {
    this.assertOrgAccess(orgId);
    return this.store.automations.filter((a) => a.orgId === orgId);
  }

  listAutomationRuns(orgId: string, limit = 50): AutomationRun[] {
    this.assertOrgAccess(orgId);
    return (this.store.automationRuns ?? [])
      .filter((r) => r.orgId === orgId)
      .slice(0, limit);
  }

  listWebhookDeliveries(orgId: string, limit = 50): WebhookDelivery[] {
    this.assertOrgAccess(orgId);
    return (this.store.webhookDeliveries ?? [])
      .filter((d) => d.orgId === orgId)
      .slice(0, limit);
  }

  /** Tenant-scoped relation candidates for a column (same or cross-board). */
  listRelationCandidates(
    columnId: string,
    excludeItemId?: string,
  ): Array<{ id: string; name: string; boardId: string; boardName: string; status: string }> {
    const column = this.store.columns.find((c) => c.id === columnId);
    if (!column) throw new Error('COLUMN_NOT_FOUND');
    const sourceBoard = this.store.boards.find((b) => b.id === column.boardId);
    if (!sourceBoard) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(sourceBoard);
    if (column.type !== 'relation' && column.type !== 'dependency') {
      throw new Error('COLUMN_NOT_RELATION');
    }
    const targetBoardId = (column.settings.relatedBoardId as string | undefined) ?? sourceBoard.id;
    const targetBoard = this.store.boards.find((b) => b.id === targetBoardId);
    if (!targetBoard || targetBoard.orgId !== sourceBoard.orgId) {
      throw new Error('RELATION_BOARD_INVALID');
    }
    if (!this.canAccessBoard(targetBoard)) throw new Error('RELATION_BOARD_FORBIDDEN');
    return this.store.items
      .filter(
        (i) =>
          i.boardId === targetBoardId &&
          !i.archivedAt &&
          !i.parentItemId &&
          i.id !== excludeItemId,
      )
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        id: i.id,
        name: i.name,
        boardId: targetBoard.id,
        boardName: targetBoard.name,
        status: i.status,
      }));
  }

  exportBoardCsv(boardId: string): string {
    const board = this.store.boards.find((b) => b.id === boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    const columns = this.store.columns.filter((c) => c.boardId === boardId);
    const items = this.store.items.filter((i) => i.boardId === boardId);
    return boardItemsToCsv(items, columns);
  }

  importBoardCsv(
    boardId: string,
    csvText: string,
    groupId?: string,
  ): { created: number; items: BoardItem[] } {
    const board = this.store.boards.find((b) => b.id === boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    this.requireWriteAccess(board.orgId);
    const rows = parseBoardCsv(csvText);
    if (rows.length === 0) return { created: 0, items: [] };
    const groups = this.store.groups
      .filter((g) => g.boardId === boardId)
      .sort((a, b) => a.position - b.position);
    const targetGroup =
      groups.find((g) => g.id === groupId) ?? groups[0];
    if (!targetGroup) throw new Error('GROUP_NOT_FOUND');
    const statuses = new Set(['not_started', 'working', 'stuck', 'done', 'cancelled']);
    const priorities = new Set(['none', 'low', 'medium', 'high', 'urgent']);
    const created: BoardItem[] = [];
    for (const row of rows) {
      const item = this.createItem({
        boardId,
        groupId: targetGroup.id,
        name: row.name,
      });
      const patch: Partial<Pick<BoardItem, 'status' | 'priority' | 'description'>> = {};
      if (row.status && statuses.has(row.status)) {
        patch.status = row.status as BoardItem['status'];
      }
      if (row.priority && priorities.has(row.priority)) {
        patch.priority = row.priority as BoardItem['priority'];
      }
      if (row.description) patch.description = row.description;
      if (Object.keys(patch).length) this.updateItem(item.id, patch);
      created.push(this.store.items.find((i) => i.id === item.id)!);
    }
    return { created: created.length, items: created };
  }

  createAutomation(input: Omit<AutomationRule, 'id' | 'createdAt' | 'runCount' | 'lastRunAt'>): AutomationRule {
    this.assertOrgAccess(input.orgId);
    if (
      !authorize({
        orgRole: this.getSession().membership.role,
        platformRole: this.getSession().platformRole,
        action: 'board:structure',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    const entitlements = this.getEntitlements();
    if (!entitlements.canRunAutomations && !entitlements.automations) {
      // still allow create in demo trial — entitlements.automations from plan
    }
    const rule: AutomationRule = {
      ...input,
      conditions: input.conditions ?? [],
      id: demoUuid(`auto-${Date.now()}`),
      createdAt: nowIso(),
      lastRunAt: null,
      runCount: 0,
    };
    this.store.automations.push(rule);
    audit(this.store, {
      orgId: input.orgId,
      actorUserId: this.getSession().user.id,
      action: 'automation.created',
      resourceType: 'automation',
      resourceId: rule.id,
      metadata: { name: rule.name, trigger: rule.trigger },
    });
    return rule;
  }

  setAutomationEnabled(automationId: string, enabled: boolean): AutomationRule {
    const rule = this.store.automations.find((a) => a.id === automationId);
    if (!rule) throw new Error('AUTOMATION_NOT_FOUND');
    this.assertOrgAccess(rule.orgId);
    this.requireStructureAccess(rule.orgId);
    rule.enabled = enabled;
    return rule;
  }

  getNotificationPreferences(): NotificationPreferences {
    const session = this.getSession();
    const existing = this.store.notificationPrefs[session.user.id];
    if (existing) {
      existing.desktop ??= true;
      existing.digestEmail ??= false;
      existing.muteMessage ??= false;
      return existing;
    }
    const prefs: NotificationPreferences = {
      userId: session.user.id,
      orgId: session.org.id,
      inApp: true,
      email: true,
      push: true,
      desktop: true,
      digestEmail: false,
      muteAssign: false,
      muteMention: false,
      muteAutomation: false,
      muteMessage: false,
    };
    this.store.notificationPrefs[session.user.id] = prefs;
    return prefs;
  }

  updateNotificationPreferences(
    patch: Partial<Omit<NotificationPreferences, 'userId' | 'orgId'>>,
  ): NotificationPreferences {
    const prefs = this.getNotificationPreferences();
    Object.assign(prefs, patch);
    return prefs;
  }

  reorderGroups(boardId: string, orderedIds: string[]): void {
    const board = this.store.boards.find((b) => b.id === boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertOrgAccess(board.orgId);
    orderedIds.forEach((id, index) => {
      const group = this.store.groups.find((g) => g.id === id && g.boardId === boardId);
      if (group) group.position = index;
    });
  }

  canAccessBoard(board: Board): boolean {
    const session = this.getSession();
    if (board.orgId !== session.org.id && session.platformRole === 'none') return false;
    if (
      board.visibility === 'private' &&
      board.createdBy !== session.user.id &&
      session.platformRole === 'none'
    ) {
      return false;
    }
    return true;
  }

  myWork(): BoardItem[] {
    return this.myWorkGrouped().all;
  }

  myWorkGrouped(): {
    all: BoardItem[];
    today: BoardItem[];
    upcoming: BoardItem[];
    overdue: BoardItem[];
    completed: BoardItem[];
    byBoard: Array<{ boardId: string; boardName: string; items: BoardItem[] }>;
  } {
    const session = this.getSession();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const week = new Date(start);
    week.setDate(week.getDate() + 7);

    const all = sortByPosition(
      this.store.items.filter((i) => {
        if (i.orgId !== session.org.id || i.archivedAt) return false;
        if (!i.assigneeIds.includes(session.user.id) && !i.watcherIds.includes(session.user.id)) {
          return false;
        }
        const board = this.store.boards.find((b) => b.id === i.boardId);
        if (!board || !this.canAccessBoard(board)) return false;
        return true;
      }),
    );

    const today = all.filter(
      (i) => i.dueDate && new Date(i.dueDate) >= start && new Date(i.dueDate) < end,
    );
    const overdue = all.filter(
      (i) => i.dueDate && new Date(i.dueDate) < start && i.status !== 'done' && i.status !== 'cancelled',
    );
    const upcoming = all.filter(
      (i) =>
        i.dueDate &&
        new Date(i.dueDate) >= end &&
        new Date(i.dueDate) < week &&
        i.status !== 'done',
    );
    const completed = all.filter((i) => i.status === 'done');
    const boardMap = new Map<string, { boardId: string; boardName: string; items: BoardItem[] }>();
    for (const item of all) {
      const board = this.store.boards.find((b) => b.id === item.boardId);
      if (!board) continue;
      const entry = boardMap.get(board.id) ?? {
        boardId: board.id,
        boardName: board.name,
        items: [],
      };
      entry.items.push(item);
      boardMap.set(board.id, entry);
    }

    return {
      all,
      today,
      upcoming,
      overdue,
      completed,
      byBoard: [...boardMap.values()],
    };
  }

  search(orgId: string, query: string) {
    this.assertOrgAccess(orgId);
    // Harden: strip controls, bound length (API also validates via searchSchema)
    const q = query
      .toLowerCase()
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, 200);
    if (!q) return { boards: [], items: [], comments: [] };
    const visibleBoardIds = new Set(
      this.store.boards.filter((b) => b.orgId === orgId && this.canAccessBoard(b)).map((b) => b.id),
    );
    const boards = this.store.boards.filter((b) => {
      if (b.orgId !== orgId || b.archivedAt) return false;
      if (!this.canAccessBoard(b)) return false;
      return b.name.toLowerCase().includes(q);
    });
    const items = this.store.items.filter((i) => {
      if (i.orgId !== orgId || i.archivedAt) return false;
      if (!visibleBoardIds.has(i.boardId)) return false;
      return i.name.toLowerCase().includes(q) || String(i.description ?? '').toLowerCase().includes(q);
    });
    const comments = this.store.comments.filter((c) => {
      if (c.orgId !== orgId || !c.body.toLowerCase().includes(q)) return false;
      const item = this.store.items.find((i) => i.id === c.itemId);
      if (!item || !visibleBoardIds.has(item.boardId)) return false;
      return true;
    });
    // Guests: limit to boards they can see (already) and never cross-tenant (assertOrgAccess)
    return {
      boards: boards.slice(0, 50),
      items: items.slice(0, 50),
      comments: comments.slice(0, 50),
    };
  }

  dashboardStats(orgId: string) {
    this.assertOrgAccess(orgId);
    const items = this.store.items.filter((i) => {
      if (i.orgId !== orgId || i.archivedAt) return false;
      const board = this.store.boards.find((b) => b.id === i.boardId);
      return board ? this.canAccessBoard(board) : false;
    });
    const now = Date.now();
    const overdue = items.filter(
      (i) =>
        i.dueDate &&
        new Date(i.dueDate).getTime() < now &&
        i.status !== 'done' &&
        i.status !== 'cancelled',
    ).length;
    const formulaCols = this.store.columns.filter(
      (c) => c.orgId === orgId && c.type === 'formula',
    );
    let hoursTotal = 0;
    for (const item of items) {
      for (const col of formulaCols) {
        const v = item.values[col.id];
        if (typeof v === 'number') hoursTotal += v;
      }
    }
    const automations = this.store.automations.filter((a) => a.orgId === orgId);
    return {
      totalItems: items.length,
      done: items.filter((i) => i.status === 'done').length,
      stuck: items.filter((i) => i.status === 'stuck').length,
      working: items.filter((i) => i.status === 'working').length,
      notStarted: items.filter((i) => i.status === 'not_started').length,
      overdue,
      boards: this.store.boards.filter(
        (b) => b.orgId === orgId && !b.archivedAt && this.canAccessBoard(b),
      ).length,
      hoursTotal: Math.round(hoursTotal * 10) / 10,
      automationsEnabled: automations.filter((a) => a.enabled).length,
      automationRuns: (this.store.automationRuns ?? []).filter((r) => r.orgId === orgId).length,
      attachments: this.store.attachments.filter((a) => a.orgId === orgId).length,
      storageBytes: this.store.attachments
        .filter((a) => a.orgId === orgId)
        .reduce((sum, a) => sum + a.sizeBytes, 0),
    };
  }

  usageSummary(orgId: string) {
    this.assertOrgAccess(orgId);
    const entitlements = this.getEntitlements();
    const stats = this.dashboardStats(orgId);
    const seatsUsed = this.store.memberships.filter((m) => m.orgId === orgId).length;
    return {
      seats: { used: seatsUsed, limit: entitlements.seats },
      boards: { used: stats.boards, limit: entitlements.boards },
      storageGb: {
        used: Math.round((stats.storageBytes / (1024 * 1024 * 1024)) * 1000) / 1000,
        limit: entitlements.storageGb,
      },
      automations: {
        enabled: stats.automationsEnabled,
        runs: stats.automationRuns,
        allowed: entitlements.canRunAutomations,
      },
      entitlements,
    };
  }

  listForms(orgId: string): BoardForm[] {
    this.assertOrgAccess(orgId);
    return this.store.forms.filter((f) => f.orgId === orgId);
  }

  getForm(formId: string): BoardForm {
    const form = this.store.forms.find((f) => f.id === formId);
    if (!form) throw new Error('FORM_NOT_FOUND');
    if (form.visibility === 'private') {
      this.assertOrgAccess(form.orgId);
    }
    // public forms readable without membership for submit UX (demo abuse-prevention: still rate-limited in middleware)
    return form;
  }

  createForm(input: {
    boardId: string;
    name: string;
    description?: string;
    fieldKeys: string[];
    visibility?: 'private' | 'public';
  }): BoardForm {
    const board = this.store.boards.find((b) => b.id === input.boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    this.requireStructureAccess(board.orgId);
    const form: BoardForm = {
      id: demoUuid(`form-${Date.now()}`),
      orgId: board.orgId,
      boardId: board.id,
      name: input.name,
      description: input.description ?? null,
      fieldKeys: input.fieldKeys,
      visibility: input.visibility ?? 'private',
      enabled: true,
      createdBy: this.getSession().user.id,
      createdAt: nowIso(),
      submissionCount: 0,
    };
    this.store.forms.push(form);
    audit(this.store, {
      orgId: board.orgId,
      actorUserId: this.getSession().user.id,
      action: 'form.created',
      resourceType: 'form',
      resourceId: form.id,
      metadata: { boardId: board.id, visibility: form.visibility },
    });
    return form;
  }

  /** Submit form → create item (triggers item.created automations). */
  submitForm(
    formId: string,
    fields: Record<string, unknown>,
    opts?: { honeypot?: string },
  ): { item: BoardItem; form: BoardForm } {
    const form = this.store.forms.find((f) => f.id === formId);
    if (!form || !form.enabled) throw new Error('FORM_NOT_FOUND');
    // Abuse: honeypot filled or hard demo cap
    if (opts?.honeypot && opts.honeypot.trim()) throw new Error('FORM_ABUSE_REJECTED');
    if (form.submissionCount >= 200) throw new Error('FORM_SUBMIT_LIMIT');
    if (form.visibility === 'private') {
      this.assertOrgAccess(form.orgId);
      this.requireWriteAccess(form.orgId);
    } else {
      // Public demo: ensure session org matches form org (seeded demo users) or allow if same org
      try {
        this.assertOrgAccess(form.orgId);
      } catch {
        // Cross-tenant public submit denied — keep tenant isolation
        throw new Error('CROSS_TENANT_DENIED');
      }
    }
    const board = this.store.boards.find((b) => b.id === form.boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    const group =
      this.store.groups
        .filter((g) => g.boardId === board.id && !g.archivedAt)
        .sort((a, b) => a.position - b.position)[0] ?? null;
    if (!group) throw new Error('GROUP_NOT_FOUND');
    const name = String(fields.name ?? fields.title ?? 'Form submission').trim();
    if (!name) throw new Error('FORM_NAME_REQUIRED');
    const item = this.createItem({
      boardId: board.id,
      groupId: group.id,
      name: name.slice(0, 240),
    });
    const patch: Parameters<DemoRepository['updateItem']>[1] = {};
    if (typeof fields.description === 'string') patch.description = fields.description;
    if (typeof fields.status === 'string') patch.status = fields.status as BoardItem['status'];
    if (typeof fields.priority === 'string') patch.priority = fields.priority as BoardItem['priority'];
    const values: Record<string, unknown> = { ...item.values };
    for (const key of form.fieldKeys) {
      if (key === 'name' || key === 'description' || key === 'status' || key === 'priority') continue;
      if (key in fields) values[key] = fields[key];
    }
    patch.values = values;
    const updated = this.updateItem(item.id, patch);
    form.submissionCount += 1;
    this.store.activity.unshift({
      id: demoUuid(`activity-form-${Date.now()}`),
      orgId: form.orgId,
      boardId: board.id,
      itemId: updated.id,
      actorUserId: this.getSession().user.id,
      eventType: 'form.submitted',
      payload: { formId: form.id, name: form.name },
      createdAt: nowIso(),
    });
    return { item: updated, form };
  }

  listOrgsForPlatform() {
    const session = this.getSession();
    if (session.platformRole === 'none') throw new Error('FORBIDDEN');
    return this.store.organizations.map((org) => {
      const attachments = this.store.attachments.filter((a) => a.orgId === org.id);
      return {
        org,
        seats: this.store.memberships.filter((m) => m.orgId === org.id).length,
        subscription: this.store.subscriptions.find((s) => s.orgId === org.id)!,
        usage: {
          boards: this.store.boards.filter((b) => b.orgId === org.id && !b.archivedAt).length,
          items: this.store.items.filter((i) => i.orgId === org.id && !i.archivedAt).length,
          attachments: attachments.length,
          storageBytes: attachments.reduce((s, a) => s + a.sizeBytes, 0),
          automations: this.store.automations.filter((a) => a.orgId === org.id && a.enabled)
            .length,
          automationRuns: (this.store.automationRuns ?? []).filter((r) => r.orgId === org.id)
            .length,
          forms: this.store.forms.filter((f) => f.orgId === org.id).length,
        },
      };
    });
  }

  setOrgStatus(orgId: string, status: Organization['status']) {
    const session = this.getSession();
    if (session.platformRole !== 'super_admin') throw new Error('FORBIDDEN');
    const org = this.store.organizations.find((o) => o.id === orgId);
    if (!org) throw new Error('ORG_NOT_FOUND');
    org.status = status;
    audit(this.store, {
      orgId,
      actorUserId: session.user.id,
      action: status === 'suspended' ? 'org.suspended' : 'org.reactivated',
      resourceType: 'organization',
      resourceId: orgId,
      metadata: {},
    });
    return org;
  }

  listAuditLogs(orgId?: string) {
    const session = this.getSession();
    if (session.platformRole === 'none' && orgId && orgId !== session.org.id) {
      throw new Error('FORBIDDEN');
    }
    return this.store.auditLogs.filter((a) => !orgId || a.orgId === orgId).slice(0, 100);
  }

  getEntitlements() {
    const session = this.getSession();
    const subscription = this.store.subscriptions.find((s) => s.orgId === session.org.id)!;
    return resolveEntitlements({
      org: session.org,
      subscription,
      seatUsage: this.store.memberships.filter((m) => m.orgId === session.org.id).length,
      boardUsage: this.store.boards.filter((b) => b.orgId === session.org.id && !b.archivedAt)
        .length,
    });
  }

  createWorkspace(orgId: string, name: string, description?: string): Workspace {
    this.assertOrgAccess(orgId);
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'workspace:manage',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    const ws: Workspace = {
      id: demoUuid(`ws-${Date.now()}`),
      orgId,
      name,
      slug: slugify(name),
      description: description ?? null,
      createdAt: nowIso(),
    };
    this.store.workspaces.push(ws);
    audit(this.store, {
      orgId,
      actorUserId: session.user.id,
      action: 'workspace.created',
      resourceType: 'workspace',
      resourceId: ws.id,
      metadata: { name },
    });
    return ws;
  }

  updateWorkspace(
    workspaceId: string,
    patch: Partial<Pick<Workspace, 'name' | 'description'>>,
  ): Workspace {
    const ws = this.store.workspaces.find((w) => w.id === workspaceId);
    if (!ws) throw new Error('WORKSPACE_NOT_FOUND');
    this.assertOrgAccess(ws.orgId);
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'workspace:manage',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    if (patch.name) {
      ws.name = patch.name;
      ws.slug = slugify(patch.name);
    }
    if (patch.description !== undefined) ws.description = patch.description;
    return ws;
  }

  deleteWorkspace(workspaceId: string): void {
    const ws = this.store.workspaces.find((w) => w.id === workspaceId);
    if (!ws) throw new Error('WORKSPACE_NOT_FOUND');
    this.assertOrgAccess(ws.orgId);
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'org:manage',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    const hasBoards = this.store.boards.some((b) => b.workspaceId === workspaceId && !b.archivedAt);
    if (hasBoards) throw new Error('WORKSPACE_HAS_BOARDS');
    this.store.workspaces = this.store.workspaces.filter((w) => w.id !== workspaceId);
    this.store.teams = this.store.teams.filter((t) => t.workspaceId !== workspaceId);
  }

  listTeams(orgId: string): Array<Team & { memberIds: string[] }> {
    this.assertOrgAccess(orgId);
    return this.store.teams
      .filter((t) => t.orgId === orgId)
      .map((t) => ({
        ...t,
        memberIds: this.store.teamMembers.filter((m) => m.teamId === t.id).map((m) => m.userId),
      }));
  }

  createTeam(input: { orgId: string; name: string; workspaceId?: string | null }): Team {
    this.assertOrgAccess(input.orgId);
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'workspace:manage',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    if (input.workspaceId) {
      const ws = this.store.workspaces.find((w) => w.id === input.workspaceId);
      if (!ws || ws.orgId !== input.orgId) throw new Error('WORKSPACE_NOT_FOUND');
    }
    const team: Team = {
      id: demoUuid(`team-${Date.now()}`),
      orgId: input.orgId,
      workspaceId: input.workspaceId ?? null,
      name: input.name,
      createdAt: nowIso(),
    };
    this.store.teams.push(team);
    this.store.teamMembers.push({
      teamId: team.id,
      userId: session.user.id,
      createdAt: nowIso(),
    });
    audit(this.store, {
      orgId: input.orgId,
      actorUserId: session.user.id,
      action: 'team.created',
      resourceType: 'team',
      resourceId: team.id,
      metadata: { name: team.name },
    });
    return team;
  }

  updateTeam(teamId: string, patch: Partial<Pick<Team, 'name' | 'workspaceId'>>): Team {
    const team = this.store.teams.find((t) => t.id === teamId);
    if (!team) throw new Error('TEAM_NOT_FOUND');
    this.assertOrgAccess(team.orgId);
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'org:manage',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    if (patch.name) team.name = patch.name;
    if (patch.workspaceId !== undefined) team.workspaceId = patch.workspaceId;
    return team;
  }

  deleteTeam(teamId: string): void {
    const team = this.store.teams.find((t) => t.id === teamId);
    if (!team) throw new Error('TEAM_NOT_FOUND');
    this.assertOrgAccess(team.orgId);
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'org:manage',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    this.store.teams = this.store.teams.filter((t) => t.id !== teamId);
    this.store.teamMembers = this.store.teamMembers.filter((m) => m.teamId !== teamId);
  }

  addTeamMember(teamId: string, userId: string): void {
    const team = this.store.teams.find((t) => t.id === teamId);
    if (!team) throw new Error('TEAM_NOT_FOUND');
    this.assertOrgAccess(team.orgId);
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'org:manage',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    const member = this.store.memberships.find((m) => m.orgId === team.orgId && m.userId === userId);
    if (!member) throw new Error('USER_NOT_IN_ORG');
    if (!this.store.teamMembers.some((m) => m.teamId === teamId && m.userId === userId)) {
      this.store.teamMembers.push({ teamId, userId, createdAt: nowIso() });
    }
  }

  removeTeamMember(teamId: string, userId: string): void {
    const team = this.store.teams.find((t) => t.id === teamId);
    if (!team) throw new Error('TEAM_NOT_FOUND');
    this.assertOrgAccess(team.orgId);
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'org:manage',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    this.store.teamMembers = this.store.teamMembers.filter(
      (m) => !(m.teamId === teamId && m.userId === userId),
    );
  }

  listTemplates() {
    return BOARD_TEMPLATES;
  }

  listInvitations(orgId: string): Invitation[] {
    this.assertOrgAccess(orgId);
    return this.store.invitations.filter((i) => i.orgId === orgId && !i.acceptedAt);
  }

  createInvitation(input: { orgId: string; email: string; role: OrgRole }): Invitation {
    this.assertOrgAccess(input.orgId);
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'org:invite',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    if (input.role === 'owner') throw new Error('INVITE_ROLE_INVALID');
    // Workspace admins may invite workspace_admin and below; org admins invite any non-owner.
    if (
      session.membership.role === 'workspace_admin' &&
      !['workspace_admin', 'member', 'viewer', 'guest'].includes(input.role)
    ) {
      throw new Error('INVITE_ROLE_FORBIDDEN');
    }
    const entitlements = this.getEntitlements();
    if (!entitlements.canInvite) {
      throw new Error(
        entitlements.isPastDue
          ? 'ENTITLEMENT_PAST_DUE'
          : entitlements.isSuspended
            ? 'ENTITLEMENT_SUSPENDED'
            : 'ENTITLEMENT_SEAT_LIMIT',
      );
    }
    const email = input.email.toLowerCase();
    const invitation: Invitation = {
      id: demoUuid(`invite-${Date.now()}`),
      orgId: input.orgId,
      email,
      role: input.role,
      token: demoUuid(`token-${Date.now()}-${email}`),
      invitedBy: session.user.id,
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      acceptedAt: null,
    };
    this.store.invitations.push(invitation);
    this.store.notifications.unshift({
      id: demoUuid(`notif-invite-${Date.now()}`),
      userId: session.user.id,
      orgId: input.orgId,
      type: 'invite_sent',
      title: 'Invitation sent',
      body: `Invited ${email} as ${input.role}`,
      createdAt: nowIso(),
    });
    audit(this.store, {
      orgId: input.orgId,
      actorUserId: session.user.id,
      action: 'invitation.created',
      resourceType: 'invitation',
      resourceId: invitation.id,
      metadata: { email, role: input.role },
    });
    return invitation;
  }

  acceptInvitation(token: string): { invitation: Invitation; membership: OrgMembership; user: User } {
    const invitation = this.store.invitations.find((i) => i.token === token);
    if (!invitation) throw new Error('INVITATION_NOT_FOUND');
    if (invitation.acceptedAt) throw new Error('INVITATION_ALREADY_ACCEPTED');
    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      throw new Error('INVITATION_EXPIRED');
    }

    let user = this.store.users.find((u) => u.email.toLowerCase() === invitation.email);
    if (!user) {
      user = {
        id: demoUuid(`user-invite-${Date.now()}`),
        email: invitation.email,
        displayName: invitation.email.split('@')[0] || 'Invited user',
        locale: 'en',
        createdAt: nowIso(),
      };
      this.store.users.push(user);
      this.store.platformRoles[user.id] = 'none';
    }

    let membership = this.store.memberships.find(
      (m) => m.orgId === invitation.orgId && m.userId === user!.id,
    );
    if (!membership) {
      membership = {
        id: demoUuid(`mem-invite-${Date.now()}`),
        orgId: invitation.orgId,
        userId: user.id,
        role: invitation.role,
        createdAt: nowIso(),
      };
      this.store.memberships.push(membership);
    }

    invitation.acceptedAt = nowIso();
    this.store.currentUserId = user.id;
    this.store.impersonatorUserId = null;

    audit(this.store, {
      orgId: invitation.orgId,
      actorUserId: user.id,
      action: 'invitation.accepted',
      resourceType: 'invitation',
      resourceId: invitation.id,
      metadata: { email: invitation.email, role: invitation.role },
    });

    return { invitation, membership, user };
  }

  getSubscription(orgId?: string): Subscription {
    const session = this.getSession();
    const id = orgId ?? session.org.id;
    this.assertOrgAccess(id);
    const sub = this.store.subscriptions.find((s) => s.orgId === id);
    if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');
    return sub;
  }

  applyBillingEvent(event: BillingWebhookEvent): Subscription {
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'org:manage',
      }) &&
      session.platformRole === 'none'
    ) {
      throw new Error('FORBIDDEN');
    }
    if (session.platformRole === 'none' && session.org.id !== event.orgId) {
      throw new Error('CROSS_TENANT_DENIED');
    }
    const sub = this.store.subscriptions.find((s) => s.orgId === event.orgId);
    if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');
    const provider = new MockBillingProvider();
    const next = provider.applyEvent(sub, event);
    Object.assign(sub, next);
    const org = this.store.organizations.find((o) => o.id === event.orgId);
    if (org) {
      org.planId = sub.planId;
      org.seatLimit = PLANS[sub.planId].seatLimit;
      if (sub.status === 'cancelled' || sub.status === 'suspended') {
        // keep org.status active unless platform suspends; feature gates use subscription
      }
    }
    audit(this.store, {
      orgId: event.orgId,
      actorUserId: session.user.id,
      action: `billing.${event.type}`,
      resourceType: 'subscription',
      resourceId: sub.id,
      metadata: { event },
    });
    return sub;
  }

  /** Demo path: upgrade/downgrade/cancel/past_due without Stripe. */
  setBillingDemoState(input: {
    orgId: string;
    planId?: PlanId;
    status?: SubscriptionStatus;
  }): Subscription {
    const session = this.getSession();
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'org:manage',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    this.assertOrgAccess(input.orgId);
    const sub = this.store.subscriptions.find((s) => s.orgId === input.orgId);
    if (!sub) throw new Error('SUBSCRIPTION_NOT_FOUND');
    if (input.planId) {
      sub.planId = input.planId;
      const org = this.store.organizations.find((o) => o.id === input.orgId);
      if (org) {
        org.planId = input.planId;
        org.seatLimit = PLANS[input.planId].seatLimit;
      }
    }
    if (input.status) {
      sub.status = input.status;
      if (input.status === 'past_due') {
        sub.graceEndsAt = new Date(Date.now() + 7 * 86400000).toISOString();
      }
      if (input.status === 'active' || input.status === 'trialing') {
        sub.graceEndsAt = null;
      }
    }
    audit(this.store, {
      orgId: input.orgId,
      actorUserId: session.user.id,
      action: 'billing.demo_state',
      resourceType: 'subscription',
      resourceId: sub.id,
      metadata: { planId: sub.planId, status: sub.status },
    });
    return sub;
  }

  runDueAutomations(orgId?: string): Array<{ itemId: string; results: ReturnType<typeof runAutomations> }> {
    const session = this.getSession();
    const targetOrg = orgId ?? session.org.id;
    this.assertOrgAccess(targetOrg);
    const entitlements = this.getEntitlements();
    if (!entitlements.canRunAutomations) {
      throw new Error(
        entitlements.isPastDue ? 'ENTITLEMENT_PAST_DUE' : 'ENTITLEMENT_SUSPENDED',
      );
    }
    const out: Array<{ itemId: string; results: ReturnType<typeof runAutomations> }> = [];
    for (const item of this.store.items) {
      if (item.orgId !== targetOrg || item.archivedAt || !item.dueDate) continue;
      const results = runAutomations(
        this.store,
        item,
        { type: 'item.due_within' },
        session.user.id,
      );
      if (results.length) out.push({ itemId: item.id, results });
    }
    return out;
  }

  getBoardRevision(boardId: string): number {
    const board = this.store.boards.find((b) => b.id === boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    return this.store.boardRevisions[boardId] ?? 0;
  }

  /** Cross-tenant probe for security tests — must throw for foreign org. */
  assertOrgAccess(orgId: string) {
    const session = this.getSession();
    if (session.platformRole !== 'none') return;
    if (session.org.id !== orgId) throw new Error('CROSS_TENANT_DENIED');
    const org = this.store.organizations.find((o) => o.id === orgId);
    if (org?.status === 'suspended') throw new Error('ORG_SUSPENDED');
  }

  // ---- Phase 3: custom roles ----
  listCustomRoles(orgId?: string): CustomRole[] {
    const session = this.getSession();
    const target = orgId ?? session.org.id;
    this.assertOrgAccess(target);
    return this.store.customRoles.filter((r) => r.orgId === target);
  }

  createCustomRole(input: {
    orgId: string;
    name: string;
    description?: string;
    baseRole: OrgRole;
    grants?: string[];
    denies?: string[];
  }): CustomRole {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, action: 'role:manage' })) {
      throw new Error('FORBIDDEN');
    }
    this.assertOrgAccess(input.orgId);
    const now = nowIso();
    const role: CustomRole = {
      id: demoUuid(`role-${input.name}-${Date.now()}`),
      orgId: input.orgId,
      name: input.name.trim(),
      description: input.description ?? null,
      baseRole: input.baseRole,
      grants: input.grants ?? [],
      denies: input.denies ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.customRoles.push(role);
    audit(this.store, {
      orgId: input.orgId,
      actorUserId: session.user.id,
      action: 'role.create',
      resourceType: 'custom_role',
      resourceId: role.id,
      metadata: { name: role.name, baseRole: role.baseRole },
    });
    return role;
  }

  previewRolePermissions(roleId: string) {
    const session = this.getSession();
    const role = this.store.customRoles.find((r) => r.id === roleId);
    if (!role) throw new Error('ROLE_NOT_FOUND');
    this.assertOrgAccess(role.orgId);
    if (
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'role:manage',
      }) &&
      !authorize({
        orgRole: session.membership.role,
        platformRole: session.platformRole,
        action: 'org:read',
      })
    ) {
      throw new Error('FORBIDDEN');
    }
    return PERMISSION_CATALOG.filter((c) => !c.action.startsWith('platform:')).map((c) => ({
      ...c,
      ...previewPermission({
        orgRole: role.baseRole,
        action: c.action,
        grants: role.grants as PermissionAction[],
        denies: role.denies as PermissionAction[],
      }),
    }));
  }

  // ---- Phase 3: messages ----
  listChannels(): ChatChannel[] {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, platformRole: session.platformRole, action: 'message:read' })) {
      throw new Error('FORBIDDEN');
    }
    return this.store.chatChannels.filter(
      (c) =>
        c.orgId === session.org.id &&
        !c.archivedAt &&
        (c.memberIds.includes(session.user.id) ||
          hasMinOrgRole(session.membership.role, 'admin')),
    );
  }

  createChannel(input: {
    kind: ChatChannel['kind'];
    name: string;
    topic?: string;
    memberIds?: string[];
    workspaceId?: string;
    boardId?: string;
    teamId?: string;
  }): ChatChannel {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, action: 'channel:manage' }) && input.kind !== 'dm') {
      throw new Error('FORBIDDEN');
    }
    if (!authorize({ orgRole: session.membership.role, action: 'message:write' })) {
      throw new Error('FORBIDDEN');
    }
    const members = Array.from(
      new Set([session.user.id, ...(input.memberIds ?? [])]),
    );
    const channel: ChatChannel = {
      id: crypto.randomUUID(),
      orgId: session.org.id,
      kind: input.kind,
      name: input.name.trim(),
      topic: input.topic ?? null,
      workspaceId: input.workspaceId ?? null,
      boardId: input.boardId ?? null,
      teamId: input.teamId ?? null,
      memberIds: members,
      createdBy: session.user.id,
      createdAt: nowIso(),
    };
    this.store.chatChannels.push(channel);
    return channel;
  }

  listMessages(channelId: string): ChatMessage[] {
    const session = this.getSession();
    const channel = this.store.chatChannels.find((c) => c.id === channelId);
    if (!channel || channel.orgId !== session.org.id) throw new Error('CHANNEL_NOT_FOUND');
    if (
      !channel.memberIds.includes(session.user.id) &&
      !hasMinOrgRole(session.membership.role, 'admin')
    ) {
      throw new Error('FORBIDDEN');
    }
    if (!authorize({ orgRole: session.membership.role, platformRole: session.platformRole, action: 'message:read' })) {
      throw new Error('FORBIDDEN');
    }
    return this.store.chatMessages
      .filter((m) => m.channelId === channelId && !m.deletedAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  postMessage(input: {
    channelId: string;
    body: string;
    parentMessageId?: string | null;
    linkRefs?: ChatMessage['linkRefs'];
  }): ChatMessage {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, action: 'message:write' })) {
      throw new Error('FORBIDDEN');
    }
    const channel = this.store.chatChannels.find((c) => c.id === input.channelId);
    if (!channel || channel.orgId !== session.org.id) throw new Error('CHANNEL_NOT_FOUND');
    if (!channel.memberIds.includes(session.user.id)) throw new Error('FORBIDDEN');
    const body = input.body.trim();
    if (!body) throw new Error('EMPTY_MESSAGE');
    const now = nowIso();
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      orgId: session.org.id,
      channelId: channel.id,
      authorId: session.user.id,
      body,
      mentionUserIds: resolveMentions(
        body,
        this.store.users.map((u) => ({ userId: u.id, displayName: u.displayName })),
      ),
      parentMessageId: input.parentMessageId ?? null,
      linkRefs: input.linkRefs ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.chatMessages.push(msg);
    for (const uid of channel.memberIds) {
      if (uid === session.user.id) continue;
      const prefs = this.store.notificationPrefs[uid];
      if (prefs?.muteMessage) continue;
      if (prefs && prefs.inApp === false) continue;
      this.store.notifications.unshift({
        id: crypto.randomUUID(),
        userId: uid,
        orgId: session.org.id,
        type: 'message.new',
        title: `New message in #${channel.name}`,
        body: body.slice(0, 140),
        href: `/app/messages?channel=${channel.id}`,
        createdAt: now,
      });
    }
    return msg;
  }

  // ---- Phase 3: time entries ----
  listTimeEntries(input?: { itemId?: string; userId?: string }): TimeEntry[] {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, platformRole: session.platformRole, action: 'board:read' })) {
      throw new Error('FORBIDDEN');
    }
    const canFin = authorize({
      orgRole: session.membership.role,
      action: 'time:read_financial',
    });
    return this.store.timeEntries
      .filter((e) => {
        if (e.orgId !== session.org.id) return false;
        if (input?.itemId && e.itemId !== input.itemId) return false;
        if (input?.userId && e.userId !== input.userId) return false;
        return true;
      })
      .map((e) => redactTimeEntryFinancial(e, canFin));
  }

  createTimeEntry(input: {
    itemId: string;
    minutes: number;
    workedOn: string;
    kind?: TimeEntryKind;
    note?: string;
    costCents?: number;
    billableCents?: number;
  }): TimeEntry {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, action: 'time:write' })) {
      throw new Error('FORBIDDEN');
    }
    validateTimeEntryInput({
      minutes: input.minutes,
      workedOn: input.workedOn,
      kind: input.kind,
    });
    const item = this.store.items.find((i) => i.id === input.itemId);
    if (!item || item.orgId !== session.org.id) throw new Error('ITEM_NOT_FOUND');
    const board = this.store.boards.find((b) => b.id === item.boardId);
    if (!board) throw new Error('BOARD_NOT_FOUND');
    this.assertBoardAccess(board);
    const canFin = authorize({
      orgRole: session.membership.role,
      action: 'time:read_financial',
    });
    const entry: TimeEntry = {
      id: crypto.randomUUID(),
      orgId: session.org.id,
      boardId: item.boardId,
      itemId: item.id,
      userId: session.user.id,
      kind: input.kind ?? 'work',
      minutes: input.minutes,
      note: input.note ?? null,
      workedOn: input.workedOn,
      costCents: canFin ? (input.costCents ?? null) : null,
      billableCents: canFin ? (input.billableCents ?? null) : null,
      createdAt: nowIso(),
    };
    this.store.timeEntries.push(entry);
    return redactTimeEntryFinancial(entry, canFin);
  }

  timeTotalsForItem(itemId: string) {
    const entries = this.listTimeEntries({ itemId });
    const canFin = authorize({
      orgRole: this.getSession().membership.role,
      action: 'time:read_financial',
    });
    return accumulateTimeEntries(entries, { includeFinancial: canFin });
  }

  // ---- Phase 3: integrations ----
  listIntegrations() {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, action: 'integration:read' })) {
      throw new Error('FORBIDDEN');
    }
    const conns = this.store.integrationConnections.filter((c) => c.orgId === session.org.id);
    return {
      providers: INTEGRATION_REGISTRY,
      connections: conns.map((c) => ({
        ...c,
        // Never expose credentialRef contents beyond opaque id
        credentialRef: c.credentialRef ? '[ref]' : null,
      })),
    };
  }

  connectIntegration(providerId: IntegrationProviderId): IntegrationConnection {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, action: 'integration:manage' })) {
      throw new Error('FORBIDDEN');
    }
    const provider = INTEGRATION_REGISTRY.find((p) => p.id === providerId);
    if (!provider) throw new Error('PROVIDER_NOT_FOUND');
    const mock = mockConnectProvider(providerId);
    let conn = this.store.integrationConnections.find(
      (c) => c.orgId === session.org.id && c.providerId === providerId,
    );
    const now = nowIso();
    if (!conn) {
      conn = {
        id: crypto.randomUUID(),
        orgId: session.org.id,
        providerId,
        status: mock.status,
        displayName: provider.name,
        credentialRef: mock.credentialRef,
        scopes: mock.scopes,
        createdAt: now,
        updatedAt: now,
        lastError: null,
      };
      this.store.integrationConnections.push(conn);
    } else {
      conn.status = mock.status;
      conn.credentialRef = mock.credentialRef;
      conn.scopes = mock.scopes;
      conn.updatedAt = now;
      conn.lastError = null;
    }
    audit(this.store, {
      orgId: session.org.id,
      actorUserId: session.user.id,
      action: 'integration.connect_mock',
      resourceType: 'integration',
      resourceId: conn.id,
      metadata: { providerId, envVarNames: provider.envVarNames },
    });
    return { ...conn, credentialRef: '[ref]' };
  }

  disconnectIntegration(providerId: IntegrationProviderId): IntegrationConnection {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, action: 'integration:manage' })) {
      throw new Error('FORBIDDEN');
    }
    const conn = this.store.integrationConnections.find(
      (c) => c.orgId === session.org.id && c.providerId === providerId,
    );
    if (!conn) throw new Error('CONNECTION_NOT_FOUND');
    conn.status = 'disconnected';
    conn.credentialRef = null;
    conn.scopes = [];
    conn.updatedAt = nowIso();
    return { ...conn, credentialRef: null };
  }

  // ---- Phase 3: workdocs ----
  listWorkdocs(): Workdoc[] {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, platformRole: session.platformRole, action: 'doc:read' })) {
      throw new Error('FORBIDDEN');
    }
    return this.store.workdocs.filter((d) => d.orgId === session.org.id);
  }

  getWorkdoc(docId: string): Workdoc {
    const doc = this.store.workdocs.find((d) => d.id === docId);
    if (!doc) throw new Error('DOC_NOT_FOUND');
    this.assertOrgAccess(doc.orgId);
    if (!authorize({ orgRole: this.getSession().membership.role, platformRole: this.getSession().platformRole, action: 'doc:read' })) {
      throw new Error('FORBIDDEN');
    }
    return doc;
  }

  createWorkdoc(input: { title: string; workspaceId?: string; boardId?: string; itemId?: string }): Workdoc {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, action: 'doc:write' })) {
      throw new Error('FORBIDDEN');
    }
    const now = nowIso();
    const doc: Workdoc = {
      id: crypto.randomUUID(),
      orgId: session.org.id,
      workspaceId: input.workspaceId ?? null,
      boardId: input.boardId ?? null,
      itemId: input.itemId ?? null,
      title: input.title.trim() || 'Untitled',
      body: { blocks: [{ id: crypto.randomUUID(), type: 'paragraph', text: '' }] },
      createdBy: session.user.id,
      updatedBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };
    this.store.workdocs.push(doc);
    return doc;
  }

  updateWorkdoc(
    docId: string,
    patch: { title?: string; body?: Workdoc['body'] },
  ): Workdoc {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, action: 'doc:write' })) {
      throw new Error('FORBIDDEN');
    }
    const doc = this.getWorkdoc(docId);
    if (patch.title !== undefined) doc.title = patch.title.trim() || doc.title;
    if (patch.body) {
      // Incremental: replace blocks array only (safe architecture)
      doc.body = { blocks: patch.body.blocks.map((b) => ({ ...b, text: String(b.text ?? '') })) };
    }
    doc.updatedBy = session.user.id;
    doc.updatedAt = nowIso();
    return doc;
  }

  listApiExtensions(): ApiAppExtension[] {
    const session = this.getSession();
    this.assertOrgAccess(session.org.id);
    return this.store.apiExtensions.filter((e) => e.orgId === session.org.id);
  }

  createApiExtension(input: {
    name: string;
    kind: ApiAppExtension['kind'];
    config?: Record<string, unknown>;
  }): ApiAppExtension {
    const session = this.getSession();
    if (!authorize({ orgRole: session.membership.role, action: 'org:manage' })) {
      throw new Error('FORBIDDEN');
    }
    const ext: ApiAppExtension = {
      id: crypto.randomUUID(),
      orgId: session.org.id,
      name: input.name.trim(),
      kind: input.kind,
      enabled: true,
      config: input.config ?? {},
      createdAt: nowIso(),
    };
    this.store.apiExtensions.push(ext);
    return ext;
  }
}
