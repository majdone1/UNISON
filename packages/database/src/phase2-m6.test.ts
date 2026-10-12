import { beforeEach, describe, expect, it } from 'vitest';
import { boardItemsToCsv, parseBoardCsv, MockHttpWebhookAdapter } from '@unison/shared';
import { DemoRepository, getDemoStore, resetDemoStore } from './index';

describe('Phase 2 M6 — workload/chart, cross-board, workspace_admin, webhooks, CSV', () => {
  beforeEach(() => resetDemoStore());

  it('H: seeded workload and chart views exist on launch board', () => {
    const repo = new DemoRepository();
    const board = repo
      .listBoards(repo.getSession().org.id)
      .find((b) => b.name === 'Launch Orchestration')!;
    const views = repo.getBoardBundle(board.id).views;
    expect(views.some((v) => v.type === 'workload')).toBe(true);
    expect(views.some((v) => v.type === 'chart')).toBe(true);
  });

  it('C: cross-board relation links Marketing Ops items; rejects same-board ids', () => {
    const repo = new DemoRepository();
    const launch = repo
      .listBoards(repo.getSession().org.id)
      .find((b) => b.name === 'Launch Orchestration')!;
    const marketing = repo
      .listBoards(repo.getSession().org.id)
      .find((b) => b.name === 'Marketing Ops')!;
    expect(marketing).toBeTruthy();
    const campaignCol = repo
      .getBoardBundle(launch.id)
      .columns.find((c) => c.name === 'Campaign')!;
    expect(campaignCol.settings.relatedBoardId).toBe(marketing.id);

    const candidates = repo.listRelationCandidates(campaignCol.id);
    expect(candidates.every((c) => c.boardId === marketing.id)).toBe(true);
    expect(candidates.length).toBeGreaterThanOrEqual(2);

    const item = repo.getBoardBundle(launch.id).items.find((i) => !i.parentItemId)!;
    const linked = repo.setCellValue(item.id, campaignCol.id, [candidates[0]!.id]);
    expect(linked.values[campaignCol.id]).toEqual([candidates[0]!.id]);

    expect(() => repo.setCellValue(item.id, campaignCol.id, [item.id])).toThrow(/RELATION/);
  });

  it('A: workspace_admin can manage workspaces/structure; cannot invite admin', () => {
    const repo = new DemoRepository();
    const wsAdmin = getDemoStore().users.find((u) => u.email === 'wsadmin@unison.demo')!;
    repo.switchUser(wsAdmin.id);
    expect(repo.getSession().membership.role).toBe('workspace_admin');

    const ws = repo.createWorkspace(repo.getSession().org.id, 'Ops Hub');
    expect(ws.name).toBe('Ops Hub');

    const board = repo.listBoards(repo.getSession().org.id)[0]!;
    const col = repo.createColumn({
      boardId: board.id,
      name: 'Notes',
      type: 'text',
    });
    expect(col.name).toBe('Notes');

    expect(() =>
      repo.createInvitation({
        orgId: repo.getSession().org.id,
        email: 'admin-try@unison.demo',
        role: 'admin',
      }),
    ).toThrow('INVITE_ROLE_FORBIDDEN');

    const invite = repo.createInvitation({
      orgId: repo.getSession().org.id,
      email: 'viewer-try@unison.demo',
      role: 'viewer',
    });
    expect(invite.role).toBe('viewer');
  });

  it('J: webhook.http mock adapter records delivery on status→done', () => {
    const repo = new DemoRepository();
    const store = getDemoStore();
    const webhookRule = store.automations.find((a) =>
      a.actions.some((x) => x.type === 'webhook.http'),
    )!;
    expect(webhookRule).toBeTruthy();

    const item = store.items.find((i) => i.boardId === webhookRule.boardId && !i.parentItemId)!;
    repo.updateItem(item.id, { status: 'done' });

    const deliveries = repo.listWebhookDeliveries(repo.getSession().org.id);
    expect(deliveries.length).toBeGreaterThanOrEqual(1);
    expect(deliveries[0]!.status).toBe('mock_ok');
    expect(deliveries[0]!.url).toContain('hooks.example.com');
    expect(deliveries[0]!.statusCode).toBe(202);

    const adapter = new MockHttpWebhookAdapter();
    const rejected = adapter.deliver({
      orgId: item.orgId,
      automationId: webhookRule.id,
      itemId: item.id,
      url: 'http://127.0.0.1/evil',
    });
    expect(rejected.status).toBe('mock_rejected');
  });

  it('CSV: export/import round-trips item names on a board', () => {
    const repo = new DemoRepository();
    const board = repo
      .listBoards(repo.getSession().org.id)
      .find((b) => b.name === 'Launch Orchestration')!;
    const csv = repo.exportBoardCsv(board.id);
    expect(csv).toContain('name');
    expect(csv.split('\n').length).toBeGreaterThan(2);

    const parsed = parseBoardCsv(csv);
    expect(parsed.length).toBeGreaterThan(0);

    const before = repo.getBoardBundle(board.id).items.filter((i) => !i.parentItemId).length;
    const groupId = repo.getBoardBundle(board.id).groups[0]!.id;
    const session = repo.getSession();
    const importCsv = boardItemsToCsv(
      [
        {
          id: 'tmp',
          boardId: board.id,
          groupId,
          orgId: board.orgId,
          name: 'CSV Imported Row',
          status: 'working',
          priority: 'medium',
          position: 99,
          progress: 0,
          assigneeIds: [],
          watcherIds: [],
          values: {},
          createdBy: session.user.id,
          updatedBy: session.user.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      repo.getBoardBundle(board.id).columns,
    );
    const result = repo.importBoardCsv(board.id, importCsv);
    expect(result.created).toBe(1);
    const after = repo.getBoardBundle(board.id).items.filter((i) => !i.parentItemId).length;
    expect(after).toBe(before + 1);
    expect(
      repo.getBoardBundle(board.id).items.some((i) => i.name === 'CSV Imported Row'),
    ).toBe(true);
  });
});
