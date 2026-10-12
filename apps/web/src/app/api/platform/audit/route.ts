import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET(request: Request) {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    if (session.platformRole === 'none') {
      return jsonOk({ error: 'FORBIDDEN' }, { status: 403 });
    }
    const orgId = new URL(request.url).searchParams.get('orgId') ?? undefined;
    return jsonOk({ audit: await repo.listAuditLogs(orgId) });
  } catch (error) {
    return mapRepoError(error);
  }
}
