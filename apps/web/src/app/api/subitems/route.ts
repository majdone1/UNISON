import { createItemSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET(request: Request) {
  try {
    const parentItemId = new URL(request.url).searchParams.get('parentItemId');
    if (!parentItemId) return jsonError('parentItemId required');
    const items = await (await getServerRepo() as DemoRepository).listSubitems(parentItemId);
    return jsonOk({ items });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.message);
    if (!parsed.data.parentItemId) return jsonError('parentItemId required for subitems');
    const item = await (await getServerRepo()).createItem(parsed.data);
    return jsonOk({ item }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
