import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function POST() {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    const results = await repo.runDueAutomations(session.org.id);
    return jsonOk({
      ran: results.length,
      results,
      note: 'item.due_within rules evaluated for demo items with due dates',
    });
  } catch (error) {
    return mapRepoError(error);
  }
}
