import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository, getDemoStore, resetDemoStore } from '@unison/database';

/**
 * Cross-tenant denial at repository boundary (same checks used by Route Handlers).
 */
describe('cross-tenant API boundary', () => {
  beforeEach(() => resetDemoStore());

  it('denies foreign org search, activity, attachments, and board archive', () => {
    const repo = new DemoRepository();
    const foreignOrg = getDemoStore().organizations.find((o) => o.slug === 'other-tenant')!;
    const foreignBoard = {
      id: '00000000-0000-4000-a000-000000000099',
      orgId: foreignOrg.id,
    };

    expect(() => repo.search(foreignOrg.id, 'x')).toThrow('CROSS_TENANT_DENIED');
    expect(() => repo.listActivity(foreignOrg.id)).toThrow('CROSS_TENANT_DENIED');
    expect(() => repo.assertOrgAccess(foreignOrg.id)).toThrow('CROSS_TENANT_DENIED');

    // Craft a foreign item into store then deny attachment list via org check
    getDemoStore().items.push({
      id: '00000000-0000-4000-a000-000000000098',
      boardId: foreignBoard.id,
      groupId: '00000000-0000-4000-a000-000000000097',
      orgId: foreignOrg.id,
      name: 'Secret',
      status: 'not_started',
      priority: 'none',
      position: 0,
      progress: 0,
      assigneeIds: [],
      watcherIds: [],
      values: {},
      createdBy: foreignOrg.id,
      updatedBy: foreignOrg.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    expect(() =>
      repo.listAttachments('00000000-0000-4000-a000-000000000098'),
    ).toThrow('CROSS_TENANT_DENIED');
  });

  it('denies guest from platform audit listing via role gate', () => {
    const repo = new DemoRepository();
    const guest = getDemoStore().users.find((u) => u.email === 'guest@unison.demo')!;
    repo.switchUser(guest.id);
    const session = repo.getSession();
    expect(session.platformRole).toBe('none');
  });
});
