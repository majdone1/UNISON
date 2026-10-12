import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import { getDemoStore } from '@unison/database';

export async function GET(request: Request) {
  try {
    const repo = await getServerRepo();
    const session = await repo.getSession();
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId') ?? undefined;
    const itemId = searchParams.get('itemId') ?? undefined;
    // DemoRepository exposes listActivity; cast via store-backed demo for now
    const demo = repo as unknown as {
      listActivity: typeof import('@unison/database').DemoRepository.prototype.listActivity;
    };
    if (typeof demo.listActivity === 'function') {
      return jsonOk({
        activity: demo.listActivity(session.org.id, { boardId, itemId, limit: 50 }),
      });
    }
    // Fallback read from store when interface not yet on Supabase adapter
    const store = getDemoStore();
    await repo.assertOrgAccess(session.org.id);
    return jsonOk({
      activity: store.activity
        .filter(
          (a) =>
            a.orgId === session.org.id &&
            (!boardId || a.boardId === boardId) &&
            (!itemId || a.itemId === itemId),
        )
        .slice(0, 50),
    });
  } catch (error) {
    return mapRepoError(error);
  }
}
