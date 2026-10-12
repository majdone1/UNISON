import type {
  Board,
  BoardGroup,
  BoardItem,
  Comment,
  DemoSession,
  Entitlements,
  Notification,
  Organization,
  Workspace,
} from '@unison/types';

/** Demo returns sync values; Supabase returns Promises. Always `await` at call sites. */
export type Awaitable<T> = T | Promise<T>;

/**
 * Production seam: both DemoRepository and SupabaseRepository implement this.
 * Route handlers should depend on `getRepository()` rather than demo APIs directly.
 */
export interface UnisonRepository {
  getSession(): Awaitable<DemoSession>;
  switchUser(userId: string): void;
  startImpersonation(targetUserId: string, actorPlatformRole: DemoSession['platformRole']): void;
  stopImpersonation(): void;

  listWorkspaces(orgId: string): Awaitable<Workspace[]>;
  listBoards(orgId: string, workspaceId?: string): Awaitable<Board[]>;
  getBoardBundle(boardId: string): Awaitable<{
    board: Board;
    groups: BoardGroup[];
    columns: import('@unison/types').BoardColumn[];
    items: BoardItem[];
    views: import('@unison/types').BoardView[];
    comments: Comment[];
    members: Array<{
      userId: string;
      user: { id: string; displayName: string; email: string };
    }>;
  }>;

  createBoard(input: {
    orgId: string;
    workspaceId: string;
    name: string;
    description?: string;
    visibility?: Board['visibility'];
    templateKey?: string;
  }): Awaitable<Board>;
  createGroup(boardId: string, name: string, color?: string): Awaitable<BoardGroup>;
  createColumn(input: {
    boardId: string;
    name: string;
    type: import('@unison/types').ColumnType;
    settings?: import('@unison/types').ColumnSettings;
    width?: number;
    position?: number;
  }): Awaitable<import('@unison/types').BoardColumn>;
  updateColumn(
    columnId: string,
    patch: Partial<
      Pick<import('@unison/types').BoardColumn, 'name' | 'settings' | 'width' | 'isHidden' | 'position'>
    >,
  ): Awaitable<import('@unison/types').BoardColumn>;
  deleteColumn(columnId: string): Awaitable<void>;
  reorderColumns(boardId: string, orderedIds: string[]): Awaitable<import('@unison/types').BoardColumn[]>;
  setCellValue(itemId: string, columnId: string, raw: unknown): Awaitable<BoardItem>;
  columnSummaries(boardId: string): Awaitable<Record<string, number | null>>;
  createItem(input: {
    boardId: string;
    groupId: string;
    name: string;
    parentItemId?: string | null;
  }): Awaitable<BoardItem>;
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
  ): Awaitable<BoardItem>;
  reorderItems(orderedIds: string[]): Awaitable<void>;
  duplicateItem(itemId: string): Awaitable<BoardItem>;
  archiveItem(itemId: string): Awaitable<void>;
  restoreItem(itemId: string): Awaitable<void>;

  addComment(
    itemId: string,
    body: string,
    mentionUserIds?: string[],
    parentCommentId?: string | null,
  ): Awaitable<Comment>;
  toggleCommentReaction(commentId: string, emoji: string): Awaitable<Comment>;
  listNotifications(userId?: string): Awaitable<Notification[]>;
  markNotificationRead(id: string): Awaitable<void>;
  myWork(): Awaitable<BoardItem[]>;
  search(
    orgId: string,
    query: string,
  ): Awaitable<{ boards: Board[]; items: BoardItem[]; comments: Comment[] }>;
  dashboardStats(orgId: string): Awaitable<Record<string, number>>;
  getEntitlements(): Awaitable<Entitlements>;
  listOrgsForPlatform(): Awaitable<
    Array<{
      org: Organization;
      seats: number;
      subscription: import('@unison/types').Subscription;
      usage: { boards: number; items: number };
    }>
  >;
  setOrgStatus(orgId: string, status: Organization['status']): Awaitable<Organization>;
  assertOrgAccess(orgId: string): Awaitable<void>;
}
