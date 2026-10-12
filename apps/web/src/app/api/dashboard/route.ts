import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET() {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    const stats = await repo.dashboardStats(session.org.id);
    const usage = await repo.usageSummary(session.org.id);
    const myWork = await repo.myWorkGrouped();
    return jsonOk({
      stats,
      usage,
      widgets: {
        statusDistribution: {
          done: stats.done,
          working: stats.working,
          stuck: stats.stuck,
          notStarted: stats.notStarted,
        },
        overdue: stats.overdue,
        hoursTotal: stats.hoursTotal,
        myWorkToday: myWork.today.length,
        myWorkOverdue: myWork.overdue.length,
        automations: {
          enabled: stats.automationsEnabled,
          runs: stats.automationRuns,
        },
        messages: {
          channels: (repo as DemoRepository).listChannels?.()?.length ?? 0,
        },
        timeLoggedMinutes: (() => {
          try {
            return (repo as DemoRepository)
              .listTimeEntries()
              .reduce((sum, e) => sum + e.minutes, 0);
          } catch {
            return 0;
          }
        })(),
        docs: (() => {
          try {
            return (repo as DemoRepository).listWorkdocs().length;
          } catch {
            return 0;
          }
        })(),
      },
    });
  } catch (error) {
    return mapRepoError(error);
  }
}
