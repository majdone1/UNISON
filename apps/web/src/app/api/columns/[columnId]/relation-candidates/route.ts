import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET(
  request: Request,
  context: { params: Promise<{ columnId: string }> },
) {
  try {
    const { columnId } = await context.params;
    const excludeItemId = new URL(request.url).searchParams.get('excludeItemId') ?? undefined;
    const repo = await getServerRepo() as DemoRepository;
    const candidates = await repo.listRelationCandidates(columnId, excludeItemId ?? undefined);
    return jsonOk({ candidates });
  } catch (error) {
    return mapRepoError(error);
  }
}
