import { z } from 'zod';

export const localeSchema = z.enum(['en', 'ar', 'he']);
export const orgRoleSchema = z.enum([
  'owner',
  'admin',
  'workspace_admin',
  'member',
  'viewer',
  'guest',
]);
export const boardVisibilitySchema = z.enum(['private', 'workspace', 'org']);
export const itemStatusSchema = z.enum([
  'not_started',
  'working',
  'stuck',
  'done',
  'cancelled',
]);
export const prioritySchema = z.enum(['none', 'low', 'medium', 'high', 'urgent']);
export const columnTypeSchema = z.enum([
  'text',
  'long_text',
  'status',
  'priority',
  'people',
  'team',
  'date',
  'time',
  'datetime',
  'date_range',
  'timeline',
  'duration',
  'number',
  'currency',
  'percentage',
  'checkbox',
  'dropdown',
  'link',
  'email',
  'phone',
  'location',
  'tags',
  'files',
  'rating',
  'progress',
  'formula',
  'dependency',
  'relation',
  'mirror',
  'auto_number',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'week',
  'country',
  'color',
  'image',
  'vote',
  'button',
  'time_tracking',
]);
export const viewTypeSchema = z.enum([
  'table',
  'kanban',
  'calendar',
  'timeline',
  'dashboard',
  'workload',
  'chart',
  'cards',
  'gantt',
  'files_gallery',
  'map',
  'pivot',
]);
export const planIdSchema = z.enum(['trial', 'starter', 'growth', 'scale', 'enterprise']);

export const statusLabelSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const columnSettingsSchema = z
  .object({
    labels: z.array(statusLabelSchema).optional(),
    defaultLabelId: z.string().optional(),
    options: z
      .array(
        z.object({
          id: z.string().min(1).max(64),
          name: z.string().min(1).max(80),
          color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        }),
      )
      .optional(),
    formula: z.string().max(2000).optional(),
    width: z.number().int().min(80).max(640).optional(),
    required: z.boolean().optional(),
    summary: z.enum(['none', 'sum', 'avg', 'count', 'min', 'max']).optional(),
    systemField: z
      .enum(['status', 'priority', 'assigneeIds', 'dueDate', 'progress', 'name'])
      .optional(),
    relatedBoardId: z.string().uuid().nullable().optional(),
    permissions: z
      .object({
        writeMinRole: orgRoleSchema.optional(),
      })
      .optional(),
  })
  .passthrough();

export const formSubmitSchema = z.object({
  fields: z.record(z.unknown()),
  /** Honeypot — must be empty; bots that fill it are rejected */
  website: z.string().max(200).optional(),
});

export const createColumnSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  type: columnTypeSchema,
  settings: columnSettingsSchema.optional(),
  width: z.number().int().min(80).max(640).optional(),
  position: z.number().int().min(0).optional(),
});

export const updateColumnSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80).optional(),
  settings: columnSettingsSchema.optional(),
  width: z.number().int().min(80).max(640).optional(),
  isHidden: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const reorderColumnsSchema = z.object({
  boardId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
});

export const setCellValueSchema = z.object({
  itemId: z.string().uuid(),
  columnId: z.string().uuid(),
  value: z.unknown(),
});

export const createOrgSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const createWorkspaceSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().max(500).optional(),
});

export const createBoardSchema = z.object({
  orgId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional(),
  visibility: boardVisibilitySchema.default('workspace'),
  templateKey: z.string().max(64).optional(),
});

export const createGroupSchema = z.object({
  boardId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#1F6F6A'),
});

export const createItemSchema = z.object({
  boardId: z.string().uuid(),
  groupId: z.string().uuid(),
  name: z.string().trim().min(1).max(240),
  parentItemId: z.string().uuid().optional().nullable(),
  status: itemStatusSchema.default('not_started'),
  priority: prioritySchema.default('none'),
  dueDate: z.string().datetime().optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).default([]),
});

export const updateItemSchema = createItemSchema
  .partial()
  .extend({
    id: z.string().uuid(),
    description: z.string().max(10000).optional().nullable(),
    progress: z.number().min(0).max(100).optional(),
    values: z.record(z.unknown()).optional(),
    watcherIds: z.array(z.string().uuid()).optional(),
    position: z.number().int().min(0).optional(),
    groupId: z.string().uuid().optional(),
  });

export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const inviteMemberSchema = z.object({
  orgId: z.string().uuid(),
  email: z.string().email(),
  role: orgRoleSchema.default('member'),
});

export const acceptInvitationSchema = z.object({
  token: z.string().uuid(),
});

export const createTeamSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  workspaceId: z.string().uuid().optional().nullable(),
});

export const billingDemoStateSchema = z.object({
  orgId: z.string().uuid(),
  planId: planIdSchema.optional(),
  status: z
    .enum(['trialing', 'active', 'past_due', 'grace', 'suspended', 'cancelled'])
    .optional(),
});

export const commentSchema = z.object({
  itemId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  mentionUserIds: z.array(z.string().uuid()).default([]),
  parentCommentId: z.string().uuid().nullable().optional(),
});

export const commentReactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
});

export const searchSchema = z.object({
  orgId: z.string().uuid(),
  query: z.string().trim().min(1).max(200),
  limit: z.number().int().min(1).max(50).default(20),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
export type SetCellValueInput = z.infer<typeof setCellValueSchema>;
