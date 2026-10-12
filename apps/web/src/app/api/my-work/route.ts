import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET() {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const grouped = await repo.myWorkGrouped();
    return jsonOk({
      items: grouped.all,
      buckets: {
        today: grouped.today,
        upcoming: grouped.upcoming,
        overdue: grouped.overdue,
        completed: grouped.completed,
      },
      byBoard: grouped.byBoard,
    });
  } catch (error) {
    return mapRepoError(error);
  }
}
