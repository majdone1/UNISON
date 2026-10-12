import { searchSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function GET(request: Request) {
  try {
    const repo = await getServerRepo();
    const session = await repo.getSession();
    const { searchParams } = new URL(request.url);
    const parsed = searchSchema.safeParse({
      orgId: session.org.id,
      query: searchParams.get('q') ?? '',
      limit: Number(searchParams.get('limit') ?? 20),
    });
    if (!parsed.success) return jsonError(parsed.error.message);
    return jsonOk(await repo.search(parsed.data.orgId, parsed.data.query));
  } catch (error) {
    return mapRepoError(error);
  }
}
