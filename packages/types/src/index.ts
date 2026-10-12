export type Locale = 'en' | 'ar' | 'he';
export type TextDirection = 'ltr' | 'rtl';

export type OrgRole =
  | 'owner'
  | 'admin'
  | 'workspace_admin'
  | 'member'
  | 'viewer'
  | 'guest';
export type PlatformRole = 'super_admin' | 'support' | 'none';
export type BoardVisibility = 'private' | 'workspace' | 'org';
export type ItemStatus =
  | 'not_started'
  | 'working'
  | 'stuck'
  | 'done'
  | 'cancelled';
export type Priority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export type ColumnType =
  | 'text'
  | 'long_text'
  | 'status'
  | 'priority'
  | 'people'
  | 'team'
  | 'date'
  | 'time'
  | 'datetime'
  | 'date_range'
  | 'timeline'
  | 'duration'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'checkbox'
  | 'dropdown'
  | 'link'
  | 'email'
  | 'phone'
  | 'location'
  | 'tags'
  | 'files'
  | 'rating'
  | 'progress'
  | 'formula'
  | 'dependency'
  | 'relation'
  | 'mirror'
  | 'auto_number'
  | 'created_at'
  | 'updated_at'
  | 'created_by'
  | 'updated_by'
  | 'week'
  | 'country'
  | 'color'
  | 'image'
  | 'vote'
  | 'button'
  | 'time_tracking';

export interface StatusLabel {
  id: string;
  name: string;
  color: string;
}

export interface ColumnPermissions {
  /** Minimum org role required to edit cells in this column (default: member) */
  writeMinRole?: OrgRole;
}

export interface ColumnSettings {
  labels?: StatusLabel[];
  defaultLabelId?: string;
  options?: Array<{ id: string; name: string; color?: string }>;
  formula?: string;
  width?: number;
  required?: boolean;
  summary?: 'none' | 'sum' | 'avg' | 'count' | 'min' | 'max';
  /** When set, cell reads/writes the matching first-class BoardItem field */
  systemField?: 'status' | 'priority' | 'assigneeIds' | 'dueDate' | 'progress' | 'name';
  /** Relation columns: board to connect (defaults to same board) */
  relatedBoardId?: string | null;
  permissions?: ColumnPermissions;
  [key: string]: unknown;
}

export type ViewType =
  | 'table'
  | 'kanban'
  | 'calendar'
  | 'timeline'
  | 'dashboard'
  | 'workload'
  | 'chart'
  | 'cards'
  | 'gantt'
  | 'files_gallery'
  | 'map'
  | 'pivot';

export type PlanId = 'trial' | 'starter' | 'growth' | 'scale' | 'enterprise';
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'grace'
  | 'suspended'
  | 'cancelled';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  locale: Locale;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  planId: PlanId;
  seatLimit: number;
  createdAt: string;
}

export interface OrgMembership {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
}

export interface Workspace {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
}

export interface Team {
  id: string;
  orgId: string;
  workspaceId?: string | null;
  name: string;
  createdAt: string;
}

export interface Board {
  id: string;
  orgId: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  visibility: BoardVisibility;
  templateKey?: string | null;
  archivedAt?: string | null;
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardGroup {
  id: string;
  boardId: string;
  orgId: string;
  name: string;
  color: string;
  position: number;
  archivedAt?: string | null;
}

export interface BoardColumn {
  id: string;
  boardId: string;
  orgId: string;
  name: string;
  type: ColumnType;
  position: number;
  width: number;
  isHidden: boolean;
  settings: ColumnSettings;
}

export interface BoardItem {
  id: string;
  boardId: string;
  groupId: string;
  orgId: string;
  parentItemId?: string | null;
  name: string;
  description?: string | null;
  status: ItemStatus;
  priority: Priority;
  position: number;
  dueDate?: string | null;
  progress: number;
  assigneeIds: string[];
  watcherIds: string[];
  values: Record<string, unknown>;
  archivedAt?: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ViewVisibility = 'personal' | 'shared';

export interface BoardView {
  id: string;
  boardId: string;
  orgId: string;
  name: string;
  type: ViewType;
  /** Filter/sort/hidden column state — see ViewConfig in @unison/shared */
  config: Record<string, unknown>;
  position: number;
  isDefault?: boolean;
  visibility: ViewVisibility;
  /** Set for personal views; null for shared */
  ownerUserId?: string | null;
}

export interface Comment {
  id: string;
  orgId: string;
  itemId: string;
  authorId: string;
  body: string;
  mentionUserIds: string[];
  /** Null/undefined = top-level update; set for threaded replies */
  parentCommentId?: string | null;
  /** emoji → user ids who reacted */
  reactions: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  orgId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  orgId: string;
  inApp: boolean;
  email: boolean;
  push: boolean;
  desktop: boolean;
  digestEmail: boolean;
  muteAssign: boolean;
  muteMention: boolean;
  muteAutomation: boolean;
  muteMessage: boolean;
}

export interface AuditLogEntry {
  id: string;
  orgId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  impersonatorUserId?: string | null;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  seatLimit: number;
  boardLimit: number;
  storageGb: number;
  automationsEnabled: boolean;
  ssoEnabled: boolean;
  priceMonthlyUsd: number;
}

export interface Subscription {
  id: string;
  orgId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  seats: number;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  graceEndsAt?: string | null;
  provider: 'mock' | 'stripe';
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
}

export interface Entitlements {
  planId: PlanId;
  seats: number;
  boards: number;
  storageGb: number;
  automations: boolean;
  sso: boolean;
  canCreateBoard: boolean;
  canInvite: boolean;
  canWriteItems: boolean;
  canRunAutomations: boolean;
  isSuspended: boolean;
  isPastDue: boolean;
}

export interface DemoSession {
  user: User;
  org: Organization;
  membership: OrgMembership;
  platformRole: PlatformRole;
}

/** Phase 3 — custom role overlay on built-in OrgRole */
export interface CustomRole {
  id: string;
  orgId: string;
  name: string;
  description?: string | null;
  /** Inherit rank baseline from this built-in role */
  baseRole: OrgRole;
  grants: string[];
  denies: string[];
  createdAt: string;
  updatedAt: string;
}

export type ChannelKind = 'dm' | 'group' | 'team' | 'workspace' | 'board' | 'project';

export interface ChatChannel {
  id: string;
  orgId: string;
  kind: ChannelKind;
  name: string;
  topic?: string | null;
  teamId?: string | null;
  workspaceId?: string | null;
  boardId?: string | null;
  memberIds: string[];
  createdBy: string;
  createdAt: string;
  archivedAt?: string | null;
}

export interface ChatMessage {
  id: string;
  orgId: string;
  channelId: string;
  authorId: string;
  body: string;
  mentionUserIds: string[];
  parentMessageId?: string | null;
  linkRefs?: Array<{ type: 'board' | 'item' | 'file' | 'dashboard' | 'form'; id: string; href: string }>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type TimeEntryKind = 'work' | 'travel' | 'break' | 'overtime';

export interface TimeEntry {
  id: string;
  orgId: string;
  boardId?: string | null;
  itemId: string;
  userId: string;
  kind: TimeEntryKind;
  minutes: number;
  note?: string | null;
  workedOn: string;
  /** Financial fields — server-gated via time:read_financial */
  costCents?: number | null;
  billableCents?: number | null;
  createdAt: string;
}

export interface Workdoc {
  id: string;
  orgId: string;
  workspaceId?: string | null;
  boardId?: string | null;
  itemId?: string | null;
  title: string;
  /** Incremental JSON document body (not a giant HTML blob) */
  body: { blocks: Array<{ id: string; type: string; text: string }> };
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type IntegrationProviderId =
  | 'slack'
  | 'microsoft_teams'
  | 'outlook'
  | 'gmail'
  | 'google_calendar'
  | 'microsoft_calendar'
  | 'google_drive'
  | 'onedrive'
  | 'dropbox'
  | 'sharepoint'
  | 'zoom'
  | 'github'
  | 'gitlab'
  | 'jira'
  | 'figma'
  | 'zendesk'
  | 'webhooks'
  | 'zapier';

export type IntegrationConnectionStatus = 'disconnected' | 'connected_mock' | 'error';

export interface IntegrationConnection {
  id: string;
  orgId: string;
  providerId: IntegrationProviderId;
  status: IntegrationConnectionStatus;
  displayName: string;
  /** Opaque credential reference — never a raw secret */
  credentialRef?: string | null;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  lastError?: string | null;
}

export interface ApiAppExtension {
  id: string;
  orgId: string;
  name: string;
  kind: 'view' | 'widget' | 'action' | 'provider' | 'field';
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
}
