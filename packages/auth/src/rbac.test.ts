import { describe, expect, it } from 'vitest';
import {
  authorize,
  defaultActionsForOrgRole,
  hasMinOrgRole,
  PERMISSION_CATALOG,
  previewPermission,
  sanitizeUserPublic,
} from './index';

describe('RBAC', () => {
  it('ranks roles', () => {
    expect(hasMinOrgRole('admin', 'member')).toBe(true);
    expect(hasMinOrgRole('guest', 'member')).toBe(false);
  });

  it('authorizes platform impersonation', () => {
    expect(authorize({ platformRole: 'support', action: 'platform:impersonate' })).toBe(true);
    expect(authorize({ platformRole: 'none', action: 'platform:impersonate' })).toBe(false);
  });

  it('denies guest invite and allows admin', () => {
    expect(authorize({ orgRole: 'guest', action: 'org:invite' })).toBe(false);
    expect(authorize({ orgRole: 'admin', action: 'org:invite' })).toBe(true);
  });

  it('never returns passwordHash from sanitizeUserPublic', () => {
    const clean = sanitizeUserPublic({
      email: 'a@b.com',
      passwordHash: 'secret',
      displayName: 'A',
    });
    expect(clean).toEqual({ email: 'a@b.com', displayName: 'A' });
    expect('passwordHash' in clean).toBe(false);
  });

  it('splits board:write vs board:structure', () => {
    expect(authorize({ orgRole: 'member', action: 'board:write' })).toBe(true);
    expect(authorize({ orgRole: 'member', action: 'board:structure' })).toBe(false);
    expect(authorize({ orgRole: 'admin', action: 'board:structure' })).toBe(true);
    expect(authorize({ orgRole: 'guest', action: 'board:write' })).toBe(false);
  });

  it('viewer is read-only (no board/file write)', () => {
    expect(authorize({ orgRole: 'viewer', action: 'board:read' })).toBe(true);
    expect(authorize({ orgRole: 'viewer', action: 'board:write' })).toBe(false);
    expect(authorize({ orgRole: 'viewer', action: 'file:write' })).toBe(false);
    expect(authorize({ orgRole: 'viewer', action: 'board:structure' })).toBe(false);
    expect(hasMinOrgRole('viewer', 'guest')).toBe(true);
    expect(hasMinOrgRole('viewer', 'member')).toBe(false);
  });

  it('workspace_admin manages workspaces/structure but not org billing', () => {
    expect(authorize({ orgRole: 'workspace_admin', action: 'workspace:manage' })).toBe(true);
    expect(authorize({ orgRole: 'workspace_admin', action: 'board:structure' })).toBe(true);
    expect(authorize({ orgRole: 'workspace_admin', action: 'org:invite' })).toBe(true);
    expect(authorize({ orgRole: 'workspace_admin', action: 'org:manage' })).toBe(false);
    expect(authorize({ orgRole: 'member', action: 'workspace:manage' })).toBe(false);
  });

  it('Phase 3 message/integration/time actions', () => {
    expect(authorize({ orgRole: 'member', action: 'message:write' })).toBe(true);
    expect(authorize({ orgRole: 'viewer', action: 'message:write' })).toBe(false);
    expect(authorize({ orgRole: 'member', action: 'channel:manage' })).toBe(false);
    expect(authorize({ orgRole: 'workspace_admin', action: 'channel:manage' })).toBe(true);
    expect(authorize({ orgRole: 'member', action: 'integration:manage' })).toBe(false);
    expect(authorize({ orgRole: 'admin', action: 'integration:manage' })).toBe(true);
    expect(authorize({ orgRole: 'member', action: 'time:write' })).toBe(true);
    expect(authorize({ orgRole: 'member', action: 'time:read_financial' })).toBe(false);
    expect(authorize({ orgRole: 'workspace_admin', action: 'time:read_financial' })).toBe(true);
    expect(authorize({ orgRole: 'admin', action: 'role:manage' })).toBe(true);
  });

  it('custom role grants/denies overlay via previewPermission', () => {
    const denied = previewPermission({
      orgRole: 'member',
      action: 'integration:manage',
      grants: ['integration:manage'],
    });
    expect(denied).toEqual({ allowed: true, source: 'grant' });
    const blocked = previewPermission({
      orgRole: 'admin',
      action: 'integration:manage',
      denies: ['integration:manage'],
    });
    expect(blocked).toEqual({ allowed: false, source: 'deny' });
  });

  it('permission catalog covers non-platform actions for default roles', () => {
    expect(PERMISSION_CATALOG.length).toBeGreaterThan(15);
    const memberActions = defaultActionsForOrgRole('member');
    expect(memberActions).toContain('board:write');
    expect(memberActions).not.toContain('org:manage');
  });
});
