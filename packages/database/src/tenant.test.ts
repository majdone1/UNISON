import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository, getDemoStore, resetDemoStore } from './demo-store';

describe('DemoRepository tenant isolation', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('allows access to home org boards', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    expect(repo.listBoards(session.org.id).length).toBeGreaterThan(0);
  });

  it('denies cross-tenant board listing', () => {
    const repo = new DemoRepository();
    const foreign = getDemoStore().organizations.find((o) => o.slug === 'other-tenant');
    expect(foreign).toBeTruthy();
    expect(() => repo.listBoards(foreign!.id)).toThrow('CROSS_TENANT_DENIED');
  });
});

describe('platform admin', () => {
  beforeEach(() => resetDemoStore());

  it('lists orgs for super_admin and can suspend', () => {
    const repo = new DemoRepository();
    const support = getDemoStore().users.find((u) => u.email === 'support@unison.demo')!;
    repo.switchUser(support.id);
    const orgs = repo.listOrgsForPlatform();
    expect(orgs.length).toBeGreaterThan(0);
    const target = orgs[0]!.org.id;
    const updated = repo.setOrgStatus(target, 'suspended');
    expect(updated.status).toBe('suspended');
  });

  it('blocks board create when org suspended', () => {
    const repo = new DemoRepository();
    const support = getDemoStore().users.find((u) => u.email === 'support@unison.demo')!;
    const owner = getDemoStore().users.find((u) => u.email === 'owner@unison.demo')!;
    const orgId = getDemoStore().organizations.find((o) => o.slug === 'acme')!.id;
    const wsId = getDemoStore().workspaces.find((w) => w.orgId === orgId)!.id;
    repo.switchUser(support.id);
    repo.setOrgStatus(orgId, 'suspended');
    repo.switchUser(owner.id);
    expect(() =>
      repo.createBoard({ orgId, workspaceId: wsId, name: 'Should fail' }),
    ).toThrow(/ENTITLEMENT|ORG_SUSPENDED|CROSS_TENANT/);
  });
});
