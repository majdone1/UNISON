import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function POST(request: Request) {
  try {
    const repo = await getServerRepo();
    const session = await repo.getSession();
    const body = (await request.json()) as { userId?: string; stop?: boolean };
    if (body.stop) {
      repo.stopImpersonation();
    } else if (body.userId) {
      repo.startImpersonation(body.userId, session.platformRole);
    }
    return jsonOk({ session: await repo.getSession() });
  } catch (error) {
    return mapRepoError(error);
  }
}
