import { resolveEntitlements } from '@unison/billing';
import type { UnisonEnv } from '@unison/config';
import { getEnv } from '@unison/config';
import type {
  Board,
  BoardColumn,
  BoardGroup,
  BoardItem,
  Comment,
  DemoSession,
  Entitlements,
  Notification,
  Organization,
  Workspace,
} from '@unison/types';
import type { UnisonRepository } from './repository';
import {
  createUserSupabaseClient,
  type UnisonSupabaseClient,
} from './supabase-client';
import {
  mapBoard,
  mapColumn,
  mapComment,
  mapGroup,
  mapItem,
  mapMembership,
  mapNotification,
  mapOrg,
  mapPlatformRole,
  mapProfile,
  mapSubscription,
  mapView,
  mapWorkspace,
  throwOnError,
} from './supabase-mappers';

function notSupported(method: string): never {
  throw new Error(
    `SUPABASE_${method}_NOT_SUPPORTED: use Auth session APIs in live mode (demo switchUser/impersonation disabled).`,
  );
}

/**
 * Live Supabase repository (PostgREST + RLS).
 * Requires authenticated JWT on the client for tenant-scoped reads/writes.
 */
export class SupabaseRepository implements UnisonRepository {
  private sessionCache: DemoSession | null = null;

  constructor(
    private readonly client: UnisonSupabaseClient,
    private readonly env: UnisonEnv = getEnv(),
  ) {}

  static fromEnv(env: UnisonEnv = getEnv(), accessToken?: string): SupabaseRepository {
    return new SupabaseRepository(createUserSupabaseClient(env, accessToken), env);
  }

  private async requireSession(): Promise<DemoSession> {
    if (this.sessionCache) return this.sessionCache;
    const session = await this.getSession();
    this.sessionCache = session;
    return session;
  }

  private bustSession() {
    this.sessionCache = null;
  }

  async getSession(): Promise<DemoSession> {
    const { data: authData, error: authError } = await this.client.auth.getUser();
    throwOnError(authError, 'AUTH_GET_USER');
    const userId = authData.user?.id;
    if (!userId) throw new Error('AUTH_REQUIRED: no Supabase user session');

    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    throwOnError(profileError, 'PROFILE_LOAD');

    const { data: membership, error: membershipError } = await this.client
      .from('org_memberships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    throwOnError(membershipError, 'MEMBERSHIP_LOAD');
    if (!membership) throw new Error('ORG_MEMBERSHIP_REQUIRED');

    const { data: org, error: orgError } = await this.client
      .from('organizations')
      .select('*')
      .eq('id', membership.org_id)
      .single();
    throwOnError(orgError, 'ORG_LOAD');

    const { data: platformRow } = await this.client
      .from('platform_roles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const session: DemoSession = {
      user: mapProfile(profile),
      org: mapOrg(org),
      membership: mapMembership(membership),
      platformRole: mapPlatformRole(platformRow),
    };
    this.sessionCache = session;
    return session;
  }

  switchUser(_userId: string): void {
    notSupported('SWITCH_USER');
  }

  startImpersonation(
    _targetUserId: string,
    _actorPlatformRole: DemoSession['platformRole'],
  ): void {
    notSupported('IMPERSONATION');
  }

  stopImpersonation(): void {
    notSupported('IMPERSONATION');
  }

  async listWorkspaces(orgId: string): Promise<Workspace[]> {
    await this.assertOrgAccess(orgId);
    const { data, error } = await this.client
      .from('workspaces')
      .select('*')
      .eq('org_id', orgId)
      .order('name');
    throwOnError(error, 'WORKSPACES_LIST');
    return (data ?? []).map(mapWorkspace);
  }

  async listBoards(orgId: string, workspaceId?: string): Promise<Board[]> {
    await this.assertOrgAccess(orgId);
    let query = this.client
      .from('boards')
      .select('*')
      .eq('org_id', orgId)
      .is('archived_at', null)
      .order('position');
    if (workspaceId) query = query.eq('workspace_id', workspaceId);
    const { data, error } = await query;
    throwOnError(error, 'BOARDS_LIST');
    return (data ?? []).map(mapBoard);
  }

  async getBoardBundle(boardId: string) {
    const { data: boardRow, error: boardError } = await this.client
      .from('boards')
      .select('*')
      .eq('id', boardId)
      .single();
    throwOnError(boardError, 'BOARD_LOAD');
    const board = mapBoard(boardRow);
    await this.assertOrgAccess(board.orgId);

    const [groups, columns, items, views, comments, memberships] = await Promise.all([
      this.client.from('board_groups').select('*').eq('board_id', boardId).order('position'),
      this.client.from('board_columns').select('*').eq('board_id', boardId).order('position'),
      this.client
        .from('board_items')
        .select('*')
        .eq('board_id', boardId)
        .is('archived_at', null)
        .order('position'),
      this.client.from('board_views').select('*').eq('board_id', boardId).order('position'),
      this.client
        .from('comments')
        .select('*')
        .in(
          'item_id',
          (
            await this.client.from('board_items').select('id').eq('board_id', boardId)
          ).data?.map((r) => r.id as string) ?? ['00000000-0000-4000-a000-000000000000'],
        ),
      this.client.from('org_memberships').select('user_id').eq('org_id', board.orgId),
    ]);

    throwOnError(groups.error, 'GROUPS_LOAD');
    throwOnError(columns.error, 'COLUMNS_LOAD');
    throwOnError(items.error, 'ITEMS_LOAD');
    throwOnError(views.error, 'VIEWS_LOAD');
    throwOnError(comments.error, 'COMMENTS_LOAD');
    throwOnError(memberships.error, 'MEMBERS_LOAD');

    const memberIds = (memberships.data ?? []).map((m) => m.user_id as string);
    const { data: profiles } = await this.client
      .from('profiles')
      .select('*')
      .in('id', memberIds.length ? memberIds : ['00000000-0000-4000-a000-000000000000']);

    const profileById = new Map((profiles ?? []).map((p) => [p.id as string, mapProfile(p)]));

    return {
      board,
      groups: (groups.data ?? []).map(mapGroup),
      columns: (columns.data ?? []).map(mapColumn),
      items: (items.data ?? []).map(mapItem),
      views: (views.data ?? []).map(mapView),
      comments: (comments.data ?? []).map(mapComment),
      members: memberIds.map((userId) => ({
        userId,
        user: profileById.get(userId) ?? {
          id: userId,
          email: '',
          displayName: 'Member',
          locale: 'en' as const,
          createdAt: new Date(0).toISOString(),
        },
      })),
    };
  }

  async createBoard(input: {
    orgId: string;
    workspaceId: string;
    name: string;
    description?: string;
    visibility?: Board['visibility'];
    templateKey?: string;
  }): Promise<Board> {
    const session = await this.requireSession();
    await this.assertOrgAccess(input.orgId);
    const { data, error } = await this.client
      .from('boards')
      .insert({
        org_id: input.orgId,
        workspace_id: input.workspaceId,
        name: input.name,
        description: input.description ?? null,
        visibility: input.visibility ?? 'workspace',
        template_key: input.templateKey ?? null,
        created_by: session.user.id,
      })
      .select('*')
      .single();
    throwOnError(error, 'BOARD_CREATE');
    return mapBoard(data);
  }

  async createGroup(boardId: string, name: string, color = '#1F6F6A'): Promise<BoardGroup> {
    const board = await this.loadBoard(boardId);
    await this.assertOrgAccess(board.orgId);
    const { data, error } = await this.client
      .from('board_groups')
      .insert({
        board_id: boardId,
        org_id: board.orgId,
        name,
        color,
      })
      .select('*')
      .single();
    throwOnError(error, 'GROUP_CREATE');
    return mapGroup(data);
  }

  async createColumn(input: {
    boardId: string;
    name: string;
    type: BoardColumn['type'];
    settings?: BoardColumn['settings'];
    width?: number;
    position?: number;
  }): Promise<BoardColumn> {
    const board = await this.loadBoard(input.boardId);
    await this.assertOrgAccess(board.orgId);
    const { data, error } = await this.client
      .from('board_columns')
      .insert({
        board_id: input.boardId,
        org_id: board.orgId,
        name: input.name,
        type: input.type,
        settings: input.settings ?? {},
        width: input.width ?? 140,
        position: input.position ?? 0,
      })
      .select('*')
      .single();
    throwOnError(error, 'COLUMN_CREATE');
    return mapColumn(data);
  }

  async updateColumn(
    columnId: string,
    patch: Partial<Pick<BoardColumn, 'name' | 'settings' | 'width' | 'isHidden' | 'position'>>,
  ): Promise<BoardColumn> {
    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.settings !== undefined) payload.settings = patch.settings;
    if (patch.width !== undefined) payload.width = patch.width;
    if (patch.isHidden !== undefined) payload.is_hidden = patch.isHidden;
    if (patch.position !== undefined) payload.position = patch.position;
    const { data, error } = await this.client
      .from('board_columns')
      .update(payload)
      .eq('id', columnId)
      .select('*')
      .single();
    throwOnError(error, 'COLUMN_UPDATE');
    return mapColumn(data);
  }

  async deleteColumn(columnId: string): Promise<void> {
    const { error } = await this.client.from('board_columns').delete().eq('id', columnId);
    throwOnError(error, 'COLUMN_DELETE');
  }

  async reorderColumns(boardId: string, orderedIds: string[]): Promise<BoardColumn[]> {
    await Promise.all(
      orderedIds.map((id, position) =>
        this.client.from('board_columns').update({ position }).eq('id', id).eq('board_id', boardId),
      ),
    );
    const { data, error } = await this.client
      .from('board_columns')
      .select('*')
      .eq('board_id', boardId)
      .order('position');
    throwOnError(error, 'COLUMNS_REORDER');
    return (data ?? []).map(mapColumn);
  }

  async setCellValue(itemId: string, columnId: string, raw: unknown): Promise<BoardItem> {
    const { data: itemRow, error: itemError } = await this.client
      .from('board_items')
      .select('*')
      .eq('id', itemId)
      .single();
    throwOnError(itemError, 'ITEM_LOAD');
    const item = mapItem(itemRow);
    const values = { ...item.values, [columnId]: raw };
    const session = await this.requireSession();
    const { data, error } = await this.client
      .from('board_items')
      .update({ values, updated_by: session.user.id, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select('*')
      .single();
    throwOnError(error, 'CELL_UPDATE');
    return mapItem(data);
  }

  async columnSummaries(boardId: string): Promise<Record<string, number | null>> {
    const bundle = await this.getBoardBundle(boardId);
    const out: Record<string, number | null> = {};
    for (const col of bundle.columns) {
      if (col.type !== 'number' && col.type !== 'progress' && col.type !== 'duration') {
        out[col.id] = null;
        continue;
      }
      let sum = 0;
      let n = 0;
      for (const item of bundle.items) {
        const v = item.values[col.id];
        if (typeof v === 'number') {
          sum += v;
          n += 1;
        }
      }
      out[col.id] = n ? sum : null;
    }
    return out;
  }

  async createItem(input: {
    boardId: string;
    groupId: string;
    name: string;
    parentItemId?: string | null;
  }): Promise<BoardItem> {
    const board = await this.loadBoard(input.boardId);
    const session = await this.requireSession();
    await this.assertOrgAccess(board.orgId);
    const { data, error } = await this.client
      .from('board_items')
      .insert({
        board_id: input.boardId,
        group_id: input.groupId,
        org_id: board.orgId,
        name: input.name,
        parent_item_id: input.parentItemId ?? null,
        created_by: session.user.id,
        updated_by: session.user.id,
      })
      .select('*')
      .single();
    throwOnError(error, 'ITEM_CREATE');
    return mapItem(data);
  }

  async updateItem(
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
  ): Promise<BoardItem> {
    const session = await this.requireSession();
    const payload: Record<string, unknown> = {
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    };
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.priority !== undefined) payload.priority = patch.priority;
    if (patch.dueDate !== undefined) payload.due_date = patch.dueDate;
    if (patch.progress !== undefined) payload.progress = patch.progress;
    if (patch.assigneeIds !== undefined) payload.assignee_ids = patch.assigneeIds;
    if (patch.watcherIds !== undefined) payload.watcher_ids = patch.watcherIds;
    if (patch.values !== undefined) payload.values = patch.values;
    if (patch.groupId !== undefined) payload.group_id = patch.groupId;
    if (patch.position !== undefined) payload.position = patch.position;
    const { data, error } = await this.client
      .from('board_items')
      .update(payload)
      .eq('id', itemId)
      .select('*')
      .single();
    throwOnError(error, 'ITEM_UPDATE');
    return mapItem(data);
  }

  async reorderItems(orderedIds: string[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, position) =>
        this.client.from('board_items').update({ position }).eq('id', id),
      ),
    );
  }

  async duplicateItem(itemId: string): Promise<BoardItem> {
    const { data: row, error } = await this.client
      .from('board_items')
      .select('*')
      .eq('id', itemId)
      .single();
    throwOnError(error, 'ITEM_LOAD');
    const item = mapItem(row);
    return this.createItem({
      boardId: item.boardId,
      groupId: item.groupId,
      name: `${item.name} (copy)`,
      parentItemId: item.parentItemId,
    });
  }

  async archiveItem(itemId: string): Promise<void> {
    const { error } = await this.client
      .from('board_items')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', itemId);
    throwOnError(error, 'ITEM_ARCHIVE');
  }

  async restoreItem(itemId: string): Promise<void> {
    const { error } = await this.client
      .from('board_items')
      .update({ archived_at: null })
      .eq('id', itemId);
    throwOnError(error, 'ITEM_RESTORE');
  }

  async addComment(
    itemId: string,
    body: string,
    mentionUserIds: string[] = [],
    parentCommentId: string | null = null,
  ): Promise<Comment> {
    const session = await this.requireSession();
    const { data: itemRow, error: itemError } = await this.client
      .from('board_items')
      .select('org_id')
      .eq('id', itemId)
      .single();
    throwOnError(itemError, 'ITEM_LOAD');
    if (!itemRow) throw new Error('ITEM_LOAD: not found');
    const orgId = itemRow.org_id as string;
    const { data, error } = await this.client
      .from('comments')
      .insert({
        org_id: orgId,
        item_id: itemId,
        author_id: session.user.id,
        body,
        mention_user_ids: mentionUserIds,
        parent_comment_id: parentCommentId,
        reactions: {},
      })
      .select('*')
      .single();
    throwOnError(error, 'COMMENT_CREATE');

    for (const uid of mentionUserIds) {
      if (uid === session.user.id) continue;
      await this.client.from('notifications').insert({
        user_id: uid,
        org_id: orgId,
        type: 'mention',
        title: 'You were mentioned',
        body: `${session.user.displayName} mentioned you`,
        href: `/app/boards`,
      });
    }

    return mapComment(data);
  }

  async toggleCommentReaction(commentId: string, emoji: string): Promise<Comment> {
    const session = await this.requireSession();
    const { data: row, error } = await this.client
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();
    throwOnError(error, 'COMMENT_LOAD');
    const comment = mapComment(row);
    const current = new Set(comment.reactions[emoji] ?? []);
    if (current.has(session.user.id)) current.delete(session.user.id);
    else current.add(session.user.id);
    const reactions = { ...comment.reactions, [emoji]: [...current] };
    const { data, error: updateError } = await this.client
      .from('comments')
      .update({ reactions })
      .eq('id', commentId)
      .select('*')
      .single();
    throwOnError(updateError, 'COMMENT_REACTION');
    return mapComment(data);
  }

  async listNotifications(userId?: string): Promise<Notification[]> {
    const session = await this.requireSession();
    const uid = userId ?? session.user.id;
    const { data, error } = await this.client
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(100);
    throwOnError(error, 'NOTIFICATIONS_LIST');
    return (data ?? []).map(mapNotification);
  }

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    throwOnError(error, 'NOTIFICATION_READ');
  }

  async myWork(): Promise<BoardItem[]> {
    const session = await this.requireSession();
    const { data, error } = await this.client
      .from('board_items')
      .select('*')
      .eq('org_id', session.org.id)
      .contains('assignee_ids', [session.user.id])
      .is('archived_at', null)
      .order('updated_at', { ascending: false });
    throwOnError(error, 'MY_WORK');
    return (data ?? []).map(mapItem);
  }

  async search(orgId: string, query: string) {
    await this.assertOrgAccess(orgId);
    const q = `%${query.trim()}%`;
    const [boards, items, comments] = await Promise.all([
      this.client.from('boards').select('*').eq('org_id', orgId).ilike('name', q).limit(20),
      this.client.from('board_items').select('*').eq('org_id', orgId).ilike('name', q).limit(40),
      this.client.from('comments').select('*').eq('org_id', orgId).ilike('body', q).limit(20),
    ]);
    throwOnError(boards.error, 'SEARCH_BOARDS');
    throwOnError(items.error, 'SEARCH_ITEMS');
    throwOnError(comments.error, 'SEARCH_COMMENTS');
    return {
      boards: (boards.data ?? []).map(mapBoard),
      items: (items.data ?? []).map(mapItem),
      comments: (comments.data ?? []).map(mapComment),
    };
  }

  async dashboardStats(orgId: string): Promise<Record<string, number>> {
    await this.assertOrgAccess(orgId);
    const [boards, items, open] = await Promise.all([
      this.client
        .from('boards')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .is('archived_at', null),
      this.client
        .from('board_items')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .is('archived_at', null),
      this.client
        .from('board_items')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .is('archived_at', null)
        .neq('status', 'done')
        .neq('status', 'cancelled'),
    ]);
    return {
      boards: boards.count ?? 0,
      items: items.count ?? 0,
      openItems: open.count ?? 0,
    };
  }

  async getEntitlements(): Promise<Entitlements> {
    const session = await this.requireSession();
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('org_id', session.org.id)
      .maybeSingle();
    throwOnError(error, 'SUBSCRIPTION_LOAD');
    const sub = data
      ? mapSubscription(data)
      : {
          id: 'missing',
          orgId: session.org.id,
          planId: session.org.planId,
          status: 'trialing' as const,
          seats: session.org.seatLimit,
          provider: 'mock' as const,
        };
    const boards = await this.listBoards(session.org.id);
    const { count: seatUsage } = await this.client
      .from('org_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', session.org.id);
    return resolveEntitlements({
      org: session.org,
      subscription: sub,
      seatUsage: seatUsage ?? 0,
      boardUsage: boards.length,
    });
  }

  async listOrgsForPlatform() {
    const session = await this.requireSession();
    if (session.platformRole !== 'super_admin' && session.platformRole !== 'support') {
      throw new Error('PLATFORM_FORBIDDEN');
    }
    const { data: orgs, error } = await this.client.from('organizations').select('*');
    throwOnError(error, 'PLATFORM_ORGS');
    const result = [];
    for (const orgRow of orgs ?? []) {
      const org = mapOrg(orgRow);
      const { data: sub } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('org_id', org.id)
        .maybeSingle();
      const { count: seats } = await this.client
        .from('org_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id);
      const { count: boardCount } = await this.client
        .from('boards')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id);
      const { count: itemCount } = await this.client
        .from('board_items')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id);
      result.push({
        org,
        seats: seats ?? 0,
        subscription: sub
          ? mapSubscription(sub)
          : {
              id: 'missing',
              orgId: org.id,
              planId: org.planId,
              status: 'trialing' as const,
              seats: org.seatLimit,
              provider: 'mock' as const,
            },
        usage: { boards: boardCount ?? 0, items: itemCount ?? 0 },
      });
    }
    return result;
  }

  async setOrgStatus(orgId: string, status: Organization['status']): Promise<Organization> {
    const session = await this.requireSession();
    if (session.platformRole !== 'super_admin') throw new Error('PLATFORM_FORBIDDEN');
    const { data, error } = await this.client
      .from('organizations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orgId)
      .select('*')
      .single();
    throwOnError(error, 'ORG_STATUS');
    this.bustSession();
    return mapOrg(data);
  }

  async assertOrgAccess(orgId: string): Promise<void> {
    const session = await this.requireSession();
    if (session.platformRole === 'super_admin' || session.platformRole === 'support') return;
    if (session.org.id !== orgId) throw new Error('CROSS_TENANT_DENIED');
  }

  private async loadBoard(boardId: string): Promise<Board> {
    const { data, error } = await this.client.from('boards').select('*').eq('id', boardId).single();
    throwOnError(error, 'BOARD_LOAD');
    return mapBoard(data);
  }
}
