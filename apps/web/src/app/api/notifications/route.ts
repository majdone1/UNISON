import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET() {
  try {
    return jsonOk({ notifications: await (await getServerRepo()).listNotifications() });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; all?: boolean };
    const repo = await getServerRepo() as DemoRepository;
    if (body.all) {
      return jsonOk({ ok: true, marked: await repo.markAllNotificationsRead() });
    }
    if (!body.id) return jsonOk({ error: 'id required' }, { status: 400 });
    await repo.markNotificationRead(body.id);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapRepoError(error);
  }
}
