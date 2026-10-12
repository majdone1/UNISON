import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET(
  request: Request,
  context: { params: Promise<{ boardId: string }> },
) {
  try {
    const { boardId } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    const revision = await repo.getBoardRevision(boardId);
    const { searchParams } = new URL(request.url);
    const since = Number(searchParams.get('since') ?? 0);
    return jsonOk({
      boardId,
      revision,
      changed: revision > since,
      channel: `board:${boardId}`,
    });
  } catch (error) {
    return mapRepoError(error);
  }
}
