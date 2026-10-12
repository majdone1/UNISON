import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function POST(_: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await context.params;
    const item = await (await getServerRepo()).duplicateItem(itemId);
    return jsonOk({ item }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
