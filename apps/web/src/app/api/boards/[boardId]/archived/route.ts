import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET(_: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await context.params;
    const items = await (await getServerRepo() as DemoRepository).listArchivedItems(boardId);
    return jsonOk({ items });
  } catch (error) {
    return mapRepoError(error);
  }
}
