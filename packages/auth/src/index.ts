import type { OrgRole, PlatformRole } from '@unison/types';

const orgRoleRank: Record<OrgRole, number> = {
  guest: 1,
  viewer: 2,
  member: 3,
  workspace_admin: 4,
  admin: 5,
  owner: 6,
};

export function hasMinOrgRole(role: OrgRole, minimum: OrgRole): boolean {
  return orgRoleRank[role] >= orgRoleRank[minimum];
}

export function canManageOrg(role: OrgRole): boolean {
  return hasMinOrgRole(role, 'admin');
}

/** Workspace admins can invite members/viewers/guests; org admins invite any. */
export function canInvite(role: OrgRole): boolean {
  return hasMinOrgRole(role, 'workspace_admin');
}

/** Members+ can edit items; viewers/guests are read-only. */
export function canEditBoard(role: OrgRole): boolean {
  return hasMinOrgRole(role, 'member');
}

export function canViewBoard(role: OrgRole): boolean {
  return hasMinOrgRole(role, 'guest');
}

export function canArchiveBoard(role: OrgRole): boolean {
  return hasMinOrgRole(role, 'admin');
}

/** Structure: columns/groups/views — workspace_admin+ */
export function canEditBoardStructure(role: OrgRole): boolean {
  return hasMinOrgRole(role, 'workspace_admin');
}

/** Workspaces/teams CRUD — workspace_admin+ (not full org billing) */
export function canManageWorkspace(role: OrgRole): boolean {
  return hasMinOrgRole(role, 'workspace_admin');
}

export function canEditFiles(role: OrgRole): boolean {
  return hasMinOrgRole(role, 'member');
}

export function isPlatformStaff(role: PlatformRole): boolean {
  return role === 'super_admin' || role === 'support';
}

export function canImpersonate(role: PlatformRole): boolean {
  return role === 'super_admin' || role === 'support';
}

export function canSuspendOrg(role: PlatformRole): boolean {
  return role === 'super_admin';
}

/** Never expose password hashes or raw credentials in API responses. */
export function sanitizeUserPublic<T extends { passwordHash?: unknown; email: string }>(
  user: T,
): Omit<T, 'passwordHash'> {
  const { passwordHash: _ignored, ...rest } = user;
  return rest;
}

/** Built-in + Phase 3 granular actions (message/channel/integration/time/docs). */
export type PermissionAction =
  | 'org:read'
  | 'org:manage'
  | 'org:invite'
  | 'workspace:manage'
  | 'board:read'
  | 'board:write'
  | 'board:structure'
  | 'board:admin'
  | 'file:write'
  | 'file:delete'
  | 'message:read'
  | 'message:write'
  | 'channel:manage'
  | 'integration:read'
  | 'integration:manage'
  | 'automation:manage'
  | 'time:write'
  | 'time:read_financial'
  | 'doc:read'
  | 'doc:write'
  | 'role:manage'
  | 'platform:read'
  | 'platform:impersonate'
  | 'platform:suspend';

/** Human catalog for admin permission preview / custom roles. */
export const PERMISSION_CATALOG: Array<{
  action: PermissionAction;
  label: string;
  group: 'org' | 'board' | 'files' | 'comms' | 'integrations' | 'time' | 'docs' | 'platform';
}> = [
  { action: 'org:read', label: 'View organization', group: 'org' },
  { action: 'org:manage', label: 'Manage organization & billing', group: 'org' },
  { action: 'org:invite', label: 'Invite members', group: 'org' },
  { action: 'workspace:manage', label: 'Manage workspaces & teams', group: 'org' },
  { action: 'role:manage', label: 'Manage custom roles', group: 'org' },
  { action: 'board:read', label: 'View boards', group: 'board' },
  { action: 'board:write', label: 'Edit items & cells', group: 'board' },
  { action: 'board:structure', label: 'Edit board structure', group: 'board' },
  { action: 'board:admin', label: 'Archive / admin boards', group: 'board' },
  { action: 'file:write', label: 'Upload files', group: 'files' },
  { action: 'file:delete', label: 'Delete files', group: 'files' },
  { action: 'message:read', label: 'Read messages', group: 'comms' },
  { action: 'message:write', label: 'Send messages', group: 'comms' },
  { action: 'channel:manage', label: 'Manage channels', group: 'comms' },
  { action: 'integration:read', label: 'View integrations', group: 'integrations' },
  { action: 'integration:manage', label: 'Connect integrations', group: 'integrations' },
  { action: 'automation:manage', label: 'Manage automations', group: 'integrations' },
  { action: 'time:write', label: 'Log time entries', group: 'time' },
  { action: 'time:read_financial', label: 'View financial time fields', group: 'time' },
  { action: 'doc:read', label: 'View workdocs', group: 'docs' },
  { action: 'doc:write', label: 'Edit workdocs', group: 'docs' },
  { action: 'platform:read', label: 'Platform console', group: 'platform' },
  { action: 'platform:impersonate', label: 'Impersonate (audited)', group: 'platform' },
  { action: 'platform:suspend', label: 'Suspend organizations', group: 'platform' },
];

/** Default allow-set for a built-in org role (used by custom-role inheritance). */
export function defaultActionsForOrgRole(role: OrgRole): PermissionAction[] {
  const all = PERMISSION_CATALOG.map((c) => c.action).filter((a) => !a.startsWith('platform:'));
  return all.filter((action) =>
    authorize({ orgRole: role, platformRole: 'none', action }),
  );
}

/**
 * Preview whether an action is allowed — for admin UI / debugging.
 * Optional `grants` / `denies` overlay custom role overrides on top of built-in rank.
 */
export function previewPermission(input: {
  orgRole?: OrgRole | null;
  platformRole?: PlatformRole | null;
  action: PermissionAction;
  grants?: PermissionAction[];
  denies?: PermissionAction[];
}): { allowed: boolean; source: 'deny' | 'grant' | 'builtin' | 'none' } {
  if (input.denies?.includes(input.action)) {
    return { allowed: false, source: 'deny' };
  }
  if (input.grants?.includes(input.action)) {
    return { allowed: true, source: 'grant' };
  }
  const allowed = authorize({
    orgRole: input.orgRole,
    platformRole: input.platformRole,
    action: input.action,
  });
  return { allowed, source: allowed ? 'builtin' : 'none' };
}

export function authorize(input: {
  orgRole?: OrgRole | null;
  platformRole?: PlatformRole | null;
  action: PermissionAction;
  /** Optional custom-role overlays */
  grants?: PermissionAction[];
  denies?: PermissionAction[];
}): boolean {
  if (input.denies?.includes(input.action)) return false;
  if (input.grants?.includes(input.action)) return true;

  const orgRole = input.orgRole ?? null;
  const platformRole = input.platformRole ?? 'none';

  switch (input.action) {
    case 'org:read':
      return Boolean(orgRole) || isPlatformStaff(platformRole);
    case 'org:manage':
      return Boolean(orgRole && canManageOrg(orgRole));
    case 'org:invite':
      return Boolean(orgRole && canInvite(orgRole));
    case 'workspace:manage':
      return Boolean(orgRole && canManageWorkspace(orgRole));
    case 'role:manage':
      return Boolean(orgRole && canManageOrg(orgRole));
    case 'board:read':
      return Boolean(orgRole && canViewBoard(orgRole)) || isPlatformStaff(platformRole);
    case 'board:write':
      return Boolean(orgRole && canEditBoard(orgRole));
    case 'board:structure':
      return Boolean(orgRole && canEditBoardStructure(orgRole));
    case 'board:admin':
      return Boolean(orgRole && canArchiveBoard(orgRole));
    case 'file:write':
      return Boolean(orgRole && canEditFiles(orgRole));
    case 'file:delete':
      return Boolean(orgRole && hasMinOrgRole(orgRole, 'workspace_admin'));
    case 'message:read':
      return Boolean(orgRole && canViewBoard(orgRole)) || isPlatformStaff(platformRole);
    case 'message:write':
      return Boolean(orgRole && canEditBoard(orgRole));
    case 'channel:manage':
      return Boolean(orgRole && canManageWorkspace(orgRole));
    case 'integration:read':
      return Boolean(orgRole && canViewBoard(orgRole));
    case 'integration:manage':
      return Boolean(orgRole && canManageOrg(orgRole));
    case 'automation:manage':
      return Boolean(orgRole && canEditBoardStructure(orgRole));
    case 'time:write':
      return Boolean(orgRole && canEditBoard(orgRole));
    case 'time:read_financial':
      // Workers (member) cannot see financial fields; workspace_admin+ can.
      return Boolean(orgRole && hasMinOrgRole(orgRole, 'workspace_admin'));
    case 'doc:read':
      return Boolean(orgRole && canViewBoard(orgRole)) || isPlatformStaff(platformRole);
    case 'doc:write':
      return Boolean(orgRole && canEditBoard(orgRole));
    case 'platform:read':
      return isPlatformStaff(platformRole);
    case 'platform:impersonate':
      return canImpersonate(platformRole);
    case 'platform:suspend':
      return canSuspendOrg(platformRole);
    default:
      return false;
  }
}
