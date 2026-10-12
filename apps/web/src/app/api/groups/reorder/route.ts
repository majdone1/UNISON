import { z } from 'zod';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

const schema = z.object({
  boardId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(parsed.error.message);
    await (await getServerRepo() as DemoRepository).reorderGroups(parsed.data.boardId, parsed.data.ids);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapRepoError(error);
  }
}
