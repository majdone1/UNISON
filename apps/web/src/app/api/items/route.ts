import { createItemSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function POST(request: Request) {
  try {
    const parsed = createItemSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.message);
    const item = await (await getServerRepo()).createItem(parsed.data);
    return jsonOk({ item }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
