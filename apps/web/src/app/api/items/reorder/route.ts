import { reorderSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function POST(request: Request) {
  try {
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.message);
    await (await getServerRepo()).reorderItems(parsed.data.ids);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapRepoError(error);
  }
}
