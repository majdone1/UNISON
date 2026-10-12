import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository, getDemoStore, resetDemoStore, BOARD_TEMPLATES } from './index';

describe('workspaces + teams RBAC', () => {
  beforeEach(() => resetDemoStore());

  it('owner can create workspace and team; guest cannot', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const ws = repo.createWorkspace(session.org.id, 'Growth');
    expect(ws.slug).toBe('growth');
    const team = repo.createTeam({ orgId: session.org.id, name: 'Design', workspaceId: ws.id });
    expect(repo.listTeams(session.org.id).some((t) => t.id === team.id)).toBe(true);

    const guest = getDemoStore().users.find((u) => u.email === 'guest@unison.demo')!;
    repo.switchUser(guest.id);
    expect(() => repo.createWorkspace(session.org.id, 'Nope')).toThrow('FORBIDDEN');
    expect(() =>
      repo.createTeam({ orgId: session.org.id, name: 'Nope' }),
    ).toThrow('FORBIDDEN');
  });

  it('denies cross-tenant team listing', () => {
    const repo = new DemoRepository();
    const foreign = getDemoStore().organizations.find((o) => o.slug === 'other-tenant')!;
    expect(() => repo.listTeams(foreign.id)).toThrow('CROSS_TENANT_DENIED');
  });
});

describe('board templates + visibility', () => {
  beforeEach(() => resetDemoStore());

  it('creates board from template with groups/columns/views', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const ws = repo.listWorkspaces(session.org.id)[0]!;
    const template = BOARD_TEMPLATES[0]!;
    const board = repo.createBoard({
      orgId: session.org.id,
      workspaceId: ws.id,
      name: 'From template',
      templateKey: template.key,
    });
    const bundle = repo.getBoardBundle(board.id);
    expect(board.templateKey).toBe(template.key);
    expect(bundle.groups.length).toBe(template.groups.length);
    expect(bundle.columns.length).toBe(template.columns.length);
    expect(bundle.views.length).toBe(template.views.length);
  });

  it('hides private boards from other org members', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const ws = repo.listWorkspaces(session.org.id)[0]!;
    const privateBoard = repo.createBoard({
      orgId: session.org.id,
      workspaceId: ws.id,
      name: 'Secret board',
      visibility: 'private',
    });
    expect(repo.listBoards(session.org.id).some((b) => b.id === privateBoard.id)).toBe(true);

    const member = getDemoStore().users.find((u) => u.email === 'member@unison.demo')!;
    repo.switchUser(member.id);
    expect(repo.listBoards(session.org.id).some((b) => b.id === privateBoard.id)).toBe(false);
    expect(() => repo.getBoardBundle(privateBoard.id)).toThrow('BOARD_PRIVATE_DENIED');
  });
});

describe('invitation accept flow', () => {
  beforeEach(() => resetDemoStore());

  it('token → membership end-to-end', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const invite = repo.createInvitation({
      orgId: session.org.id,
      email: 'joiner@unison.demo',
      role: 'member',
    });
    expect(invite.token).toBeTruthy();

    const accepted = repo.acceptInvitation(invite.token);
    expect(accepted.membership.orgId).toBe(session.org.id);
    expect(accepted.membership.role).toBe('member');
    expect(accepted.user.email).toBe('joiner@unison.demo');
    expect(repo.getSession().user.id).toBe(accepted.user.id);
    expect(() => repo.acceptInvitation(invite.token)).toThrow('INVITATION_ALREADY_ACCEPTED');
  });
});

describe('billing feature gates', () => {
  beforeEach(() => resetDemoStore());

  it('upgrade/downgrade/cancel/past_due gate writes server-side', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const ws = repo.listWorkspaces(session.org.id)[0]!;

    repo.setBillingDemoState({ orgId: session.org.id, planId: 'growth', status: 'active' });
    expect(repo.getEntitlements().planId).toBe('growth');
    expect(repo.getEntitlements().canWriteItems).toBe(true);

    repo.setBillingDemoState({ orgId: session.org.id, planId: 'starter', status: 'active' });
    expect(repo.getEntitlements().planId).toBe('starter');

    repo.setBillingDemoState({ orgId: session.org.id, status: 'past_due' });
    expect(repo.getEntitlements().isPastDue).toBe(true);
    expect(repo.getEntitlements().canWriteItems).toBe(false);
    expect(() =>
      repo.createItem({
        boardId: repo.listBoards(session.org.id)[0]!.id,
        groupId: getDemoStore().groups[0]!.id,
        name: 'blocked',
      }),
    ).toThrow('ENTITLEMENT_PAST_DUE');

    repo.setBillingDemoState({ orgId: session.org.id, status: 'cancelled' });
    expect(repo.getEntitlements().isSuspended).toBe(true);
    expect(() =>
      repo.createBoard({ orgId: session.org.id, workspaceId: ws.id, name: 'nope' }),
    ).toThrow(/ENTITLEMENT/);
  });

  it('webhook checkout.completed upgrades plan', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const sub = repo.applyBillingEvent({
      type: 'checkout.completed',
      orgId: session.org.id,
      planId: 'scale',
      seats: 200,
    });
    expect(sub.planId).toBe('scale');
    expect(sub.status).toBe('active');
    expect(repo.getEntitlements().planId).toBe('scale');
  });
});

describe('automations create + due_within', () => {
  beforeEach(() => resetDemoStore());

  it('item.created assign.actor runs', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const board = repo.listBoards(session.org.id)[0]!;
    const group = getDemoStore().groups.find((g) => g.boardId === board.id)!;
    const before = getDemoStore().automations.find((a) => a.trigger.type === 'item.created')!
      .runCount;
    const item = repo.createItem({ boardId: board.id, groupId: group.id, name: 'Auto assign me' });
    const rule = getDemoStore().automations.find((a) => a.trigger.type === 'item.created')!;
    expect(rule.runCount).toBe(before + 1);
    expect(item.assigneeIds).toContain(session.user.id);
  });

  it('runDueAutomations fires due_within rules', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const item = getDemoStore().items.find((i) => i.name === 'Finalize board templates')!;
    // ensure due within 2 days
    repo.updateItem(item.id, {
      dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    });
    const before = getDemoStore().automations.find((a) => a.trigger.type === 'item.due_within')!
      .runCount;
    const results = repo.runDueAutomations(session.org.id);
    expect(results.some((r) => r.itemId === item.id)).toBe(true);
    const rule = getDemoStore().automations.find((a) => a.trigger.type === 'item.due_within')!;
    expect(rule.runCount).toBeGreaterThan(before);
  });
});

describe('search result types + zero leakage', () => {
  beforeEach(() => resetDemoStore());

  it('returns boards, items, and comments for home org only', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const result = repo.search(session.org.id, 'tenant');
    // seeded comment mentions "tenant isolation"
    expect(result.comments.length).toBeGreaterThan(0);
    expect(result.comments.every((c) => c.orgId === session.org.id)).toBe(true);
    expect(result.boards.every((b) => b.orgId === session.org.id)).toBe(true);
    expect(result.items.every((i) => i.orgId === session.org.id)).toBe(true);

    const foreign = getDemoStore().organizations.find((o) => o.slug === 'other-tenant')!;
    expect(() => repo.search(foreign.id, 'tenant')).toThrow('CROSS_TENANT_DENIED');
  });

  it('search never surfaces private boards of other users', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const ws = repo.listWorkspaces(session.org.id)[0]!;
    repo.createBoard({
      orgId: session.org.id,
      workspaceId: ws.id,
      name: 'Hidden Private Alpha',
      visibility: 'private',
    });
    const member = getDemoStore().users.find((u) => u.email === 'member@unison.demo')!;
    repo.switchUser(member.id);
    const result = repo.search(session.org.id, 'Hidden Private');
    expect(result.boards).toHaveLength(0);
  });
});

describe('realtime revision helper', () => {
  beforeEach(() => resetDemoStore());

  it('bumps board revision on item update', () => {
    const repo = new DemoRepository();
    const item = getDemoStore().items[0]!;
    const before = repo.getBoardRevision(item.boardId);
    repo.updateItem(item.id, { name: `${item.name} revised` });
    expect(repo.getBoardRevision(item.boardId)).toBe(before + 1);
  });
});
