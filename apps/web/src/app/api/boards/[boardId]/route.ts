import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function GET(_: Request, context: { params: Promise<{ boardId: string }> }) {
  try {
    const { boardId } = await context.params;
    const bundle = await (await getServerRepo()).getBoardBundle(boardId);
    return jsonOk(bundle);
  } catch (error) {
    return mapRepoError(error);
  }
}
