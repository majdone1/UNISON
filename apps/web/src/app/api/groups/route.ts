import { createGroupSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function POST(request: Request) {
  try {
    const parsed = createGroupSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.message);
    const group = await (await getServerRepo()).createGroup(parsed.data.boardId, parsed.data.name, parsed.data.color);
    return jsonOk({ group }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
