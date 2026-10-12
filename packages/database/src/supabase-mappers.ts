import type {
  Board,
  BoardColumn,
  BoardGroup,
  BoardItem,
  BoardView,
  Comment,
  Notification,
  OrgMembership,
  Organization,
  PlatformRole,
  Subscription,
  User,
  Workspace,
} from '@unison/types';

type Row = Record<string, unknown>;

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' ? v : Number(v ?? fallback) || fallback;
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

export function mapProfile(row: Row): User {
  return {
    id: str(row.id),
    email: str(row.email),
    displayName: str(row.display_name),
    avatarUrl: (row.avatar_url as string | null) ?? null,
    locale: (str(row.locale, 'en') as User['locale']) || 'en',
    createdAt: str(row.created_at),
  };
}

export function mapOrg(row: Row): Organization {
  return {
    id: str(row.id),
    name: str(row.name),
    slug: str(row.slug),
    status: (str(row.status, 'active') as Organization['status']) || 'active',
    planId: str(row.plan_id, 'trial') as Organization['planId'],
    seatLimit: num(row.seat_limit, 10),
    createdAt: str(row.created_at),
  };
}

export function mapMembership(row: Row): OrgMembership {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    userId: str(row.user_id),
    role: str(row.role, 'member') as OrgMembership['role'],
    createdAt: str(row.created_at),
  };
}

export function mapWorkspace(row: Row): Workspace {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    name: str(row.name),
    slug: str(row.slug),
    description: (row.description as string | null) ?? null,
    createdAt: str(row.created_at),
  };
}

export function mapBoard(row: Row): Board {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    workspaceId: str(row.workspace_id),
    name: str(row.name),
    description: (row.description as string | null) ?? null,
    visibility: (str(row.visibility, 'workspace') as Board['visibility']) || 'workspace',
    templateKey: (row.template_key as string | null) ?? null,
    archivedAt: (row.archived_at as string | null) ?? null,
    position: num(row.position),
    createdBy: str(row.created_by),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function mapGroup(row: Row): BoardGroup {
  return {
    id: str(row.id),
    boardId: str(row.board_id),
    orgId: str(row.org_id),
    name: str(row.name),
    color: str(row.color, '#1F6F6A'),
    position: num(row.position),
    archivedAt: (row.archived_at as string | null) ?? null,
  };
}

export function mapColumn(row: Row): BoardColumn {
  return {
    id: str(row.id),
    boardId: str(row.board_id),
    orgId: str(row.org_id),
    name: str(row.name),
    type: str(row.type) as BoardColumn['type'],
    position: num(row.position),
    width: num(row.width, 140),
    isHidden: Boolean(row.is_hidden),
    settings: (row.settings as BoardColumn['settings']) ?? {},
  };
}

export function mapItem(row: Row): BoardItem {
  return {
    id: str(row.id),
    boardId: str(row.board_id),
    groupId: str(row.group_id),
    orgId: str(row.org_id),
    parentItemId: (row.parent_item_id as string | null) ?? null,
    name: str(row.name),
    description: (row.description as string | null) ?? null,
    status: str(row.status, 'not_started') as BoardItem['status'],
    priority: str(row.priority, 'none') as BoardItem['priority'],
    position: num(row.position),
    dueDate: (row.due_date as string | null) ?? null,
    progress: num(row.progress),
    assigneeIds: strArr(row.assignee_ids),
    watcherIds: strArr(row.watcher_ids),
    values: (row.values as Record<string, unknown>) ?? {},
    archivedAt: (row.archived_at as string | null) ?? null,
    createdBy: str(row.created_by),
    updatedBy: str(row.updated_by),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function mapView(row: Row): BoardView {
  return {
    id: str(row.id),
    boardId: str(row.board_id),
    orgId: str(row.org_id),
    name: str(row.name),
    type: str(row.type) as BoardView['type'],
    config: (row.config as Record<string, unknown>) ?? {},
    position: num(row.position),
    isDefault: Boolean(row.is_default),
    visibility: (str(row.visibility, 'shared') as BoardView['visibility']) || 'shared',
    ownerUserId: (row.owner_user_id as string | null) ?? null,
  };
}

export function mapComment(row: Row): Comment {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    itemId: str(row.item_id),
    authorId: str(row.author_id),
    body: str(row.body),
    mentionUserIds: strArr(row.mention_user_ids),
    parentCommentId: (row.parent_comment_id as string | null) ?? null,
    reactions: (row.reactions as Record<string, string[]>) ?? {},
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

export function mapNotification(row: Row): Notification {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    orgId: str(row.org_id),
    type: str(row.type),
    title: str(row.title),
    body: str(row.body),
    href: (row.href as string | null) ?? null,
    readAt: (row.read_at as string | null) ?? null,
    createdAt: str(row.created_at),
  };
}

export function mapSubscription(row: Row): Subscription {
  return {
    id: str(row.id),
    orgId: str(row.org_id),
    planId: str(row.plan_id) as Subscription['planId'],
    status: str(row.status) as Subscription['status'],
    seats: num(row.seats),
    trialEndsAt: (row.trial_ends_at as string | null) ?? null,
    currentPeriodEnd: (row.current_period_end as string | null) ?? null,
    graceEndsAt: (row.grace_ends_at as string | null) ?? null,
    provider: (str(row.provider, 'mock') as Subscription['provider']) || 'mock',
    providerCustomerId: (row.provider_customer_id as string | null) ?? null,
    providerSubscriptionId: (row.provider_subscription_id as string | null) ?? null,
  };
}

export function mapPlatformRole(row: Row | null | undefined): PlatformRole {
  if (!row) return 'none';
  const role = str(row.role, 'none');
  if (role === 'super_admin' || role === 'support' || role === 'none') return role;
  return 'none';
}

export function throwOnError(error: { message?: string } | null, code: string): void {
  if (error) {
    throw new Error(`${code}: ${error.message ?? 'unknown'}`);
  }
}
