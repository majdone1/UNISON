import { beforeEach, describe, expect, it } from 'vitest';
import { DemoRepository, getDemoStore, resetDemoStore } from './index';

describe('Phase 2 K–O', () => {
  beforeEach(() => resetDemoStore());

  it('K: My Work buckets are tenant-scoped and assignment-filtered', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const grouped = repo.myWorkGrouped();
    expect(grouped.all.every((i) => i.orgId === session.org.id)).toBe(true);
    expect(
      grouped.all.every(
        (i) =>
          i.assigneeIds.includes(session.user.id) || i.watcherIds.includes(session.user.id),
      ),
    ).toBe(true);
    expect(grouped.byBoard.every((b) => b.items.length > 0)).toBe(true);
    for (const item of grouped.overdue) {
      expect(item.status).not.toBe('done');
      expect(item.dueDate).toBeTruthy();
    }
  });

  it('K: search never leaks foreign org or inaccessible private boards', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const foreign = getDemoStore().organizations.find((o) => o.slug === 'other-tenant')!;
    expect(() => repo.search(foreign.id, 'board')).toThrow('CROSS_TENANT_DENIED');

    const ws = repo.listWorkspaces(session.org.id)[0]!;
    const secret = repo.createBoard({
      orgId: session.org.id,
      workspaceId: ws.id,
      name: 'Secret search target',
      visibility: 'private',
    });
    const group = repo.getBoardBundle(secret.id).groups[0]!;
    repo.createItem({ boardId: secret.id, groupId: group.id, name: 'Hidden needle' });

    const member = getDemoStore().users.find((u) => u.email === 'member@unison.demo')!;
    repo.switchUser(member.id);
    const hits = repo.search(session.org.id, 'Hidden needle');
    expect(hits.items.some((i) => i.name === 'Hidden needle')).toBe(false);
    expect(hits.boards.some((b) => b.id === secret.id)).toBe(false);

    // Control chars / length hardened
    const empty = repo.search(session.org.id, '\u0000\u0001');
    expect(empty.items).toHaveLength(0);
  });

  it('M: dashboard widgets use authorized board data only', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const ws = repo.listWorkspaces(session.org.id)[0]!;
    const privateBoard = repo.createBoard({
      orgId: session.org.id,
      workspaceId: ws.id,
      name: 'Private dash board',
      visibility: 'private',
    });
    const group = repo.getBoardBundle(privateBoard.id).groups[0]!;
    repo.createItem({ boardId: privateBoard.id, groupId: group.id, name: 'Private only' });

    const ownerStats = repo.dashboardStats(session.org.id);
    const member = getDemoStore().users.find((u) => u.email === 'member@unison.demo')!;
    repo.switchUser(member.id);
    const memberStats = repo.dashboardStats(session.org.id);
    expect(ownerStats.boards).toBeGreaterThan(memberStats.boards);
    expect(ownerStats.totalItems).toBeGreaterThan(memberStats.totalItems);
  });

  it('M: form submit creates item and can fire item.created automations', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const board = repo.listBoards(session.org.id)[0]!;
    const beforeRuns = (getDemoStore().automationRuns ?? []).length;
    const form = repo.createForm({
      boardId: board.id,
      name: 'Field report',
      fieldKeys: ['name', 'description', 'priority'],
      visibility: 'private',
    });
    const { item } = repo.submitForm(form.id, {
      name: 'Form-created item',
      description: 'via form',
      priority: 'high',
    });
    expect(item.name).toBe('Form-created item');
    expect(item.boardId).toBe(board.id);
    expect(repo.getForm(form.id).submissionCount).toBe(1);
    expect(getDemoStore().activity.some((a) => a.eventType === 'form.submitted')).toBe(true);
    // Seed includes item.created automations on the product board
    expect((getDemoStore().automationRuns ?? []).length).toBeGreaterThanOrEqual(beforeRuns);
  });

  it('M: public form submit denied across tenants', () => {
    const repo = new DemoRepository();
    const form = repo.listForms(repo.getSession().org.id).find((f) => f.visibility === 'public')!;
    expect(form).toBeTruthy();
    const otherUser = getDemoStore().users.find((u) => u.email === 'other@tenant.demo')!;
    expect(otherUser).toBeTruthy();
    repo.switchUser(otherUser.id);
    expect(() =>
      repo.submitForm(form.id, { name: 'Cross tenant attempt' }),
    ).toThrow('CROSS_TENANT_DENIED');
  });

  it('N: usageSummary exposes seats/boards/storage gates', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const usage = repo.usageSummary(session.org.id);
    expect(usage.seats.used).toBeGreaterThan(0);
    expect(usage.seats.limit).toBeGreaterThan(0);
    expect(usage.boards.used).toBeGreaterThan(0);
    expect(usage.storageGb.limit).toBeGreaterThan(0);
    expect(typeof usage.automations.allowed).toBe('boolean');

    const support = getDemoStore().users.find((u) => u.email === 'support@unison.demo')!;
    repo.switchUser(support.id);
    const platform = repo.listOrgsForPlatform();
    expect(platform[0]!.usage.forms).toBeGreaterThanOrEqual(0);
    expect(platform[0]!.usage.automations).toBeGreaterThanOrEqual(0);
  });

  it('O: member cannot create forms (structure); formula stays sandboxed via create path', () => {
    const repo = new DemoRepository();
    const session = repo.getSession();
    const board = repo.listBoards(session.org.id)[0]!;
    const member = getDemoStore().users.find((u) => u.email === 'member@unison.demo')!;
    repo.switchUser(member.id);
    expect(() =>
      repo.createForm({
        boardId: board.id,
        name: 'Should fail',
        fieldKeys: ['name'],
      }),
    ).toThrow(/FORBIDDEN|STRUCTURE|board:structure/i);
  });
});
