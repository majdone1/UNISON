import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function POST(_: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await context.params;
    const board = await (await getServerRepo() as DemoRepository).restoreBoard(boardId);
    return jsonOk({ board });
  } catch (error) {
    return mapRepoError(error);
  }
}
