import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function POST(_: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await context.params;
    await (await getServerRepo()).restoreItem(itemId);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapRepoError(error);
  }
}
