import { updateItemSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await context.params;
    const parsed = updateItemSchema.safeParse({ ...(await request.json()), id: itemId });
    if (!parsed.success) return jsonError(parsed.error.message);
    const patch = { ...parsed.data };
    delete (patch as { id?: string }).id;
    const item = await (await getServerRepo()).updateItem(itemId, patch);
    return jsonOk({ item });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await context.params;
    await (await getServerRepo()).archiveItem(itemId);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapRepoError(error);
  }
}
